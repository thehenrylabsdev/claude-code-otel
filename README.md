# Claude Code OpenTelemetry Stack

Local, durable observability for [Claude Code](https://code.claude.com/) and Claude Desktop.

Collect metrics, events (including **user prompts**), and traces via OpenTelemetry, then store and analyze them with Prometheus, Loki, Tempo, PostgreSQL, and Grafana — all on your machine via Docker Compose.

> Inspired by Anthropic’s [Claude Code monitoring docs](https://code.claude.com/docs/en/monitoring-usage) and the [ROI monitoring guide](https://github.com/anthropics/claude-code-monitoring-guide). This project adds durable log/event storage (Loki + PostgreSQL), traces (Tempo), prompt capture, and global Claude Code / Desktop setup scripts.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Architecture

```
Claude Code / Desktop
        │  OTLP (gRPC :4317 / HTTP :4318)
        ▼
 OpenTelemetry Collector
   ├─ metrics  → Prometheus  (:9090)
   ├─ logs     → Loki        (:3100)
   ├─ logs     → PostgreSQL  (:5432) via postgres-sink
   └─ traces   → Tempo       (:3200)
                    │
                    ▼
                 Grafana (:3000)
```

| Service | Role |
| --- | --- |
| **otel-collector** | Receives OTLP from Claude; fans out to backends |
| **Prometheus** | Time-series metrics (cost, tokens, sessions) |
| **Loki** | Searchable event / prompt logs |
| **Tempo** | Distributed traces (beta flag required) |
| **PostgreSQL** | Structured durable store for SQL analytics |
| **postgres-sink** | OTLP HTTP/JSON → Postgres |
| **Grafana** | Dashboards over all backends |

## Quick start

### Requirements

- Docker Desktop (or Docker Engine + Compose v2)
- Claude Code CLI (`claude`) for end-to-end verification

### 1. Configure local credentials

```bash
cp .env.example .env
# Edit .env — change POSTGRES_PASSWORD and GRAFANA_ADMIN_PASSWORD
```

### 2. Start the stack

```bash
./scripts/start.sh
```

Services use `restart: unless-stopped`. Enable **Start Docker Desktop when you sign in** so the stack returns after reboot.

### 3. Configure Claude Code globally

```bash
./scripts/install-global.sh
```

This updates:

| Target | Purpose |
| --- | --- |
| `~/.claude/settings.json` → `env` | Applies for CLI / IDE / Desktop Code sessions |
| `~/.zshrc` | Sources `scripts/claude-otel.env` for terminal launches |

Then **restart Claude Code / Claude Desktop** so OTel exporters re-initialize.

### 4. Verify

```bash
./scripts/smoke-test.sh
claude -p "hello otel"
```

Open Grafana: [http://localhost:3000](http://localhost:3000) (credentials from `.env`).

## Claude Code environment

Key variables (see [monitoring docs](https://code.claude.com/docs/en/monitoring-usage)):

| Variable | Example | Meaning |
| --- | --- | --- |
| `CLAUDE_CODE_ENABLE_TELEMETRY` | `1` | Enable OTel export |
| `OTEL_EXPORTER_OTLP_PROTOCOL` | `grpc` | Protocol for the local collector |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | `http://localhost:4317` | Collector endpoint |
| `OTEL_LOG_USER_PROMPTS` | `1` | Persist prompt **content** |
| `OTEL_LOG_ASSISTANT_RESPONSES` | `1` | Persist assistant text |
| `OTEL_LOG_TOOL_DETAILS` | `1` | Persist tool parameters |
| `CLAUDE_CODE_ENHANCED_TELEMETRY_BETA` | `1` | Enable traces |
| `OTEL_TRACES_EXPORTER` | `otlp` | Export spans |

## Claude Desktop

- **Code tab sessions**: use `~/.claude/settings.json` (installed above). Resource `service.name` is `claude-code-desktop`.
- **App-level OTLP** (MDM / enterprise): template at [`claude-desktop/claude-desktop-otel.mobileconfig`](claude-desktop/claude-desktop-otel.mobileconfig) (`otlpEndpoint=http://127.0.0.1:4318`, content capture enabled).

## SQL analytics

```bash
docker exec -it claude-postgres \
  psql -U "${POSTGRES_USER:-claude}" -d "${POSTGRES_DB:-claude_otel}"
```

```sql
SELECT * FROM v_user_prompts ORDER BY event_time DESC LIMIT 20;
SELECT * FROM v_daily_usage;
SELECT * FROM v_tool_activity ORDER BY event_time DESC LIMIT 50;
```

## Repository layout

```
.
├── docker-compose.yml
├── .env.example
├── otel/                      # Collector config
├── prometheus/                # Scrape config
├── loki/                      # Loki config
├── tempo/                     # Tempo config
├── postgres/init/             # SQL schema + views
├── postgres-sink/             # OTLP → Postgres service
├── grafana/                   # Provisioning + dashboard
├── scripts/                   # start, install-global, smoke-test
└── claude-desktop/            # Optional MDM profile template
```

## Privacy & security

- OTel export is **opt-in** and goes only to **your** collector.
- With prompt logging enabled, treat Postgres/Loki volumes as **sensitive**.
- Defaults in `.env.example` are for localhost only — change them before any shared or networked use.
- See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

## References

- [Claude Code — Monitoring usage (OpenTelemetry)](https://code.claude.com/docs/en/monitoring-usage)
- [Claude Code ROI measurement guide](https://github.com/anthropics/claude-code-monitoring-guide)
- [Claude Desktop configuration reference](https://claude.com/docs/third-party/claude-desktop/configuration)
- [OpenTelemetry specification](https://opentelemetry.io/docs/specs/otel/)
