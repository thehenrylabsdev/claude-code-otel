.PHONY: up down ps logs smoke install-global env help

help:
	@echo "Targets:"
	@echo "  make env             Copy .env.example → .env if missing"
	@echo "  make up              Start full stack (incl. Analytics :3010)"
	@echo "  make down            Stop stack"
	@echo "  make ps              Show compose status"
	@echo "  make logs            Tail logs"
	@echo "  make smoke           Run smoke test"
	@echo "  make install-global  Configure Claude Code OTel (macOS/Linux)"
	@echo ""
	@echo "URLs after up:"
	@echo "  Analytics  http://localhost:$${ANALYTICS_PORT:-3010}"
	@echo "  Grafana    http://localhost:3000"

env:
	@test -f .env || cp .env.example .env

up: env
	./scripts/start.sh

down:
	docker compose down

ps:
	docker compose ps

logs:
	docker compose logs -f --tail=100

smoke:
	./scripts/smoke-test.sh

install-global:
	./scripts/install-global.sh
