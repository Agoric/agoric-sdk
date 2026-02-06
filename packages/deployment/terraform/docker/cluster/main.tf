resource "docker_container" "cluster" {
  name  = "${var.name}-${var.role}${var.offset + count.index}"
  count = var.servers
  image = "ghcr.io/agoric/ssh-node:latest"

  tmpfs = {
    "/tmp" = "exec"
    "/run" = ""
  }

  dynamic "volumes" {
    for_each = var.volumes
    content {
      # TF-UPGRADE-TODO: The automatic upgrade tool can't predict
      # which keys might be set in maps assigned here, so it has
      # produced a comprehensive set here. Consider simplifying
      # this after confirming which keys can be set in practice.

      container_path = lookup(volumes.value, "container_path", null)
      from_container = lookup(volumes.value, "from_container", null)
      host_path      = lookup(volumes.value, "host_path", null)
      read_only      = lookup(volumes.value, "read_only", null)
      volume_name    = lookup(volumes.value, "volume_name", null)
    }
  }

  upload {
    content = file(var.ssh_key)
    file    = "/root/.ssh/authorized_keys"
  }
}

