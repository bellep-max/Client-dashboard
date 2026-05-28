provider "aws" {
  region = var.aws_region
}

# ---------- Naming ----------

resource "random_id" "suffix" {
  byte_length = 4
}

locals {
  bucket_name = "${var.bucket_name_prefix}-${random_id.suffix.hex}"
}

# ---------- S3 (private; CloudFront-only via OAC) ----------

resource "aws_s3_bucket" "portal" {
  bucket = local.bucket_name

  tags = {
    Name      = local.bucket_name
    Component = "client-portal"
    ManagedBy = "terraform"
  }
}

resource "aws_s3_bucket_ownership_controls" "portal" {
  bucket = aws_s3_bucket.portal.id

  rule {
    object_ownership = "BucketOwnerEnforced"
  }
}

resource "aws_s3_bucket_public_access_block" "portal" {
  bucket = aws_s3_bucket.portal.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "portal" {
  bucket = aws_s3_bucket.portal.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "portal" {
  bucket = aws_s3_bucket.portal.id

  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_lifecycle_configuration" "portal" {
  bucket = aws_s3_bucket.portal.id

  # Versioning must be on before lifecycle rules can target noncurrent versions.
  depends_on = [aws_s3_bucket_versioning.portal]

  rule {
    id     = "expire-noncurrent-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days = 30
    }
  }
}

# ---------- CloudFront ----------

resource "aws_cloudfront_origin_access_control" "portal" {
  name                              = "${local.bucket_name}-oac"
  description                       = "OAC for client portal S3 bucket"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# AWS-managed cache & origin-request policies.
# Static assets: CachingOptimized. API: CachingDisabled + AllViewerExceptHostHeader.
# IDs are stable AWS-managed values — see CloudFront docs.
locals {
  cache_policy_caching_optimized                  = "658327ea-f89d-4fab-a63d-7e88639e58f6"
  cache_policy_caching_disabled                   = "4135ea2d-6df8-44a3-9df3-4b5a84be39ad"
  origin_request_policy_all_viewer_except_host_hd = "b689b0a8-53d0-40ab-baf2-68738e2966ac"
}

resource "aws_cloudfront_distribution" "portal" {
  enabled             = true
  is_ipv6_enabled     = true
  comment             = "Signal AEO Customer Portal"
  default_root_object = "index.html"
  price_class         = var.cloudfront_price_class
  http_version        = "http2and3"

  # ---- Origins ----

  origin {
    origin_id                = "s3-portal"
    domain_name              = aws_s3_bucket.portal.bucket_regional_domain_name
    origin_access_control_id = aws_cloudfront_origin_access_control.portal.id
  }

  origin {
    origin_id   = "apprunner-api"
    domain_name = var.app_runner_origin_domain

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  # ---- Default behavior: serve SPA from S3 ----

  default_cache_behavior {
    target_origin_id       = "s3-portal"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # CachingOptimized — TTL comes from S3 Cache-Control headers set by the
    # deploy workflow (long-cache for hashed assets, no-cache for index.html).
    cache_policy_id = local.cache_policy_caching_optimized
  }

  # ---- /api/* → App Runner ----

  ordered_cache_behavior {
    path_pattern           = "/api/*"
    target_origin_id       = "apprunner-api"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD", "OPTIONS", "PUT", "POST", "PATCH", "DELETE"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    cache_policy_id          = local.cache_policy_caching_disabled
    origin_request_policy_id = local.origin_request_policy_all_viewer_except_host_hd
  }

  # ---- SPA fallback ----

  custom_error_response {
    error_code            = 403
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  custom_error_response {
    error_code            = 404
    response_code         = 200
    response_page_path    = "/index.html"
    error_caching_min_ttl = 0
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }

  tags = {
    Name      = "signal-aeo-portal"
    Component = "client-portal"
    ManagedBy = "terraform"
  }
}

# ---------- S3 bucket policy: allow only this CloudFront distribution ----------

data "aws_iam_policy_document" "portal_bucket_policy" {
  statement {
    sid     = "AllowCloudFrontReadViaOAC"
    effect  = "Allow"
    actions = ["s3:GetObject"]

    principals {
      type        = "Service"
      identifiers = ["cloudfront.amazonaws.com"]
    }

    resources = ["${aws_s3_bucket.portal.arn}/*"]

    condition {
      test     = "StringEquals"
      variable = "AWS:SourceArn"
      values   = [aws_cloudfront_distribution.portal.arn]
    }
  }
}

resource "aws_s3_bucket_policy" "portal" {
  bucket = aws_s3_bucket.portal.id
  policy = data.aws_iam_policy_document.portal_bucket_policy.json

  depends_on = [aws_s3_bucket_public_access_block.portal]
}
