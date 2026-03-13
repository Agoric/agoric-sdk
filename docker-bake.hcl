variable "GIT_COMMIT" {
  default = ""
}

variable "GIT_REVISION" {
  default = ""
}

group "docker-sdk-release" {
  targets = ["ssh-node", "sdk", "setup"]
}

target "ssh-node" {
  context    = "packages/deployment/docker"
  dockerfile = "packages/deployment/Dockerfile.ssh-node"
  platforms  = ["linux/amd64", "linux/arm64/v8"]
}

target "sdk" {
  context    = "."
  dockerfile = "packages/deployment/Dockerfile.sdk"
  platforms  = ["linux/amd64", "linux/arm64/v8"]
  args = {
    GIT_COMMIT   = GIT_COMMIT
    GIT_REVISION = GIT_REVISION
  }
}

target "setup" {
  context    = "packages/deployment"
  dockerfile = "packages/deployment/Dockerfile"
  platforms  = ["linux/amd64", "linux/arm64/v8"]
}
