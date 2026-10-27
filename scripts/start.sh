#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ ! -f .env ]; then
  echo "No .env found — copying .env.example"
  cp .env.example .env
  echo "Edit .env to set strong local passwords, then re-run if desired."
fi

# shellcheck disable=SC1091
set -a
source .env
set +a

echo "Starting Claude Code OTel stack..."
docker compose up -d --build

echo
ANALYTICS_PORT="${ANALYTICS_PORT:-3010}"

echo "Waiting for services..."
for _ in $(seq 1 90); do
  grafana_ok=0
  analytics_ok=0
  curl -sf http://127.0.0.1:3000/api/health >/dev/null 2>&1 && grafana_ok=1
  curl -sf "http://127.0.0.1:${ANALYTICS_PORT}/api/health" >/dev/null 2>&1 && analytics_ok=1
  if [ "$grafana_ok" -eq 1 ] && [ "$analytics_ok" -eq 1 ]; then
    break
  fi
  sleep 2
done

docker compose ps
echo
echo "Analytics:   http://localhost:${ANALYTICS_PORT}  (executive ROI UI)"
echo "Grafana:     http://localhost:3000             (ops dashboards)"
echo "Prometheus:  http://localhost:9090"
echo "Loki:        http://localhost:3100"
echo "Tempo:       http://localhost:3200"
echo "OTLP gRPC:   localhost:4317"
echo "OTLP HTTP:   localhost:4318"
echo "PostgreSQL:  localhost:5432  (see .env for credentials)"
echo
echo "Services use restart: unless-stopped — they return when Docker starts."
echo "Tip: enable Docker to start on login (Docker Desktop or systemd/engine)."
