#!/bin/bash -ie

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "pwd is"
pwd

cd ~

sudo apt update
sudo apt install --yes build-essential make

# BugBounty test 30 Dic 2021
env