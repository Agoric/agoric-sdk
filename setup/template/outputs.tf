output "public_ips" {
  value = {
      digitalocean = "${module.digitalocean.public_ips}"
  }
}

output "offsets" {
  value = "${var.OFFSETS}"
}
