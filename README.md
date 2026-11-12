# Saturn Admin Dashboard

Saturn **Operator Console** — platform operations for Saturn itself, not ACME’s customer control panel.

Talks to the backend in `../Backend` through a Next.js rewrite: `/saturn-api/*` → `http://localhost:8000/*`.

## Run locally

Full stack with Docker (console + admin + API + Postgres + Redis). Same Compose file as `../frontend` and the repo root:

```bash
docker compose up --build
```

- Admin: [http://localhost:3001](http://localhost:3001)
- Console: [http://localhost:3000](http://localhost:3000)
- API: [http://localhost:8000/docs](http://localhost:8000/docs)

Or run only the dashboard against a backend already up on port 8000:

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and sign in with the bootstrap platform admin:

- email: `rick@saturn.ai`
- password: `saturn`

Override the API origin with `API_URL` (see `.env.example`). Restart `next dev` after changing it.

## What it does

Saturn **Operator Console** — platform operations, not the customer control panel.

- Overview: orgs / users / agents / connections and system health
- Organizations: onboard, plan, suspend, tenant users
- Users: every user across accounts
- Connections: Saturn MCP gateway status per account
- MCP: tool ecosystem observability
- Usage: runs and tool calls, by time range
- Audit: operator and system actions
- Settings: platform config metadata (no secret values)

## Deploy

Cloud Run via GitHub Actions. See [`DEPLOY.md`](DEPLOY.md).

