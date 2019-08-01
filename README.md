# Agoric's Cosmic SwingSet

TL;DR: Ask for a public testnet provisioning code, then run:

```
$ SOLO_NAME=han ./docker/ag-setup-solo --pull
```

where `han` is the name of your solo vat machine that follows the blockchain.

Then connect to http://localhost:8000 and go to the [Gallery Demo](#gallery-pixel-demo) section.

If you don't have a provisioning code, or otherwise want to run the demo from the code in this directory,
read [the next section](#different-scenarios).

## Different scenarios

Running the demo requires a local solo node to serve as your access point.

These are the main
configuration scenarios for how that solo node interacts with a testnet:

**[You will need to [build this repository from source](#build-from-source) before the commands in this section work.
]**

<details>
  <summary>Scenario 0: a public testnet (kick the tires)</summary>

  To run the solo node using the current directory's source code against a public testnet, use:
  ```
  $ make scenario0-setup
  $ make scenario0-run-client
  ```

  Alternatively, running the solo node from a Docker image and no local source code is described in the [top section](#agorics-cosmic-swingset).  
</details>
<details>
  <summary>Scenario 1: your own local testnet (develop testnet provisioner)</summary>

  This scenario is only useful for moving toward deploying the local source code as a new testnet.  Before using this scenario, you should test your on-chain code under Scenario 2.
  
  ```
  make scenario1-setup
  make scenario1-run-chain
  ```

  Wait until the bootstrap produces a provisioning server URL and visit it.  Then run in another terminal:

  ```
  make scenario1-run-client
  ```

  See [Testnet Tutorial](#testnet-tutorial) for more guidance.
</details>
<details>
  <summary>Scenario 2: a single local testnet node (develop on-chain demo)</summary>

  Before using this scenario, you should test your off-chain code under Scenario 3.

  Run:
  ```
  $ make scenario2-setup
  $ make scenario2-run-chain
  ```
  Wait about 5 seconds for the chain to produce its first block, then switch to another terminal:
  ```
  $ make scenario2-run-client
  ```
  
</details>
<details>
  <summary>Scenario 3: no testnet (develop off-chain demo)</summary>

  Test the demo code without interacting with a blockchain.

  Run:
  ```
  $ make scenario3-setup
  $ make scenario3-run-client
  ```

  The `lib/ag-solo/vats/` directory contains the source code for all the Vats
created in the solo vat-machine. The actual filenames are enumerated in
`lib/ag-solo/init-basedir.js`, so if you add a new Vat, be sure to add it to
`init-basedir.js` too.

The objects added to `home` are created in `lib/ag-solo/vats/bootstrap.js`.

The REPL handler is in `lib/ag-solo/vats/vat-http.js`.

The HTML frontend code is pure JS/DOM (no additional libraries yet), in
`lib/ag-solo/html/index.html` and `lib/ag-solo/html/main.js`.

</details>

Now go to https://localhost:8000/ to interact with your new solo node.

# Gallery Pixel Demo

In this Gallery Demo, the goal is to be able to create designs in a
pixel canvas. You start with access to the gallery and a handful of
methods that allow you to obtain pixels, color them, and buy or sell
pixels. 

To access the gallery, type `home.gallery` in the REPL. `home.gallery` is a
Presence. In the SwingSet environment, Presences are remote references to objects on
other vats. To invoke them, use the [proposed infix bang](https://github.com/Agoric/proposal-infix-bang). For example, the
first thing you might want to do is tap the gallery faucet to get a
pixel for free: 

```js
home.gallery!tapFaucet()
```

This returns a presence for the pixel that you receive from the
faucet and saves it under `history[0]`.

To color the pixel, we need to split the pixel into "transfer" and
"use" rights. The right to use the pixel means that you can color it,
and we'll be using it to color. 

The following commands show a pixel being obtained from the faucet,
being split into transfer and use rights, coloring the pixel by
using the 'use' right, and selling a pixel to the gallery through a
escrow smart contract.  

```
home.gallery!tapFaucet()
home.gallery!split(history[0])
history[1].useRightPayment
home.gallery!changeColor(history[2], '#FF69B4')
home.gallery!tapFaucet()
history[4]!getBalance()
home.gallery!pricePixelAmount(history[5])
home.gallery!sellToGallery(history[5])
history[7].inviteP
history[7].host
history[9]!redeem(history[8])
history[10]!offer(history[4])
home.gallery!getIssuers()
history[12].pixelIssuer
history[12].dustIssuer
history[13]!makeEmptyPurse()
history[14]!makeEmptyPurse()
home.gallery!collectFromGallery(history[10], history[16], history[15], 'my escrow')
```

# Build from source

You can browse the current source tree at [Github](https://github.com/Agoric/cosmic-swingset)

If you want to build and install from sources, you need Node.js 11 and Golang 1.12:

```
$ npm install
```

Make symbolic links somewhere in your `$PATH` (such as `/usr/local/bin`) as below: 

```
ln -s $PWD/lib/ag-chain-cosmos /usr/local/bin/
```

If installing the GO language didn't setup a `$GOPATH` variable,
you'll need to find the directory and set the variable. Typically
```
GOPATH="$HOME/go"
```

Then do
```
ln -s $GOPATH/bin/ag-cosmos-helper /usr/local/bin/
```

Test that the links work with:

```
$ ag-chain-cosmos --help
$ ag-cosmos-helper --help
```

# Testnet Tutorial

The `ag-setup-cosmos` tool is used to manage testnets.  Unless you are developing `ag-setup-cosmos` (whose sources are in the `setup` directory), you should use the Docker scripts in the first section and a working Docker installation since `ag-setup-cosmos` only works under Linux with Terraform 0.11 and Ansible installed.

## Docker images

If you are not running on Linux, you will need to use Docker to provide the setup environment needed by the provisioning server and testnet nodes.

If you want to install the Docker image scripts on this machine, run:

```
$ sudo make docker-install
```

Otherwise, the scripts are in the `docker` subdirectory.

You can find the images at [Docker Hub](https://hub.docker.com/r/agoric/cosmic-swingset)

## Bootstrapping

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

# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).

