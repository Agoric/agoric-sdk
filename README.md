# Agoric's Cosmic SwingSet

## Docker images

To test on a local Docker instance, use:

```
$ sudo make docker-install
$ ssd --help
$ sscli --help
```

You can find the images at [Docker Hub](https://cloud.docker.com/u/agoric/repository/docker/agoric/cosmic-swingset)

## Build from source

You can browse the current source tree at [Github](https://github.com/Agoric/cosmic-swingset)

If you want to build and install from sources, you need Node.js 11 and Golang 1.12:

```
$ make
$ npm install
```

Make shell aliases for `ssd` and `sscli`.  Note that the `$PWD` variable must be the absolute path to the current cosmic-swingset directory:

```
alias ssd=$PWD/lib/node-ssd
alias sscli=$GOPATH/bin/sscli
```

Test that the aliases work with:

```
$ ssd --help
$ sscli --help
```

# Tutorial

After you have either installed the Docker scripts or built from scratch and set your shell aliases, you can try the following to start your own testnet and interact with it.

First, configure the Agoric validator and CLI tool:

```
# Initialize configuration files and genesis file
ssd init --chain-id agchain

# Copy the `Address` output here and save it for later use 
# [optional] add "--ledger" at the end to use a Ledger Nano S 
# Save password and recovery keys if you want.
sscli keys add jack

# Copy the `Address` output here and save it for later use
# Save password and recovery keys if you want.
sscli keys add alice

# Add both accounts, with coins to the genesis file
ssd add-genesis-account $(sscli keys show jack -a) 1000agtoken,1000jackcoin
ssd add-genesis-account $(sscli keys show alice -a) 1000agtoken,1000alicecoin

# Configure your CLI to eliminate need for chain-id flag
sscli config chain-id agchain
sscli config output json
sscli config indent true
sscli config trust-node true
```

Go to a different terminal (make sure your shell aliases are installed first), and start the testnet run:
```
ssd start
```

Go back to the old terminal and run commands against the network you have just created:
```
# First check the accounts to ensure they have funds
sscli query account $(sscli keys show jack -a) 
sscli query account $(sscli keys show alice -a) 

# Relay a message on behalf of Alice
# TODO: Use a valid message set and ack for demo1
sscli tx swingset deliver alice '[[], 1]' --from jack --fees 1agtoken

# Look at Bob's the outbound mailbox
sscli query swingset mailbox bob
```

**Congratulations, you are running the Agoric testnet!**

# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).

