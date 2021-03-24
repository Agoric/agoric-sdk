variable "name" {
  description = "The cluster name, e.g cdn"
}

variable "offset" {
  description = "Offset of node id"
  default = 0
}

variable "role" {
  description = "Role of the nodes in this cluster"
  type = "string"
  default = "node"
}

variable "ssh_key" {
  description = "SSH key filename to copy to the nodes"
  type = "string"
}

variable "servers" {
  description = "Desired instance count"
  default     = 1
}

variable "volumes" {
  description = "Volumes to mount"
  type = "list"
}
