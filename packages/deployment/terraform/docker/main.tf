variable "DOCKER_HOST" {
  description = "Address of Docker host"
  default = "unix:///var/run/docker.sock"
}

variable "CLUSTER_NAME" {
  description = "Name of the cluster"
  default = "agoric"
}

variable "SSH_KEY_FILE" {
  description = "SSH public key file to be used on the nodes"
  type = "string"
}

variable "ROLE" {
  description = "Role of this cluster"
  default = "node"
}

variable "SERVERS" {
  description = "Number of nodes in cluster"
  default = "5"
}

variable "OFFSET" {
  description = "Offset of node id"
  default = "0"
}

variable "VOLUMES" {
  description = "Volumes to mount"
  default = []
}

provider "docker" {
  host = "${var.DOCKER_HOST}"
}

module "cluster" {
  source           = "./cluster"
  name             = "${var.CLUSTER_NAME}"
  offset           = "${var.OFFSET}"
  ssh_key          = "${var.SSH_KEY_FILE}"
  role             = "${var.ROLE}"
  servers          = "${var.SERVERS}"
  volumes          = "${var.VOLUMES}"
}


output "public_ips" {
  value = "${module.cluster.public_ips}"
}
