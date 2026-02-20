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
      container_path = lookup(volumes.value, "container_path", null)
      host_path      = lookup(volumes.value, "host_path", null)
    }
  }

  upload {
    content = file(var.ssh_key)
    file    = "/root/.ssh/authorized_keys"
  }
}

