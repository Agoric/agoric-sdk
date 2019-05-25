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

When you're done with the aliases, you can delete them with:
```
unalias ssd sscli
```

# Tutorial

After you have either installed the Docker scripts or built from scratch and set your shell aliases, you can try the following to start your own testnet and interact with it.

First, configure the Agoric validator and CLI tool:

```
# Initialize configuration files and genesis file
ssd init --chain-id agchain

# Copy the `Address` output here and save it for later use 
# [optional] add "--ledger" at the end to use a Ledger Nano S 
sscli keys add jack

# Copy the `Address` output here and save it for later use
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

Go to a different terminal, and start the testnet run:
```
ssd start
```

Run commands against the network you have just created:
```
# First check the accounts to ensure they have funds
sscli query account $(sscli keys show jack -a) 
sscli query account $(sscli keys show alice -a) 

# Buy your first name using your coins from the genesis file
sscli tx swingset buy-name jack.id 5agtoken --from jack 

# Set the value for the name you just bought
sscli tx swingset set-name jack.id my-name.local --from jack 

# Try out a resolve query against the name you registered
sscli query swingset resolve jack.id
# > MY-NAME.LOCAL

# Try out a whois query against the name you just registered
sscli query swingset whois jack.id
# > {"value":"MY-NAME.LOCAL","owner":"cosmos1l7k5tdt2qam0zecxrx78yuw447ga54dsmtpk2s","price":[{"denom":"agtoken","amount":"5"}]}

# Alice buys name from jack
sscli tx swingset buy-name jack.id 10agtoken --from alice 
```

**Congratulations, you are running the Agoric testnet!**

# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).

