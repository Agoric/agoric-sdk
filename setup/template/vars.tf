variable "NETWORK_NAME" {
  default = "@NETWORK_NAME@"
}

variable "SSH_KEY_FILE" {
  default = "@SSH_KEY_FILE@"
}

# Generate from PLACEMENT="digitalocean:NYC3 digitalocean:SFO2:2 digitalocean:TOR1:2"
variable "REGIONS" {
    default = {
        digitalocean = ["NYC3", "SFO2", "SFO2", "TOR1", "TOR1"]
    }
}

variable "OFFSETS" {
    default = {
        digitalocean = 0
    }
}

variable "DO_API_TOKEN" {
  default = "@DO_API_TOKEN@"
}
