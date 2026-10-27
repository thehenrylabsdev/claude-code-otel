# Contributing

Thanks for helping improve this local Claude Code observability stack.

## Development setup

```bash
cp .env.example .env
./scripts/start.sh
./scripts/smoke-test.sh
```

## Guidelines

- Keep defaults local-only and documented. Do not introduce real credentials into the repo.
- Prefer environment variables (via `.env`) over hard-coded passwords.
- Update `README.md` when you change ports, services, or Claude Code env vars.
- Run `./scripts/smoke-test.sh` after collector or postgres-sink changes.
- Keep commits focused; describe *why* in the commit message.

## Pull requests

1. Fork and create a feature branch.
2. Include a short summary and test notes (smoke test output is enough for most changes).
3. Do not include `.env`, personal `settings.json`, or telemetry dumps.
