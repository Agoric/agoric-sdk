
terraform {
  required_version = ">= 0.13"
  required_providers {
    heroku = {
      source = "heroku/heroku"
      version = "~> 5.0"
    }
    external = {
      source = "hashicorp/external"
      version = "~> 2.0"
    }
    docker = {
      source = "kreuzwerker/docker"
      version = "~> 2.25.0"
    }
    digitalocean = {
      version = "~> 2.75.0"
      source = "digitalocean/digitalocean"
    }
  }
}
