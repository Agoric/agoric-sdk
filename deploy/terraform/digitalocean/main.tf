#Terraform Configuration

variable "DO_API_TOKEN" {
  description = "DigitalOcean Access Token"
}

variable "TESTNET_NAME" {
  description = "Name of the testnet"
  default = "agoric"
}

variable "SSH_KEY_FILE" {
  description = "SSH public key file to be used on the nodes"
  type = "string"
}

variable "SERVERS" {
  description = "Number of nodes in testnet"
  default = "5"
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
  name             = "${var.TESTNET_NAME}"
  regions          = "${var.REGIONS}"
  ssh_key          = "${var.SSH_KEY_FILE}"
  servers          = "${var.SERVERS}"
}


output "public_ips" {
  value = "${module.cluster.public_ips}"
}

