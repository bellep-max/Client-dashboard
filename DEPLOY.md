# Deploy

This repo (`bellep-max/Client-dashboard`) hosts the **customer portal frontend** only — `artifacts/aeo-dashboard`, a Vite SPA. It deploys to a dedicated S3 + CloudFront stack in AWS account `788269087294` (`us-east-1`).

The portal **backend** lives in the separate `bellep-max/AEOAdmin` repo and deploys to AWS App Runner via that repo's `.github/workflows/deploy-api.yml`. CloudFront in this repo proxies `/api/*` to that App Runner service; everything else is served from S3 with SPA fallback to `index.html`.

## One-time AWS setup

See [`infra/portal-frontend/README.md`](./infra/portal-frontend/README.md) for the Terraform module that provisions the S3 bucket, CloudFront distribution, Origin Access Control, and bucket policy. Run `terraform apply` from `infra/portal-frontend/` with `AWS_PROFILE=aeo-admin`.

After apply, copy the Terraform outputs into the GitHub repo secrets below.

## CI/CD

`.github/workflows/deploy-portal-fe.yml` runs on every push to `main` that touches `artifacts/aeo-dashboard/**`, any of its workspace dependencies (`lib/api-client-react`, `lib/api-zod`, `lib/api-spec`, `lib/integrations`), or the workflow / lockfile itself. It builds `@workspace/aeo-dashboard`, syncs `artifacts/aeo-dashboard/dist/public/` to S3 with appropriate cache headers, then creates a CloudFront invalidation for `/*`.

The workflow can also be triggered manually via `workflow_dispatch`.

## Required GitHub repo secrets

| Secret                       | Source                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `AWS_ACCESS_KEY_ID`          | IAM user with S3 sync + CloudFront invalidation permissions                  |
| `AWS_SECRET_ACCESS_KEY`      | Same IAM user                                                                |
| `PORTAL_S3_BUCKET`           | Terraform output `s3_bucket_name`                                            |
| `PORTAL_CLOUDFRONT_DIST_ID`  | Terraform output `cloudfront_distribution_id`                                |

## Required build-time env vars

Documented on the workflow / Vercel project / whichever pipeline builds the SPA:

- `VITE_ADMIN_URL` *(optional)* — points the portal at the admin app. Only needed if you want users with admin role detected on the portal to be redirected somewhere (e.g. `https://admin.signal-aeo.com`). Omit to leave the portal self-contained.

## Schema migration note

`migrations/0001_unified_auth.sql` lives in the **AEOAdmin** repo, not here. It must be applied to the production RDS database **before** merging anything that triggers AEOAdmin's `deploy-api.yml`. Skipping this will cause the API to deploy against a schema it can't speak to. Coordinate with whoever ships the AEOAdmin change.
