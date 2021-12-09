#! /bin/bash
set -ueo pipefail

# Install Terraform.
TERRAFORM_VERSION=0.11.14

uname_s=$(uname -s | tr '[:upper:]' '[:lower:]')

case $uname_s in
*) TERRAFORM_OS=$uname_s ;;
esac

uname_m=$(uname -m)
case $uname_m in
x86_64) TERRAFORM_ARCH=amd64 ;;
*) TERRAFORM_ARCH=$uname_m ;;
esac

TERRAFORM_RELEASE=terraform_${TERRAFORM_VERSION}_${TERRAFORM_OS}_${TERRAFORM_ARCH}
TERRAFORM_URL=https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/${TERRAFORM_RELEASE}.zip

# Extract, then delete temporary file.
(
  trap 'echo "Removing $terraform_zip"; rm -f "$terraform_zip"' EXIT
  terraform_zip=$(mktemp -t terraformXXXXXX)
  curl "$TERRAFORM_URL" > "$terraform_zip"
  unzip -od /usr/local/bin/ "$terraform_zip"
)

# Install Ansible.
if test -d /etc/apt; then
  echo 'deb http://ppa.launchpad.net/ansible/ansible/ubuntu trusty main' >> /etc/apt/sources.list
  apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367
  apt-get update --allow-releaseinfo-change -y
  apt-get install -y ansible rsync curl sudo gnupg2 jq
  apt-get clean -y
elif test "$uname_s" == darwin; then
  brew update
  brew install ansible rsync curl gnupg2 jq
  brew cleanup
else
  echo "Don't know how to install Ansible, so I'm skipping..."
  exit 1
fi
