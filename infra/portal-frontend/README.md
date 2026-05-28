# Customer Portal Frontend — AWS Infrastructure

Terraform module that provisions a **separate** CloudFront distribution + private S3 bucket for the Signal AEO customer portal SPA. The distribution proxies `/api/*` to the App Runner backend; everything else is served from S3 with SPA fallback to `index.html`.

This module lives in the `Client-dashboard` repo (`bellep-max/Client-dashboard`), which hosts the customer portal frontend (`artifacts/aeo-dashboard`). The admin panel and its API live in the separate `bellep-max/AEOAdmin` repo and have their own CloudFront distribution (`EXS9NUFRYMEFU`); keeping the portal on its own distribution avoids sharing a cookie jar or origin between the two apps.

## What it creates

- Private S3 bucket (`signal-aeo-portal-fe-<random>`) with versioning, AES256 encryption, and a lifecycle rule that expires non-current versions after 30 days.
- CloudFront Origin Access Control (OAC) so only the distribution can read the bucket.
- S3 bucket policy locking `s3:GetObject` to the distribution's ARN.
- CloudFront distribution:
  - Default origin: S3 (OAC) — serves SPA with `index.html` fallback on 403/404.
  - Ordered behavior `/api/*`: App Runner (HTTPS-only) with `Managed-CachingDisabled` + `Managed-AllViewerExceptHostHeader` so cookies, headers, and bodies pass through cleanly.
  - HTTP/2 + HTTP/3, IPv6, redirect-to-HTTPS, price class `PriceClass_100`.
  - Uses the default `*.cloudfront.net` certificate — no custom domain yet.

## Prerequisites

- Terraform `>= 1.5`
- AWS CLI configured with profile `aeo-admin` (account `788269087294`, region `us-east-1`), or equivalent env vars.

## Apply

```bash
cd infra/portal-frontend
export AWS_PROFILE=aeo-admin

terraform init
terraform plan
terraform apply
```

To override defaults:

```bash
terraform apply \
  -var "aws_region=us-east-1" \
  -var "bucket_name_prefix=signal-aeo-portal-fe" \
  -var "app_runner_origin_domain=jjm59vpn3y.us-east-1.awsapprunner.com" \
  -var "cloudfront_price_class=PriceClass_100"
```

CloudFront distributions take ~5–10 min to deploy. `terraform apply` will block until the distribution status is `Deployed`.

## After apply

Copy the four outputs into the GitHub repo secrets used by `.github/workflows/deploy-portal-fe.yml`:

| Terraform output             | GitHub secret name           |
| ---------------------------- | ---------------------------- |
| `s3_bucket_name`             | `PORTAL_S3_BUCKET`           |
| `cloudfront_distribution_id` | `PORTAL_CLOUDFRONT_DIST_ID`  |

Also required (set once, manually):

- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

The `cloudfront_domain_name` output (e.g. `dxxxxxxxxxxx.cloudfront.net`) is the URL customers will visit.

## Teardown

`terraform destroy` removes the distribution, OAC, bucket policy, and the S3 bucket — but **only if the bucket is empty**. Empty it first:

```bash
aws s3 rm s3://$(terraform output -raw s3_bucket_name) --recursive
# Versioning is on, so also delete every version + delete marker:
aws s3api delete-objects \
  --bucket "$(terraform output -raw s3_bucket_name)" \
  --delete "$(aws s3api list-object-versions \
    --bucket "$(terraform output -raw s3_bucket_name)" \
    --query '{Objects: Versions[].{Key:Key,VersionId:VersionId}}' \
    --output json)" || true
aws s3api delete-objects \
  --bucket "$(terraform output -raw s3_bucket_name)" \
  --delete "$(aws s3api list-object-versions \
    --bucket "$(terraform output -raw s3_bucket_name)" \
    --query '{Objects: DeleteMarkers[].{Key:Key,VersionId:VersionId}}' \
    --output json)" || true

terraform destroy
```

## Adding a custom domain later

When the user buys a domain:

1. Request an ACM cert in `us-east-1` (CloudFront requires us-east-1 certs).
2. Add `aliases = ["portal.example.com"]` and a `viewer_certificate` block referencing the cert ARN.
3. Add a Route 53 (or DNS provider) `ALIAS`/`CNAME` record pointing the domain at `cloudfront_domain_name`.

The current config intentionally leaves these out so the module applies cleanly with no DNS dependencies.
