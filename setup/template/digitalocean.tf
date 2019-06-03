module "digitalocean" {
  source           = "@SETUP_DIR@/terraform/digitalocean"
  CLUSTER_NAME     = "${var.NETWORK_NAME}-digitalocean"
  OFFSET           = "${var.OFFSETS["digitalocean"]}"
  REGIONS          = "${var.REGIONS["digitalocean"]}"
  SSH_KEY_FILE     = "${var.SSH_KEY_FILE}"
  DO_API_TOKEN     = "${var.DO_API_TOKEN}"
  SERVERS          = "${length(var.REGIONS["digitalocean"])}"
}
