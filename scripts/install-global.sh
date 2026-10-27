#!/usr/bin/env bash
# Configure Claude Code (global settings + shell) for this local OTel stack.
# Supports bash and zsh on macOS / Linux. For Windows, use install-global.ps1.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/scripts/claude-otel.env"
SETTINGS="$HOME/.claude/settings.json"
MARKER_BEGIN="# >>> claude-code-otel >>>"
MARKER_END="# <<< claude-code-otel <<<"

mkdir -p "$HOME/.claude"

python3 - <<'PY' "$SETTINGS"
import json, sys
from pathlib import Path

path = Path(sys.argv[1])
data = {}
if path.exists():
    data = json.loads(path.read_text() or "{}")

env = data.setdefault("env", {})
env.update({
    "CLAUDE_CODE_ENABLE_TELEMETRY": "1",
    "OTEL_METRICS_EXPORTER": "otlp",
    "OTEL_LOGS_EXPORTER": "otlp",
    "OTEL_TRACES_EXPORTER": "otlp",
    "CLAUDE_CODE_ENHANCED_TELEMETRY_BETA": "1",
    "OTEL_EXPORTER_OTLP_PROTOCOL": "grpc",
    "OTEL_EXPORTER_OTLP_ENDPOINT": "http://localhost:4317",
    "OTEL_LOG_USER_PROMPTS": "1",
    "OTEL_LOG_ASSISTANT_RESPONSES": "1",
    "OTEL_LOG_TOOL_DETAILS": "1",
    "OTEL_METRIC_EXPORT_INTERVAL": "10000",
    "OTEL_LOGS_EXPORT_INTERVAL": "5000",
    "OTEL_RESOURCE_ATTRIBUTES": "deployment.environment=local",
})

path.write_text(json.dumps(data, indent=2) + "\n")
print(f"Updated {path}")
PY

BLOCK=$(cat <<EOF
$MARKER_BEGIN
# Claude Code OpenTelemetry → local Docker stack (claude-code-otel)
if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC1090
  source "$ENV_FILE"
fi
$MARKER_END
EOF
)

upsert_shell_rc() {
  local shell_rc="$1"
  mkdir -p "$(dirname "$shell_rc")"
  touch "$shell_rc"
  if grep -q "$MARKER_BEGIN" "$shell_rc" 2>/dev/null; then
    local tmp
    tmp="$(mktemp)"
    awk -v begin="$MARKER_BEGIN" -v end="$MARKER_END" '
      $0 == begin {skip=1; next}
      $0 == end {skip=0; next}
      !skip {print}
    ' "$shell_rc" > "$tmp"
    printf "\n%s\n" "$BLOCK" >> "$tmp"
    mv "$tmp" "$shell_rc"
    echo "Refreshed OTel block in $shell_rc"
  else
    printf "\n%s\n" "$BLOCK" >> "$shell_rc"
    echo "Appended OTel block to $shell_rc"
  fi
}

# Prefer the user's login shell; always cover common profiles on macOS/Linux.
case "${SHELL:-}" in
  */zsh)
    upsert_shell_rc "${ZDOTDIR:-$HOME}/.zshrc"
    ;;
  */bash)
    if [ -f "$HOME/.bashrc" ] || [ ! -f "$HOME/.bash_profile" ]; then
      upsert_shell_rc "$HOME/.bashrc"
    fi
    if [ -f "$HOME/.bash_profile" ] || [ "$(uname -s)" = "Darwin" ]; then
      upsert_shell_rc "$HOME/.bash_profile"
    fi
    ;;
  *)
    # Unknown shell — update both common files when present / create zshrc+bashrc
    upsert_shell_rc "${ZDOTDIR:-$HOME}/.zshrc"
    upsert_shell_rc "$HOME/.bashrc"
    ;;
esac

DESKTOP_DIR="$ROOT/claude-desktop"
echo
echo "Claude Desktop:"
echo "  • Code tab / CLI: ~/.claude/settings.json (already updated) — works on macOS, Linux, Windows."
echo "  • App-level MDM profile (macOS only): $DESKTOP_DIR/claude-desktop-otel.mobileconfig"
echo "    Install: open \"$DESKTOP_DIR/claude-desktop-otel.mobileconfig\""
echo
echo "Windows users: run scripts/install-global.ps1 instead of this script."
echo
echo "Done. Restart Claude Code / Claude Desktop so OTel exporters re-initialize."
echo "Verify: claude -p 'otel smoke test'"
echo "Then open Analytics http://localhost:3010 and Grafana http://localhost:3000"
