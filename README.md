# Claude Code OpenTelemetry Stack

Local, durable observability for [Claude Code](https://code.claude.com/) and Claude Desktop.

Collect metrics, events (including **user prompts**), and traces via OpenTelemetry, then store and analyze them with Prometheus, Loki, Tempo, PostgreSQL, Grafana, and an **executive ROI Analytics** web app — all on your machine via Docker Compose.

> Inspired by Anthropic’s [Claude Code monitoring docs](https://code.claude.com/docs/en/monitoring-usage) and the [ROI monitoring guide](https://github.com/anthropics/claude-code-monitoring-guide). This project adds durable log/event storage (Loki + PostgreSQL), traces (Tempo), prompt capture, a manager-facing Next.js UI, and cross-platform Claude Code setup scripts.

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
        ┌───────────┴───────────┐
        ▼                       ▼
 Analytics (:3010)          Grafana (:3000)
 (executive ROI UI)         (ops dashboards)
```

| Service | Role |
| --- | --- |
| **otel-collector** | Receives OTLP from Claude; fans out to backends |
| **Prometheus** | Time-series metrics (cost, tokens, sessions) |
| **Loki** | Searchable event / prompt logs |
| **Tempo** | Distributed traces (beta flag required) |
| **PostgreSQL** | Structured durable store for SQL analytics |
| **postgres-sink** | OTLP HTTP/JSON → Postgres |
| **Analytics** | Next.js executive UI (ROI, cost, adoption) |
| **Grafana** | Ops dashboards over all backends |

**Who uses what:** managers / C-level / analysts → **Analytics** (`http://localhost:3010`). Engineers debugging pipelines → **Grafana** (`http://localhost:3000`).

## Quick start

### Requirements

- Docker Desktop **or** Docker Engine + Compose v2 (macOS, Linux, or Windows)
- Claude Code CLI (`claude`) for end-to-end verification
- Python 3 (for `install-global.sh` on macOS/Linux)

### 1. Configure local credentials

```bash
cp .env.example .env
# Edit .env — change POSTGRES_PASSWORD and GRAFANA_ADMIN_PASSWORD
# Optional ROI assumptions: AVG_HOURS_SAVED_PER_SESSION, HOURLY_ENGINEER_COST_USD
```

PowerShell:

```powershell
Copy-Item .env.example .env
# Edit .env as above
```

### 2. Start the stack

**macOS / Linux:**

```bash
./scripts/start.sh
# or: make up
```

**Windows (PowerShell):**

```powershell
.\scripts\start.ps1
```

Services use `restart: unless-stopped`. Enable Docker to start on login so the stack returns after reboot.

### 3. Configure Claude Code globally

**macOS / Linux (bash or zsh):**

```bash
./scripts/install-global.sh
```

This updates:

| Target | Purpose |
| --- | --- |
| `~/.claude/settings.json` → `env` | Applies for CLI / IDE / Desktop Code sessions |
| `~/.zshrc` and/or `~/.bashrc` / `~/.bash_profile` | Sources `scripts/claude-otel.env` for terminal launches |

**Windows (PowerShell):**

```powershell
.\scripts\install-global.ps1
```

This updates `%USERPROFILE%\.claude\settings.json` and appends env vars to your PowerShell profile.

Then **restart Claude Code / Claude Desktop** so OTel exporters re-initialize.

### 4. Verify

**macOS / Linux:**

```bash
./scripts/smoke-test.sh
claude -p "hello otel"
```

**Windows:**

```powershell
docker compose ps
claude -p "hello otel"
# Optional: curl.exe http://127.0.0.1:3010/api/health
```

Open:

- **Analytics (ROI):** [http://localhost:3010](http://localhost:3010)
- **Grafana (ops):** [http://localhost:3000](http://localhost:3000) (credentials from `.env`)

## Analytics app

The Next.js app under [`analytics/`](analytics/) reads **PostgreSQL** (prompts, users, tools) and **Prometheus** (cost, tokens, sessions) and presents:

| Screen | Focus |
| --- | --- |
| Overview | Spend, estimated value, ROI multiple, trends |
| Costs & Tokens | Model mix, token types, cost per session/user |
| Adoption | Daily usage, user leaderboard, CLI vs Desktop |
| Productivity | Tool mix, accept/reject, commits/PRs when present |
| Activity | Searchable prompt explorer |
| Settings | ROI assumption env vars and formulas |

ROI heuristic (configurable via `.env`):

```
estimated hours = sessions × AVG_HOURS_SAVED_PER_SESSION
estimated value = hours × HOURLY_ENGINEER_COST_USD
ROI multiple    = estimated value ÷ API spend
```

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

POSIX shell: source [`scripts/claude-otel.env`](scripts/claude-otel.env).  
PowerShell: see the block written by `install-global.ps1` (`$env:VAR = "..."`).

## Claude Desktop

- **Code tab sessions** (macOS / Linux / Windows): use `~/.claude/settings.json` (installed above). Resource `service.name` is typically `claude-code-desktop`.
- **App-level OTLP via MDM** (**macOS only**): template at [`claude-desktop/claude-desktop-otel.mobileconfig`](claude-desktop/claude-desktop-otel.mobileconfig) (`otlpEndpoint=http://127.0.0.1:4318`, content capture enabled).

## SQL analytics

```bash
docker exec -it claude-postgres \
  psql -U "${POSTGRES_USER:-claude}" -d "${POSTGRES_DB:-claude_otel}"
```

```sql
SELECT * FROM v_user_prompts ORDER BY event_time DESC LIMIT 20;
SELECT * FROM v_daily_usage;
SELECT * FROM v_tool_activity ORDER BY event_time DESC LIMIT 50;
SELECT * FROM v_user_leaderboard;
```

> Note: `postgres/init/*.sql` runs only on a **fresh** Postgres volume. Existing volumes need a manual `psql -f` apply for new views (e.g. `v_user_leaderboard`).

## Repository layout

```
.
├── docker-compose.yml
├── .env.example
├── analytics/                 # Next.js executive ROI UI (:3010)
├── otel/                      # Collector config
├── prometheus/                # Scrape config
├── loki/                      # Loki config
├── tempo/                     # Tempo config
├── postgres/init/             # SQL schema + views
├── postgres-sink/             # OTLP → Postgres service
├── grafana/                   # Provisioning + ops dashboard
├── scripts/                   # start / install / smoke (sh + ps1)
└── claude-desktop/            # Optional macOS MDM profile template
```

## Privacy & security

- OTel export is **opt-in** and goes only to **your** collector.
- With prompt logging enabled, treat Postgres/Loki volumes **and the Analytics UI** as **sensitive**.
- Defaults in `.env.example` are for localhost only — change them before any shared or networked use.
- See [SECURITY.md](SECURITY.md).

## License

[MIT](LICENSE)

## References

- [Claude Code — Monitoring usage (OpenTelemetry)](https://code.claude.com/docs/en/monitoring-usage)
- [Claude Code ROI measurement guide](https://github.com/anthropics/claude-code-monitoring-guide)
- [Claude Desktop configuration reference](https://claude.com/docs/third-party/claude-desktop/configuration)
- [OpenTelemetry specification](https://opentelemetry.io/docs/specs/otel/)
