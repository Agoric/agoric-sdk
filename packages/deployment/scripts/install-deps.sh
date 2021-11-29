#! /bin/bash
set -e

# Install Terraform.
TERRAFORM_VERSION=0.11.14

UNAME_S=$(uname -s | tr A-Z a-z)

case $UNAME_S in
*) TERRAFORM_OS=$UNAME_S ;;
esac

UNAME_M=$(uname -m)
case $UNAME_M in
x86_64) TERRAFORM_ARCH=amd64 ;;
*) TERRAFORM_ARCH=$UNAME_M ;;
esac

TERRAFORM_RELEASE=terraform_${TERRAFORM_VERSION}_${TERRAFORM_OS}_${TERRAFORM_ARCH}
curl https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/${TERRAFORM_RELEASE}.zip > terraform.zip && \
    unzip -od /usr/local/bin/ terraform.zip && rm -f terraform.zip

if test -d /etc/apt; then
  # Install Ansible.
  echo 'deb http://ppa.launchpad.net/ansible/ansible/ubuntu trusty main' >> /etc/apt/sources.list && \
      apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367 && \
      apt-get update --allow-releaseinfo-change -y && \
      apt-get install -y ansible rsync curl sudo gnupg2 jq && \
      apt-get clean -y
elif test "$UNAME_S" == darwin; then
  # Install Ansible.
  brew update && \
      brew install ansible rsync curl gnupg2 jq && \
      brew cleanup
else
  echo "Don't know how to install Ansible, so I'm skipping..."
  exit 1
fi
