#!/bin/bash -ie

export PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"

echo "PWD was"
pwd

cd ~
echo "downloading golang installer"
wget -q https://dl.google.com/go/go1.14.2.linux-amd64.tar.gz

echo "unpacking tarball"
sudo tar -C /usr/local -xzf go1.14.2.linux-amd64.tar.gz

echo 'export PATH=$PATH:/usr/local/go/bin' >> ~/.profile

echo "golang unpacked, PATH updated"
