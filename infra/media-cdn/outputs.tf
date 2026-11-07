output "cdn_ip_address" { value = google_compute_global_address.media.address }
output "cdn_domain" { value = var.domain }
