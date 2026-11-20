# Deploy to Google Cloud

Pushing to `main` builds this app and deploys it to Cloud Run as `gateway-ops` in `eisoptric-prod`.

GitHub signs in to Google Cloud with Workload Identity Federation. The provider trusts `main` of `Eisoptric/MCP-gateway-ops` only, so if this repository is renamed again, its binding on `github-deployer-dashboard` must be renamed too.

## Secrets

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

## Variables

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_LOCATION`
- `GAR_REPOSITORY` (`gateway`)
- `OPS_CLOUD_RUN_SERVICE` (`gateway-ops`)
- `BACKEND_PUBLIC_URL` (`https://api.eisoptric.com`, no trailing slash)
- `RUNTIME_SERVICE_ACCOUNT`

`BACKEND_PUBLIC_URL` is compiled into the `/gateway-api` rewrite. Use the address that goes through Cloudflare, not the backend's `run.app` URL: the API refuses requests that arrive without the origin header Cloudflare adds. Deploy the backend first, then this service.

The backend must list `https://ops.eisoptric.com` in its `CORS_ORIGINS`. Sessions are cookies, and the backend refuses a change authenticated by cookie from any other origin, so without it every save in the console answers 403.

Serve `ops.eisoptric.com` only behind Cloudflare Access, so that only Eisoptric's operators can reach the sign-in page.

The full GCP setup is in the backend repository at `infra/gcp/README.md`.
