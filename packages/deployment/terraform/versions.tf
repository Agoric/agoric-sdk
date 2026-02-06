
terraform {
  required_version = ">= 0.13"
  required_providers {
    heroku = {
      source = "heroku/heroku"
    }
    external = {
      source = "hashicorp/external"
    }
    docker = {
      source = "kreuzwerker/docker"
      version = "~> 2.25.0"
    }
    digitalocean = {
      version = "~> 2.75.0"
      source = "-/digitalocean"
    }
  }
}
