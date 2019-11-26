module "heroku_cli" {
  source  = "matti/cli-outputs/heroku"
  version = "0.0.1"
}

locals {
  heroku_email       = "${var.heroku_email == "" ? module.heroku_cli.auth_whoami : var.heroku_email}"
  heroku_api_key     = "${var.heroku_api_key == "" ? module.heroku_cli.auth_token: var.heroku_api_key}"
  heroku_organization = "${var.heroku_organization == "AUTODETECT" ? (length(module.heroku_cli.organizations) > 0 ? module.heroku_cli.organizations[0] : "") : var.heroku_organization}"
  agoric_app_name    = "${var.agoric_app_name == "" ? "ag-chain-cosmos-${var.agoric_instance}" : var.agoric_app_name}"
}

variable "heroku_email" {
    description = "Heroku e-mail login"
    default = ""
}

variable "heroku_api_key" {
    description = "Heroku API key"
    default = ""
}

variable "agoric_region" {
    description = "Heroku region"
    default = "us"
}

variable "heroku_organization" {
    description = "Team to own the app"
    default = "AUTODETECT"
}

variable "agoric_app_name" {
    description = "Name of the ag-chain-cosmos application"
    default = ""
}

variable "agoric_instance" {
    description = "Instance for differentiating ag-chain-cosmos applications"
    default = "1"
}

variable "agoric_git_url" {
    description = "The URL for building the ag-chain-cosmos application"
    default = "https://github.com/Agoric/cosmic-swingset"
}

variable "agoric_provisioner_codes" {
    description = "The Agoric Chain Cosmos Provisioner invitation codes."
}

provider "heroku" {
  version = "~> 1.9"
  email   = "${local.heroku_email}"
  api_key = "${local.heroku_api_key}"
}

provider "external" {
    version = "~> 1.1"
}

resource "heroku_app" "ag_chain_cosmos" {
  name   = "${local.agoric_app_name}"
  region = "${var.agoric_region}"

  #stack
  #buildpacks
  config_vars {
    AGORIC_PROVISIONER_CODES = "${var.agoric_provisioner_codes}"
  }

  stack = "container"
  #git_url = "${var.agoric_git_url}"

  #space
  #organization {
  #  name     = "${local.heroku_organization}"
  #  personal = "${local.heroku_organization == "" ? true : false}"
  #}
}
