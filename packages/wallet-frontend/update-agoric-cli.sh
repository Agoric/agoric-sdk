#! /bin/sh
awb=../agoric-cli/agoric-wallet-build
set -xe
yarn build
git rm -rf "$awb"
rm -rf "$awb"
cp -r build "$awb"
git add "$awb"
