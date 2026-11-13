# Security Policy

## What this stack stores

By default, `scripts/install-global.sh` and `install-global.ps1` turn on content capture for Claude Code: `OTEL_LOG_USER_PROMPTS`, `OTEL_LOG_ASSISTANT_RESPONSES` and `OTEL_LOG_TOOL_DETAILS` are all set to `1`. With capture on, this stack persists **user prompts, assistant responses, tool arguments, emails (from OAuth), and session identifiers** on your machine:

- PostgreSQL (`otel_events` and views)
- Loki (log streams)
- Tempo (trace spans, if beta tracing is enabled)
- Prometheus (metrics labels; prefer low-cardinality labels)
- **Analytics UI** (`http://localhost:3010`) — can display prompt previews from Postgres; treat it as sensitive localhost-only

OpenTelemetry data from Claude Code is sent **only to the OTLP endpoint you configure**. It is not sent to Anthropic through this channel. See [Claude Code monitoring docs](https://code.claude.com/docs/en/monitoring-usage).

### Turning capture off

Set these to `0` in the `env` block of `~/.claude/settings.json`, and in `scripts/claude-otel.env` on macOS/Linux (sourced by your shell profile) or the PowerShell profile block on Windows. Re-running the installer resets them to `1`, so change them after any re-run. Data already stored is not deleted.

- `OTEL_LOG_USER_PROMPTS`
- `OTEL_LOG_ASSISTANT_RESPONSES`
- `OTEL_LOG_TOOL_DETAILS`

To stop export entirely, set `CLAUDE_CODE_ENABLE_TELEMETRY` to `0` in the same places.

The Analytics app and the Postgres sink are unauthenticated. They are meant for a single local machine and must not be exposed to a network.

## Hardening checklist

1. Copy `.env.example` → `.env` and set **strong unique passwords** before exposing anything beyond localhost.
2. Ports are published on `127.0.0.1` only. Do **not** re-publish `4317`, `4318`, `5432`, `3000`, `3010`, etc. on other interfaces or the public internet.
3. Treat Docker volumes as sensitive: they may contain prompt text and emails.
4. Turn off capture (above) if you do not need prompt or tool content stored.
5. Never commit `.env`, session exports, or database dumps to git.

## Reporting a vulnerability

If you discover a security issue in this repository (for example, accidental secret leakage in templates or an unsafe default), open a **private** security advisory on the GitHub repository, or contact the maintainers via GitHub Issues with `[security]` in the title and without attaching sensitive payloads.
