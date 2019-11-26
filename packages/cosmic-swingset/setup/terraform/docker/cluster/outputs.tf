// The cluster name
output "name" {
  value = "${var.name}"
}

// The list of cluster instance IDs
output "instances" {
  value = ["${docker_container.cluster.*.id}"]
}

// The list of cluster instance public IPs
output "public_ips" {
  value = ["${docker_container.cluster.*.ip_address}"]
}
