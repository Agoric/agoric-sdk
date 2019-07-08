# Agoric's Cosmic SwingSet

TL;DR: Browse to a public testnet provisioning page, then run:

```
$ SOLO_NAME=han ./docker/ag-setup-solo --pull
```

where `han` is the name of your solo vat machine that follows the blockchain.

## Docker images

If you want to use Docker images globally, run:

```
$ sudo make docker-install
```

Otherwise, the scripts are in the `docker` subdirectory.

You can find the images at [Docker Hub](https://hub.docker.com/r/agoric/cosmic-swingset)

# Testnet Tutorial

The `ag-setup-cosmos` tool is used to manage testnets.  Unless you are developing `ag-setup-cosmos` (whose sources are in the `setup` directory), you should use the Docker scripts in the first section and a working Docker installation since `ag-setup-cosmos` only works under Linux with Terraform 0.11 and Ansible installed.

```
# Fill out the node placement options, then go for coffee while it boots.
# Note: Supply --bump={major|minor|revision} if you want to increment the
# version number.
ag-setup-cosmos bootstrap

# Wait a long time while the nodes bootstrap and begin publishing blocks.
# If there is an error, bootstrap is idempotent (i.e. you can rerun
# ag-setup-cosmos bootstrap
# and it will pick up where it left off).
```

**Congratulations, you are running the Agoric testnet!**

Now, browse to your node0's IP address, port 8001 (which is running your testnet provisioner).
You should see your testnet's parameters, and an option to request a provisioning code.  Follow
the instructions to add your own node!

```
# If you need to run a shell command on all nodes:
ag-setup-cosmos run all hostname

# or just the first node:
ag-setup-cosmos run node0 hostname

# Reconfigure the chain and provisioner for a new ID with incremented suffix
ag-setup-cosmos bootstrap --bump

# Unprovision the testnet deployment, but do not require reinitialization.
# Will prompt you for confirmation.
ag-setup-cosmos destroy
```

## Build from source

You can browse the current source tree at [Github](https://github.com/Agoric/cosmic-swingset)

If you want to build and install from sources, you need Node.js 11 and Golang 1.12:

```
$ make
$ npm install
```

Make shell aliases as below.  Note that the `$PWD` variable must be
the absolute path to the current cosmic-swingset directory:

```
alias ag-chain-cosmos=$PWD/lib/ag-chain-cosmos
```
If installing the GO language didn't setup a `$GOPATH` variable,
you'll need to find the directory and set the variable. Typically
```
GOPATH="$HOME/go"
```
Then do
```
alias ag-cosmos-helper=$GOPATH/bin/ag-cosmos-helper
```

Test that the aliases work with:

```
$ ag-chain-cosmos --help
$ ag-cosmos-helper --help
```

# Agoric Cosmos Chain Development Tutorial

After you have either installed the Docker scripts or built from scratch and set your shell aliases, you can try the following to start your own testnet and interact with it.

First, configure the Agoric validator and CLI tool:

```
# Initialize configuration files and genesis file
ag-chain-cosmos init --chain-id agoric

# Copy the `Address` output here and save it for later use 
# [optional] add "--ledger" at the end to use a Ledger Nano S 
# Save password and recovery keys if you want.
ag-cosmos-helper keys add jack

# Copy the `Address` output here and save it for later use
# Save password and recovery keys if you want.
ag-cosmos-helper keys add alice

# Add both accounts, with coins, to the genesis file
ag-chain-cosmos add-genesis-account $(ag-cosmos-helper keys show jack -a) 1000agtoken,1000jackcoin
ag-chain-cosmos add-genesis-account $(ag-cosmos-helper keys show alice -a) 1000agtoken,1000alicecoin

# Configure your CLI to eliminate need for chain-id flag
ag-cosmos-helper config chain-id agoric
ag-cosmos-helper config output json
ag-cosmos-helper config indent true
ag-cosmos-helper config trust-node true
```

Go to a different terminal (make sure your shell aliases are installed first), and start the testnet with:
```
ag-chain-cosmos start
```

Go back to the old terminal and run commands against the network you have just created:
```
# First check the accounts to ensure they have funds
ag-cosmos-helper query account $(ag-cosmos-helper keys show jack -a) 
ag-cosmos-helper query account $(ag-cosmos-helper keys show alice -a) 

# Relay a message on behalf of Alice
ag-cosmos-helper tx swingset deliver alice --from jack '[[[0,"{\"target\":{\"type\":\"your-egress\",\"id\":1},\"methodName\":\"getIssuer\",\"args\":[],\"slots\":[],\"resultSlot\":{\"type\":\"your-resolver\",\"id\":1}}"]], 0]'

# Look at Bob's outbound mailbox
ag-cosmos-helper query swingset mailbox bob
```

# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).

