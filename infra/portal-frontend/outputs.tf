output "s3_bucket_name" {
  description = "Name of the S3 bucket holding the portal SPA build."
  value       = aws_s3_bucket.portal.id
}

output "s3_bucket_arn" {
  description = "ARN of the S3 bucket holding the portal SPA build."
  value       = aws_s3_bucket.portal.arn
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID. Used by the deploy workflow for invalidations."
  value       = aws_cloudfront_distribution.portal.id
}

output "cloudfront_domain_name" {
  description = "CloudFront *.cloudfront.net URL — open this in a browser to use the portal."
  value       = aws_cloudfront_distribution.portal.domain_name
}
