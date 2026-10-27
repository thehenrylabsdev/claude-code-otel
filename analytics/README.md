# Claude Code ROI Analytics

Next.js executive dashboard for Claude Code / Desktop telemetry collected by this stack.

- **Port:** `3010` (see root `docker-compose.yml`)
- **Data:** PostgreSQL (`DATABASE_URL`) + Prometheus (`PROMETHEUS_URL`)
- **ROI env:** `AVG_HOURS_SAVED_PER_SESSION`, `HOURLY_ENGINEER_COST_USD`

## Local development

```bash
# From repo root — stack must be running
docker compose up -d postgres prometheus postgres-sink otel-collector

cd analytics
cp ../.env.example ../.env   # if needed
export DATABASE_URL=postgresql://claude:changeme_local_only@localhost:5432/claude_otel
export PROMETHEUS_URL=http://localhost:9090
npm install
npm run dev
```

Open http://localhost:3010

## Production

Built and started by Compose:

```bash
docker compose up -d --build analytics
```
