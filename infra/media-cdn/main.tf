provider "google" { project = var.project_id }

data "google_storage_bucket" "media" { name = var.bucket_name }
data "google_project" "current" { project_id = var.project_id }

resource "google_storage_bucket_iam_member" "cdn_origin_reader" {
  bucket = data.google_storage_bucket.media.name
  role   = "roles/storage.objectViewer"
  member = "serviceAccount:service-${data.google_project.current.number}@cloud-cdn-fill.iam.gserviceaccount.com"
}

resource "google_compute_backend_bucket" "media" {
  name        = "nexora-private-media-origin"
  bucket_name = data.google_storage_bucket.media.name
  enable_cdn  = true
  depends_on  = [google_storage_bucket_iam_member.cdn_origin_reader]
  cdn_policy {
    cache_mode                   = "CACHE_ALL_STATIC"
    default_ttl                  = 3600
    max_ttl                      = 31536000
    client_ttl                   = 3600
    signed_url_cache_max_age_sec = 3600
  }
}

resource "google_compute_backend_bucket_signed_url_key" "media" {
  name           = "nexora-media-signing-key"
  backend_bucket = google_compute_backend_bucket.media.name
  key_value      = var.cdn_signing_key_base64
}

resource "google_compute_url_map" "media" {
  name            = "nexora-media-cdn"
  default_service = google_compute_backend_bucket.media.id
}

resource "google_compute_managed_ssl_certificate" "media" {
  name = "nexora-media-cdn-cert"
  managed { domains = [var.domain] }
}

resource "google_compute_target_https_proxy" "media" {
  name             = "nexora-media-cdn-https"
  url_map          = google_compute_url_map.media.id
  ssl_certificates = [google_compute_managed_ssl_certificate.media.id]
}

resource "google_compute_global_address" "media" { name = "nexora-media-cdn-ip" }
resource "google_compute_global_forwarding_rule" "https" {
  name                  = "nexora-media-cdn-https"
  target                = google_compute_target_https_proxy.media.id
  ip_address            = google_compute_global_address.media.address
  port_range            = "443"
  load_balancing_scheme = "EXTERNAL_MANAGED"
}
