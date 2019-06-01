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

module "digitalocean" {
  source           = "./digitalocean"
  TESTNET_NAME     = "${var.TESTNET_NAME}"
  SSH_KEY_FILE     = "${var.SSH_KEY_FILE}"
  DO_API_TOKEN     = "${var.DO_API_TOKEN}"
  SERVERS          = "${var.SERVERS}"
}


output "public_ips" {
  value = "${module.digitalocean.public_ips}"
}
