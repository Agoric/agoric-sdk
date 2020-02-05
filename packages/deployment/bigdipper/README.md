# Agoric Big Dipper setup

```sh
# On a new Debian-like machine
apt update
apt -y upgrade

# Create a Big Dipper user
adduser bigdipper

# Become that user
su bigdipper

# Clone the forked Big Dipper repo
git clone https://github.com/agoric-labs/big_dipper
cd big_dipper

# Follow the instructions in the README

# Copy the contents of this directory to the user.
curl https://codeload.github.com/Agoric/agoric-sdk/tar.gz/master | \
  tar -xz --strip=4 agoric-sdk-master/packages/deployment/bigdipper

# TODO: Describe installing the files in the right places and starting services.
```
