#!/bin/bash -ie

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "pwd is"
pwd

cd ~

echo "running nvm current"
nvm current

echo "running nvm use v13.11.0"
nvm install v13.11.0

nvm use v13.11.0

echo "running nvm current"
nvm current
