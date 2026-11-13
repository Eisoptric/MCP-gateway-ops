# Deploy to Google Cloud

Push `main` to build this app and deploy it to Cloud Run.

GitHub authenticates with Workload Identity Federation. Set these repository values before the first run.

## Secrets

- `GCP_WORKLOAD_IDENTITY_PROVIDER`
- `GCP_SERVICE_ACCOUNT_EMAIL`

## Variables

- `GCP_PROJECT_ID`
- `GCP_REGION`
- `GAR_LOCATION`
- `GAR_REPOSITORY`
- `DASHBOARD_CLOUD_RUN_SERVICE` (`saturn-dashboard`)
- `BACKEND_PUBLIC_URL` (Cloud Run URL of the backend, no trailing slash)

`BACKEND_PUBLIC_URL` is compiled into the `/saturn-api` rewrite. Deploy backend first, then this service.

The backend must list this console's public origin in its `CORS_ORIGINS`. Sessions are cookies, and the backend refuses a cookie-authenticated change from any other origin, so without it every save in the console answers 403.

The full GCP bootstrap lives in the backend repo at `infra/gcp/README.md`.
