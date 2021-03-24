#Terraform Configuration

variable "DO_API_TOKEN" {
  description = "DigitalOcean Access Token"
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

variable "REGIONS" {
  description = "Regions to launch in (indexed by instance number)"
  type = "list"
  default = ["AMS3", "FRA1", "LON1", "NYC3", "SFO2", "SGP1", "TOR1"]
}

provider "digitalocean" {
  version = "~> 1.4"
  token = "${var.DO_API_TOKEN}"
}

module "cluster" {
  source           = "./cluster"
  name             = "${var.CLUSTER_NAME}"
  offset           = "${var.OFFSET}"
  regions          = "${var.REGIONS}"
  role             = "${var.ROLE}"
  ssh_key          = "${var.SSH_KEY_FILE}"
  servers          = "${var.SERVERS}"
}


output "public_ips" {
  value = "${module.cluster.public_ips}"
}

