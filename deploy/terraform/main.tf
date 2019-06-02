#Terraform Configuration

variable "TESTNET_NAME" {
  description = "Name of the testnet"
  default = "agoric"
}

variable "SSH_KEY_FILE" {
  description = "SSH public key file to be used on the nodes"
  type = "string"
}

variable "REGIONS" {
    description = "Map from provider to list of regions indexed by instance ID"
    type = "map"
}
