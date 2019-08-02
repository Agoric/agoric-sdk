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

variable "DATACENTERS" {
    description = "Map from provider to list of datacenters indexed by instance ID"
    type = "map"
}

variable "VOLUMES" {
  description = "Map from provider to system volume specifications"
  type = "map"
}
