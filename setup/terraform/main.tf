#Terraform Configuration

variable "NETWORK_NAME" {
  description = "Name of the network"
  default = "agoric"
}

variable "OFFSETS" {
    description = "Map from provider to offset of node numbers"
    type = "map"
}

variable "SSH_KEY_FILE" {
  description = "SSH public key file to be used on the nodes"
  type = "string"
}

variable "REGIONS" {
    description = "Map from provider to list of regions indexed by instance ID"
    type = "map"
}
