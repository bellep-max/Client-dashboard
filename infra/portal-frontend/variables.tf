variable "aws_region" {
  description = "AWS region for the portal frontend resources."
  type        = string
  default     = "us-east-1"
}

variable "bucket_name_prefix" {
  description = "Prefix for the S3 bucket name. A random suffix is appended to keep the name globally unique."
  type        = string
  default     = "signal-aeo-portal-fe"
}

variable "app_runner_origin_domain" {
  description = "App Runner backend domain used as the /api/* CloudFront origin."
  type        = string
  default     = "jjm59vpn3y.us-east-1.awsapprunner.com"
}

variable "cloudfront_price_class" {
  description = "CloudFront price class. PriceClass_100 covers US/Canada/Europe (cheapest)."
  type        = string
  default     = "PriceClass_100"
}
