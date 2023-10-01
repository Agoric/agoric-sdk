# Agoric's Cosmic SwingSet

Agoric's Cosmic SwingSet enables developers to test smart contracts built with [ERTP](https://github.com/Agoric/ERTP) in various blockchain setup environments.

This repository currently hosts various pieces:
- Code to set up a **solo node** (a local peer which can host objects for testing or interaction with a blockchain)
- Code and tools to set up a testnet on your machine
- Code that runs the server-side Pixel Demo on the solo node
- Code that runs in a web browser and interacts with the server-side of the Pixel Demo


If you're coming to this repo with a [**provisioning code** from Agoric](https://testnet.agoric.com/), you can jump to the [relevant section](#with-a-provisioning-code-from-agoric).

Otherwise, you can continue to the next section to choose one of the setups for the Pixel Demo.


## Different setups to run the Pixel Demo

Running the demo requires a local solo node to serve as your access point.
In any case, for now, you will be needing to build the solo node from the source code.

### Build from source

To build and install from sources, first follow the instructions at [Before Using Agoric Software](https://agoric.com/documentation/getting-started/before-using-agoric.html) to install the Agoric SDK and its prerequisites.

You'll then need to install the following additional software:
- [Golang](https://golang.org/doc/install) (you need at least version 1.17)
- (scenarios 1 and 0) [Python3](https://www.python.org/downloads/)
- (scenarios 1 and 0) python3-venv
- (scenarios 1 only) [terraform](https://learn.hashicorp.com/terraform/getting-started/install.html)
- (scenarios 1 only) [Ansible](https://docs.ansible.com/ansible/latest/installation_guide/intro_installation.html)

Build the cosmic-swingset with:
```sh
cd agoric-sdk/packages/cosmic-swingset
npm install
npm run build
```

Add `$GOPATH/bin` (or `~/go/bin` if `GOPATH` is unset) to your shell's  `PATH`.

Test that the utilities work with:

```sh
ag-chain-cosmos --help
agd --help
```

(each should display help on the console for each tool)

### Choose a scenario

#### Scenario 3 : no testnet (develop off-chain demo)

In this scenario, you run:
- a **solo node** with the server-side Pixel Demo running and exposing an HTTP server in localhost
- a **web browser** connecting to the solo node and enabling user interaction with the Pixel Demo

No blockchain is involved.

Run:
```sh
make scenario3-setup
make scenario3-run-client
```

Objects added to `home` are created by the [vats](vats) package.

The REPL handler is in [`repl.js`](vats/src/repl.js).

The HTML frontend code is pure JS/DOM (no additional libraries yet) in the
[solo](solo) package, at
[`solo/public/index.html`](solo/public/index.html) and
[`solo/public/main.js`](solo/public/main.js).


#### Scenario 2: a single local testnet node (develop on-chain demo)

In this scenario, you run:
- one or several **solo node(s)** each exposing an HTTP server in localhost (each to a different port)
- a **single local blockchain testnet node** with the server-side Pixel Demo running
- a **web browser** connecting to each solo node via a different port and enabling user interaction with the Pixel Demo

The solo nodes communicate with the testnet node

Before using this scenario, it is recommended that you test your code with Scenario 3.

Prepare the chain and solo nodes:
```sh
make scenario2-setup BASE_PORT=8000 NUM_SOLOS=3
```

This prepare for create 3 solo nodes. Each node exposes a web server to a different port. The ports start at `8000` (`BASE_PORT`). So the solo node ports here will be `8000`, `8001` and `8002`

Start the chain:
```sh
make scenario2-run-chain
```

Wait about 5 seconds for the chain to produce its first block, then switch to another terminal:
```sh
make scenario2-run-client BASE_PORT=8000
```

You can communicate with the node by opening http://localhost:8000/

You can start other solo nodes with `make scenario2-run-client BASE_PORT=8001` and `make scenario2-run-client BASE_PORT=8002` and communicate with them respectively with on http://localhost:8001/ and http://localhost:8002/



#### Scenario 1: your own local testnet (develop testnet provisioner)

In this scenario, you run:
- a **solo node** exposing an HTTP server in localhost
- a **several local blockchain testnet nodes** with the server-side Pixel Demo running on top.
- a **web browser** connecting to the solo node and enabling user interaction with the Pixel Demo

This scenario is only useful for moving toward deploying the local source code as a new testnet. Before using this scenario, you should test your on-chain code under Scenario 2.

```sh
make scenario1-setup
make scenario1-run-chain
```

Wait until the bootstrap produces a provisioning server URL and visit it.  Then run in another terminal:

```sh
make scenario1-run-client
```

See [Testnet Tutorial](#testnet-tutorial) for more guidance.

#### Scenario 0: a public testnet (kick the tires)

In this scenario, you run:
- a **solo node** exposing an HTTP server in localhost
- a **web browser** connecting to the solo node and enabling user interaction with the Pixel Demo

This scenario assumes your solo node can access a **blockchain running on the Internet**

To run the solo node using the current directory's source code against a public testnet, use:
```
$ make scenario0-setup
$ make scenario0-run-client
```

Alternatively, running the solo node from a Docker image and no local source code is described in the [Testnet Tutorial](#testnet-tutorial).

Now go to http://localhost:8000/ to interact with your new solo node.

Learn more about ERTP [here](https://agoric.com/documentation/ertp/guide/).

### Initial Endowments

When a client is started up, it has a few items in a record named `home`.
* sharingService: a service that makes it possible to pass capabilities between vats
* localTimerService and chainTimerService: tools for scheduling
* [zoe](https://agoric.com/documentation/zoe/guide/): support for contracts with Offer-Safety Enforcement
* [contractHost](https://github.com/Agoric/Documentation): secure smart contracts

#### sharingService

home.sharingService is a service that lets you connect to
other vats that are connected to the same remote chain vat. sharingService
has three methods: createSharedMap(name), grabSharedMap(name), and
validate(sharedMap). These allow you to create a SharedMap which you can
use to pass items to and from another vat. The sharingService's
methods are designed to allow you to share a newly created sharedMap
with one other vat, after which the name can't be reused.

The way to use it is to call createSharedMap() with a name that you share
with someone else. They then call grabSharedMap() and pass the name you
gave. If they get a valid SharedMap, then you have a private
channel. If they don't get it, then someone else must have tried to
grab the name first, and you can discard that one and try again.

Once you each have an end, either of you can call addEntry(key, value)
to store an object, which the other party can retrieve with
lookup(key).

#### canvasStatePublisher

home.canvasStatePublisher has a subscribe() method, which takes a callback
function. When the state of the pixel gallery changes, the callback's
notify() method is called with the new state.

## Testnet Tutorial

The `ag-setup-cosmos` tool is used to manage testnets.  Unless you are developing `ag-setup-cosmos` (whose sources are in the `setup` directory), you should use the Docker scripts in the first section and a working Docker installation since `ag-setup-cosmos` only works under Linux with Terraform 0.11 and Ansible installed.

### Docker images

If you are not running on Linux, you will need to use Docker to provide the setup environment needed by the provisioning server and testnet nodes.

If you want to install the Docker image scripts on this machine, run:

```sh
$ sudo make docker-install
```

Otherwise, the scripts are in the `docker` subdirectory.

You can find the images at [Docker Hub](https://hub.docker.com/r/agoric/cosmic-swingset)

### Bootstrapping

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

## With a provisioning code from Agoric

You can request a public testnet provisioning code from https://testnet.agoric.com/

Once you have received the code run:
```sh
SOLO_NAME=han ./docker/ag-setup-solo --pull
```

where `han` is the name of your solo vat machine that follows the blockchain.

This command will prompt you for the testnet provisioning code.

Then connect to http://localhost:8000.

If you don't have a provisioning code, or otherwise want to run the demo from the code in this directory,
read [about the scenarios](#choose-a-scenario).



# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).
