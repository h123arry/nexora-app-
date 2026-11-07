variable "project_id" { type = string }
variable "bucket_name" { type = string }
variable "domain" { type = string }
variable "cdn_signing_key_base64" { type = string, sensitive = true }
