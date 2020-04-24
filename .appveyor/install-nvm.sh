#!/bin/bash -ie

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "pwd is"
pwd

cd ~

echo "downloading NVM install.sh"
wget -q https://raw.githubusercontent.com/nvm-sh/nvm/v0.35.3/install.sh

echo "running NVM install.sh"
bash install.sh
echo "NVM install.sh done" $?
