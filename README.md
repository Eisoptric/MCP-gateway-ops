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

The first sign-in asks you to add a passkey or set up an authenticator app: the API lets a platform admin do nothing else until one of them is on the account. Later sign-ins ask for the passkey, or the app's 6-digit code or a backup code.

Override the API origin with `API_URL` (see `.env.example`). Restart `next dev` after changing it.

## Sign-in and sessions

- The session is the API's `HttpOnly` cookie, passed through the `/saturn-api` rewrite. The console stores no token.
- The password is hashed in the browser (Argon2id, then HKDF) and only the result is sent, the same as the API's own sign-in page. This needs `crypto.subtle`, so serve the console over HTTPS or from `localhost`.
- Settings has the signed-in operator's own second steps: set up an authenticator app, and add or remove passkeys. Having both means a lost device does not lock you out.
- Passkeys: add one under Settings, then use it at sign-in instead of typing a code. A passkey belongs to the address it was added from, so one made in the customer console does not work here, and the API takes one only from an origin in its `CORS_ORIGINS`. A passkey alone meets the API's requirement for an operator; so does an authenticator app.
- The API accepts a cookie-authenticated change only from an origin it trusts. Put the console's origin in the API's `CORS_ORIGINS`; `http://localhost:3001` is there by default.

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

