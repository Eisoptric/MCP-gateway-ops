# MCP Gateway Ops

The Eisoptric **operator console**, at `ops.eisoptric.com`. It runs the MCP Gateway platform for Eisoptric's own team and is not the customer console: customers use [MCP-gateway-frontend](https://github.com/Eisoptric/MCP-gateway-frontend) at `console.eisoptric.com`. The `admin.` host is left for a future customer organization-admin UI.

It talks to the [MCP-gateway-backend](https://github.com/Eisoptric/MCP-gateway-backend) API through a Next.js rewrite: `/gateway-api/*` goes to `API_URL`, which is `http://localhost:8000` by default.

## Run locally

Start the backend on port 8000 (see its README), then:

```bash
npm install
npm run dev
```

Open [http://localhost:3001](http://localhost:3001) and sign in as the platform admin the backend seeded from its `SEED_USER_EMAIL` and `SEED_USER_PASSWORD`.

The first sign-in asks you to add a passkey or set up an authenticator app. Until one of them is on the account, the API lets a platform admin do nothing else. Later sign-ins ask for the passkey, the app's 6-digit code or a backup code.

Set `API_URL` to change the API origin (see `.env.example`), then restart `next dev`.

## Sign-in and sessions

- The session is the API's `HttpOnly` cookie, passed through the `/gateway-api` rewrite. The console stores no token.
- The password is hashed in the browser (Argon2id, then HKDF), and only the result is sent. The labels (`eisoptric-login-v1`, `eisoptric-argon2-salt-v1`, `eisoptric-login-v2`) must match the API's own sign-in page byte for byte. This needs `crypto.subtle`, so serve the console over HTTPS or from `localhost`.
- Settings has the signed-in operator's own second steps: an authenticator app, and passkeys to add or remove. Having both means a lost device does not lock you out.
- A passkey belongs to the address it was added from. One made in the customer console does not work here, and the API accepts one only from an origin in its `CORS_ORIGINS`. A passkey alone meets the API's requirement for an operator, and so does an authenticator app.
- The API accepts a change authenticated by cookie only from an origin it trusts. `https://ops.eisoptric.com` and `http://localhost:3001` must be in the API's `CORS_ORIGINS`.

## What it does

- Overview: organizations, users, agents, connections and system health
- Organizations: onboard, plan, suspend, tenant users
- Users: every user across accounts
- Connections: MCP Gateway status per account
- MCP: tool ecosystem observability
- Usage: runs and tool calls, by time range
- Audit: operator and system actions
- Settings: platform config metadata (no secret values)

## Deploy

Cloud Run via GitHub Actions. See [`DEPLOY.md`](DEPLOY.md).
