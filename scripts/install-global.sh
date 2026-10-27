#!/usr/bin/env bash
# Configure Claude Code (global settings + shell) for this local OTel stack.
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

SHELL_RC="${ZDOTDIR:-$HOME}/.zshrc"
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

if [ -f "$SHELL_RC" ] && grep -q "$MARKER_BEGIN" "$SHELL_RC"; then
  # Replace existing block
  tmp="$(mktemp)"
  awk -v begin="$MARKER_BEGIN" -v end="$MARKER_END" '
    $0 == begin {skip=1; next}
    $0 == end {skip=0; next}
    !skip {print}
  ' "$SHELL_RC" > "$tmp"
  printf "\n%s\n" "$BLOCK" >> "$tmp"
  mv "$tmp" "$SHELL_RC"
  echo "Refreshed OTel block in $SHELL_RC"
else
  printf "\n%s\n" "$BLOCK" >> "$SHELL_RC"
  echo "Appended OTel block to $SHELL_RC"
fi

DESKTOP_DIR="$ROOT/claude-desktop"
echo
echo "Claude Desktop (Code tab / app telemetry):"
echo "  1. Prefer ~/.claude/settings.json env (already updated) for Code sessions."
echo "  2. Optional MDM profile template: $DESKTOP_DIR/claude-desktop-otel.mobileconfig"
echo "     Install with: open \"$DESKTOP_DIR/claude-desktop-otel.mobileconfig\""
echo
echo "Done. Restart Claude Code / Claude Desktop so OTel exporters re-initialize."
echo "Verify: claude -p 'otel smoke test'   then check Grafana http://localhost:3000"
