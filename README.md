# Agoric's Cosmic SwingSet

## Docker images

To test on a local Docker instance, use:

```
$ sudo make docker-install
$ ag-chain-cosmos --help
$ ag-cosmos-helper --help
```

You can find the images at [Docker Hub](https://cloud.docker.com/u/agoric/repository/docker/agoric/cosmic-swingset)

## Build from source

You can browse the current source tree at [Github](https://github.com/Agoric/cosmic-swingset)

If you want to build and install from sources, you need Node.js 11 and Golang 1.12:

```
$ make
$ npm install
```

Make shell aliases for `ag-chain-cosmos` and `ag-cosmos-helper`.  Note that the `$PWD` variable must be the absolute path to the current cosmic-swingset directory:

```
alias ag-chain-cosmos=$PWD/lib/node-ag-chain-cosmos
alias ag-cosmos-helper=$GOPATH/bin/ag-cosmos-helper
```

Test that the aliases work with:

```
$ ag-chain-cosmos --help
$ ag-cosmos-helper --help
```

# Tutorial

After you have either installed the Docker scripts or built from scratch and set your shell aliases, you can try the following to start your own testnet and interact with it.

First, configure the Agoric validator and CLI tool:

```
# Initialize configuration files and genesis file
ag-chain-cosmos init --chain-id agchain

# Copy the `Address` output here and save it for later use 
# [optional] add "--ledger" at the end to use a Ledger Nano S 
# Save password and recovery keys if you want.
ag-cosmos-helper keys add jack

# Copy the `Address` output here and save it for later use
# Save password and recovery keys if you want.
ag-cosmos-helper keys add alice

# Add both accounts, with coins to the genesis file
ag-chain-cosmos add-genesis-account $(ag-cosmos-helper keys show jack -a) 1000agtoken,1000jackcoin
ag-chain-cosmos add-genesis-account $(ag-cosmos-helper keys show alice -a) 1000agtoken,1000alicecoin

# Configure your CLI to eliminate need for chain-id flag
ag-cosmos-helper config chain-id agchain
ag-cosmos-helper config output json
ag-cosmos-helper config indent true
ag-cosmos-helper config trust-node true
```

Go to a different terminal (make sure your shell aliases are installed first), and start the testnet run:
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

# Look at Bob's the outbound mailbox
ag-cosmos-helper query swingset mailbox bob

# Start the REST server
ag-cosmos-helper rest-server &

# Get the sequence and account numbers for jack to construct the below requests
$ curl -s http://localhost:1317/auth/accounts/$(ag-cosmos-helper keys show jack -a)
# > {"type": "auth/Account","value":{"address": "cosmos1nzezs2twwwa4zrsjhqznqxw4qgjux9t46nlpp0","coins":[{"denom": "agtoken","amount": "998"},{"denom":"jackcoin","amount":"1000"}],"public_key":{"type":"tendermint/PubKeySecp256k1","value": "AxbAggtxje/u7U09mVl9Te5Wyvuo/TSXGBW2PDFs/his"},"account_number":"0","sequence":"8"}}

# Send another message on behalf of Alice
$ curl -XPOST -s http://localhost:1317/swingset/mailbox --data-binary '{"base_req":{"from":"cosmos1nzezs2twwwa4zrsjhqznqxw4qgjux9t46nlpp0","password":"hello123","chain_id":"agchain","sequence":"9","account_number":"0"},"peer":"alice","submitter":"cosmos1nzezs2twwwa4zrsjhqznqxw4qgjux9t46nlpp0","deliver":"[[[1,\"foo\"],[2,\"bar\"]],123]"}'

# Query Bob's mailbox
$ curl -s http://localhost:1317/swingset/mailbox/bob
# > {"value":"[[], 0]"}
```

**Congratulations, you are running the Agoric testnet!**

# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).

