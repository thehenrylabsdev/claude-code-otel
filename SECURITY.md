# Security Policy

## What this stack stores

When content capture is enabled (`OTEL_LOG_USER_PROMPTS=1` and related flags), this stack persists **user prompts, assistant responses, tool arguments, emails (from OAuth), and session identifiers** on your machine:

- PostgreSQL (`otel_events` and views)
- Loki (log streams)
- Tempo (trace spans, if beta tracing is enabled)
- Prometheus (metrics labels; prefer low-cardinality labels)

OpenTelemetry data from Claude Code is sent **only to the OTLP endpoint you configure**. It is not sent to Anthropic through this channel. See [Claude Code monitoring docs](https://code.claude.com/docs/en/monitoring-usage).

## Hardening checklist

1. Copy `.env.example` → `.env` and set **strong unique passwords** before exposing anything beyond localhost.
2. Do **not** publish ports `4317`, `4318`, `5432`, `3000`, etc. to the public internet.
3. Treat Docker volumes as sensitive: they may contain prompt text and emails.
4. Prefer keeping `OTEL_LOG_RAW_API_BODIES` off unless you fully understand the retention implications.
5. Never commit `.env`, session exports, or database dumps to git.

## Reporting a vulnerability

If you discover a security issue in this repository (for example, accidental secret leakage in templates or an unsafe default), open a **private** security advisory on the GitHub repository, or contact the maintainers via GitHub Issues with `[security]` in the title and without attaching sensitive payloads.
