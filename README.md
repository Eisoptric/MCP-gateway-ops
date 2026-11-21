# MCP Gateway Ops

The Eisoptric **operator console**, at `ops.eisoptric.com`. It runs the MCP Gateway platform for Eisoptric's own team and is not the customer console: customers use [MCP-gateway-frontend](https://github.com/Eisoptric/MCP-gateway-frontend) at `console.eisoptric.com`. The `admin.` host is left for a future customer organization-admin UI.

It talks to the [MCP-gateway-backend](https://github.com/Eisoptric/MCP-gateway-backend) API through a Next.js rewrite: `/gateway-api/*` goes to `API_URL`, which is `http://localhost:8000` by default.

## Run locally

Start the backend on port 8000 (see its README), then:

```bash
npm install
npm run dev
```

Sign up at `SEED_USER_EMAIL` in the customer console first: the emailed code makes that account the platform admin while the platform has none. Then open [http://localhost:3001](http://localhost:3001) and sign in with it.

The first sign-in asks you to add a passkey or set up an authenticator app. Until one of them is on the account, the API lets a platform admin do nothing else. Later sign-ins ask for the passkey, the app's 6-digit code or a backup code.

Set `API_URL` to change the API origin (see `.env.example`), then restart `next dev`.

## Sign-in and sessions

- The session is the API's `HttpOnly` cookie, passed through the `/gateway-api` rewrite. The console stores no token.
- The password is hashed in the browser (Argon2id, then HKDF), and only the result is sent. The labels (`eisoptric-login-v1`, `eisoptric-argon2-salt-v1`, `eisoptric-login-v2`) must match the API's own sign-in page byte for byte. This needs `crypto.subtle`, so serve the console over HTTPS or from `localhost`.
- Settings has the signed-in operator's own second steps: an authenticator app, and passkeys to add or remove. Having both means a lost device does not lock you out.
- A passkey belongs to the API's `WEBAUTHN_RP_ID`, which is `eisoptric.com` in production, so one added in the customer console also works here and the other way round. The API still accepts one only from an origin in its `CORS_ORIGINS`. A passkey alone meets the API's requirement for an operator, and so does an authenticator app.
- The API accepts a change authenticated by cookie only from an origin it trusts. `https://ops.eisoptric.com` and `http://localhost:3001` must be in the API's `CORS_ORIGINS`.

## What it does

- **Overview**: personal and team accounts; tool calls, approvals waiting, webhook failures and unreachable MCP servers in the last 24 hours; each service's status and 30-day uptime; recent platform events.
- **Accounts**: every organization with its account type, members, MCP servers, tool calls in the last 30 days and last activity. The detail page shows:
  - members with their sign-in security;
  - agents and when each last connected;
  - MCP servers and the hosts the account approved itself;
  - policies and tool sets;
  - approvals and webhook delivery.

  From there you can suspend or reactivate the account, add or disable a member, and send a password reset.
- **Users**: everyone across accounts, with their second factors and last sign-in.
- **MCP**: every connected server by host, whether the host is from the marketplace or approved by the account, and whether the gateway can reach it.
- **Activity**: per account and per day, tool calls by policy decision (allowed, needed approval, denied), how approvals ended, and webhook deliveries.
- **Audit**: operator and system events across accounts.
- **Platform**: what the API runs with: revision, trusted origins, passkey domain, policy model, email, sign-in providers, and whether each secret is set (never its value), plus the platform operators.

Ops looks; it does not act inside an account's own work. It cannot change a policy, decide an approval, or read encrypted tool-call content.

## Deploy

Cloud Run via GitHub Actions. See [`DEPLOY.md`](DEPLOY.md).
