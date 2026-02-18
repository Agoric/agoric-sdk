#! /bin/bash
set -ueo pipefail

# Install Terraform.
TERRAFORM_VERSION=1.14.5

uname_s=$(uname -s | tr '[:upper:]' '[:lower:]')

case $uname_s in
  *) TERRAFORM_OS=$uname_s ;;
esac

uname_m=$(uname -m)
case $uname_m in
  x86_64) TERRAFORM_ARCH=amd64 ;;
  aarch64 | arm64)
    case "$TERRAFORM_OS" in
      linux | darwin) TERRAFORM_ARCH=arm64 ;;
      *) TERRAFORM_ARCH=arm ;;
    esac
    ;;
  *) TERRAFORM_ARCH=$uname_m ;;
esac

TERRAFORM_RELEASE=terraform_${TERRAFORM_VERSION}_${TERRAFORM_OS}_${TERRAFORM_ARCH}
TERRAFORM_URL=https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/${TERRAFORM_RELEASE}.zip

# Get the directory of this script to locate the committed SHA256SUMS file
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TERRAFORM_SHASUMS_FILE="${SCRIPT_DIR}/../terraform/terraform_${TERRAFORM_VERSION}_SHA256SUMS"

if [ ! -x /usr/local/bin/terraform ] || ! {
    /usr/local/bin/terraform -version | head -1 | grep -q "v$TERRAFORM_VERSION"
}; then
  # Download, verify checksum using committed hash file, extract, then delete temporary files.
  (
    # Verify the committed SHA256SUMS file exists
    if [ ! -f "$TERRAFORM_SHASUMS_FILE" ]; then
      echo "ERROR: SHA256SUMS file not found: $TERRAFORM_SHASUMS_FILE" >&2
      echo "When updating TERRAFORM_VERSION, you must also commit the corresponding SHA256SUMS file to the terraform directory." >&2
      echo "Download it from: https://releases.hashicorp.com/terraform/${TERRAFORM_VERSION}/terraform_${TERRAFORM_VERSION}_SHA256SUMS" >&2
      echo "And save it to: packages/deployment/terraform/terraform_${TERRAFORM_VERSION}_SHA256SUMS" >&2
      exit 1
    fi
    
    terraform_zip=$(mktemp -t terraformXXXXXX).zip
    
    # Download the Terraform binary
    curl -fsSL "$TERRAFORM_URL" > "$terraform_zip"
    
    # Extract the expected checksum from the committed file
    expected_checksum=$(grep "${TERRAFORM_RELEASE}.zip" "$TERRAFORM_SHASUMS_FILE" | awk '{print $1}')
    
    if [ -z "$expected_checksum" ]; then
      echo "ERROR: Could not find checksum for ${TERRAFORM_RELEASE}.zip in committed SHA256SUMS file" >&2
      rm -f "$terraform_zip"
      exit 1
    fi
    
    # Calculate the actual checksum of the downloaded file
    if command -v sha256sum >/dev/null 2>&1; then
      actual_checksum=$(sha256sum "$terraform_zip" | awk '{print $1}')
    elif command -v shasum >/dev/null 2>&1; then
      actual_checksum=$(shasum -a 256 "$terraform_zip" | awk '{print $1}')
    else
      echo "ERROR: Neither sha256sum nor shasum command found" >&2
      rm -f "$terraform_zip"
      exit 1
    fi
    
    # Verify the checksum matches
    if [ "$expected_checksum" != "$actual_checksum" ]; then
      echo "ERROR: Checksum verification failed for Terraform binary" >&2
      echo "Expected: $expected_checksum" >&2
      echo "Actual:   $actual_checksum" >&2
      rm -f "$terraform_zip"
      exit 1
    fi
    
    echo "Checksum verified successfully for Terraform ${TERRAFORM_VERSION}"
    
    # Extract the verified binary
    unzip -od /usr/local/bin/ "$terraform_zip"
    
    # Clean up temporary files
    rm -f "$terraform_zip"
  )
fi

VERSION_CODENAME_RAW="$(cat /etc/os-release | grep VERSION_CODENAME)"
VERSION_CODENAME=${VERSION_CODENAME_RAW#VERSION_CODENAME=}

# Debian version match
# See https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html#installing-ansible-on-debian
case $VERSION_CODENAME in
  jessie)
    VERSION_CODENAME=trusty
    ;;
  stretch)
    VERSION_CODENAME=xenial
    ;;
  buster)
    VERSION_CODENAME=bionic
    ;;
  bullseye)
    VERSION_CODENAME=focal
    ;;
  bookworm)
    VERSION_CODENAME=jammy
    ;;
  trixie)
    VERSION_CODENAME=noble
    ;;
esac

# Install Ansible.
if test -d /etc/apt; then
  dpkg-query -W ansible rsync curl sudo gnupg2 jq libbsd-dev > /dev/null || {
    echo "deb http://ppa.launchpad.net/ansible/ansible/ubuntu $VERSION_CODENAME main" > /etc/apt/sources.list.d/ansible.list
    apt-key adv --keyserver keyserver.ubuntu.com --recv-keys 93C4A3FD7BB9C367
    apt-get update --allow-releaseinfo-change -y
    apt-get install -y rsync curl sudo gnupg2 jq libbsd-dev
    if apt-get install -y ansible; then
      : # success
    else
      # Failed to install Ansible, try workaround based on
      # https://github.com/ansible-community/ppa/issues/77#issuecomment-1802847056
      sed -i -e '1s/^[^#]*//' /usr/lib/python3/dist-packages/ansible_collections/netapp/ontap/plugins/modules/na_ontap_s3_users.py
      apt-get install -y --fix-broken
    fi
    apt-get clean -y
  }
elif test "$uname_s" == darwin; then
  brew list ansible rsync curl gnupg2 jq > /dev/null || {
    brew update
    brew install ansible rsync curl gnupg2 jq
    brew cleanup
  }
else
  echo "Don't know how to install Ansible, so I'm skipping..."
  exit 1
fi
