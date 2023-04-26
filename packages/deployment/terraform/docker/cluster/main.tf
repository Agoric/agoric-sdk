resource "docker_container" "cluster" {
  name = "${var.name}-${var.role}${var.offset + count.index}"
  count = "${var.servers}"
  image = "ghcr.io/agoric/ssh-node:latest"

  tmpfs {
    "/tmp" = "exec"
    "/run" = ""
  }

  volumes = "${var.volumes}"

  upload {
    content = "${file("${var.ssh_key}")}"
    file = "/root/.ssh/authorized_keys"
  }
}
