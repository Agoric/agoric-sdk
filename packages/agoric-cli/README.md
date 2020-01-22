# Agoric Javascript Smart Contract Platform

## Prerequisites

### Use as part of Agoric SDK

If you have cloned the Agoric SDK, you can use the Agoric CLI directly.

```sh
export AGORIC="$PWD/bin/agoric --sdk"
```

### Install from NPM

NOTE: This doesn't work right now due to missing published packages.

You will need a local installation of Node.js, at least version 11.

```sh
# Install the agoric devtool from NPM.
npm install -g agoric
export AGORIC=agoric
```

or:

```sh
# Run the agoric devtool from NPM directly.
export AGORIC='npx agoric'
```

## Your first Agoric Dapp

Here is a simple script for how to get started.

```sh
# Initialize your dapp project.
# Note: Change the `demo` name to something meaningful.
$AGORIC init demo
# Go to its directory.
cd demo
# Install Javascript dependencies.
$AGORIC install
# Run the local vat machine.
$AGORIC start
# Install your smart contract and web api (can be done separately)
$AGORIC deploy ./contract/deploy.js ./api/deploy.js
# Navigate to http://localhost:8000/
```
