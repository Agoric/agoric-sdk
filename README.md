# Agoric Javascript Smart Contract Platform

## Prerequisites

### Vagrant

To run a standardized Linux distribution with all the required development tools, you probably want [Vagrant](https://www.vagrantup.com/docs/):

```sh
vagrant up --provider=docker
# or
vagrant up --provider=virtualbox
# then
vagrant ssh
```

The Vagrant setup has synchronized filesystem access with the workspace directory on your host system, so you can use your favourite IDE to modify the files, and just run Linux commands on the SSH connection.


### Developing on the current OS

If you don't use Vagrant, you can develop on your own local operating system.

NOTE: You will need Go 1.12 or newer to run the Agoric VM.

```sh
# Install the agoric devtool.
npm install -g agoric
```

or:

```sh
# Run the agoric devtool.
npx agoric [...options]
```

## Your first Agoric Dapp

Here is a simple script for how to get started.

```sh
# Initialize your dapp project.
# Note: Change the `demo` name to something meaningful.
agoric init demo
# Go to its directory.
cd demo
# Install Javascript/Go dependencies.
agoric install
# Run the local vat machine.
agoric start
# Install your smart contract and web api (can be done separately)
agoric deploy ./contract/deploy.js ./api/deploy.js
# Navigate to http://localhost:8000/
```
