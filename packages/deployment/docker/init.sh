#! /bin/bash

set -ueo pipefail

# Move our ssh config to the /data directory, so that it can be persisted
# between invocations but with different host keys between separate instances.
if test ! -L /etc/ssh; then
  mkdir -p /data
  if test ! -d /data/ssh; then
    # Copy the existing ssh config to /data/ssh.
    cp -a /etc/ssh /data/ssh
  fi

  # Redirect the config dir to /data/ssh.
  mv /etc/ssh /etc/ssh.orig
  ln -s /data/ssh /etc/

  # Generate fresh host keys if missing.
  dpkg-reconfigure -f teletype openssh-server
fi

exec /usr/bin/systemctl ${1+"$@"}
