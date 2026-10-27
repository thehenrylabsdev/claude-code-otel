#!/usr/bin/env bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [ -f .env ]; then
  # shellcheck disable=SC1091
  set -a
  source .env
  set +a
fi

POSTGRES_USER="${POSTGRES_USER:-claude}"
POSTGRES_DB="${POSTGRES_DB:-claude_otel}"

echo "== Collector OTLP HTTP =="
curl -sf -o /dev/null -w "HTTP %{http_code}\n" \
  -X POST http://127.0.0.1:4318/v1/logs \
  -H 'Content-Type: application/json' \
  -d '{
    "resourceLogs": [{
      "resource": {
        "attributes": [
          {"key":"service.name","value":{"stringValue":"claude-code"}},
          {"key":"service.version","value":{"stringValue":"smoke"}}
        ]
      },
      "scopeLogs": [{
        "logRecords": [{
          "timeUnixNano": "'"$(($(date +%s)*1000000000))"'",
          "body": {"stringValue": "claude_code.user_prompt"},
          "attributes": [
            {"key":"event.name","value":{"stringValue":"user_prompt"}},
            {"key":"session.id","value":{"stringValue":"smoke-session"}},
            {"key":"user.email","value":{"stringValue":"smoke@example.com"}},
            {"key":"prompt.id","value":{"stringValue":"smoke-prompt"}},
            {"key":"prompt_length","value":{"intValue":"18"}},
            {"key":"prompt","value":{"stringValue":"smoke test prompt"}}
          ]
        }]
      }]
    }]
  }'

sleep 2

echo "== Postgres prompt count =="
docker exec claude-postgres psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c \
  "SELECT COUNT(*) AS prompts FROM v_user_prompts; SELECT left(prompt_text,80) AS latest FROM v_user_prompts ORDER BY id DESC LIMIT 3;"

echo "== Grafana health =="
curl -sf http://127.0.0.1:3000/api/health && echo

echo "Smoke test finished."
