.PHONY: up down ps logs smoke install-global env

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
