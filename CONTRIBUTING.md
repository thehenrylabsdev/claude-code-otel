# Contributing

Thanks for helping improve this local Claude Code observability stack.

## Development setup

**macOS / Linux:**

```bash
cp .env.example .env
./scripts/start.sh
./scripts/smoke-test.sh
```

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
.\scripts\start.ps1
```

### Analytics UI (Next.js)

```bash
cd analytics
npm install
npm run dev   # http://localhost:3010 — needs Postgres + Prometheus from compose
```

Production image is built via the `analytics` service in `docker-compose.yml`.

## Guidelines

- Keep defaults local-only and documented. Do not introduce real credentials into the repo.
- Prefer environment variables (via `.env`) over hard-coded passwords.
- Update `README.md` when you change ports, services, or Claude Code env vars.
- Document both POSIX (`*.sh`) and Windows (`*.ps1`) entrypoints when adding scripts.
- Run `./scripts/smoke-test.sh` after collector, postgres-sink, or analytics API changes.
- Keep commits focused; describe *why* in the commit message.

## Pull requests

1. Fork and create a feature branch.
2. Include a short summary and test notes (smoke test output is enough for most changes).
3. Do not include `.env`, personal `settings.json`, or telemetry dumps.
