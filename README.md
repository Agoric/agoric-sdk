# Agoric's Cosmic SwingSet

Agoric's Cosmic SwingSet enables developers to test smart contracts build with [ERTP](https://github.com/Agoric/ERTP) in various blockchain setup environments

This repository currently hosts various pieces:
- Code to set up a **solo node** (a local peer which can host objects for testing or interaction with a blockchain)
- Code and tools to set up a testnet on your machine
- Code that runs the server-side Pixel Demo on the solo node
- Code that runs in a web browser and interacts with the server-side of the Pixel Demo


If you're coming to this repo with a **provisioning code** from Agoric, you can jump to the [relevant section](#with-a-provisioning-code-from-agoric)

Otherwise, you can continue to the next section to choose one of the setups for the Pixel Demo


## Different setups to run the Pixel Demo

Running the demo requires a local solo node to serve as your access point\
In any case, for now, you will be needing to build the solo node from the source code

### Build from source

If you want to build and install from sources, you need to install
- [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git)
- [node.js](https://nodejs.org/en/) (you need at least version 11). This installs 2 binaries named `node` (JavaScript runtime) and `npm` (JavaScript package manager)
- [Golang](https://golang.org/doc/install) (you need at least version 1.12)

```sh
git clone git@github.com:Agoric/cosmic-swingset.git
cd cosmic-swingset
npm install
npm run build
```

Make symbolic links somewhere in your `$PATH` (such as `/usr/local/bin`) as below: 

```sh
ln -s $PWD/lib/ag-chain-cosmos /usr/local/bin/
```

If installing the GO language didn't setup a `$GOPATH` variable,
you'll need to find the directory and set the variable. Typically
```sh
GOPATH="$HOME/go"
```

Then do
```sh
ln -s $GOPATH/bin/ag-cosmos-helper /usr/local/bin/
```

Test that the links work with:

```sh
ag-chain-cosmos --help
ag-cosmos-helper --help
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

[`lib/ag-solo/vats/vat-demo.js`](lib/ag-solo/vats/vat-demo.js) contains the code running a vat with the Pixel Gallery Demo.

Also, as part of `make scenario3-setup`, `bin/ag-solo init <directory>` get called and all the content of the [`vats`](lib/ag-solo/vats) directory gets copied to the `<directory>`

The objects added to `home` are created in [`lib/ag-solo/vats/vat-demo.js`](lib/ag-solo/vats/vat-demo.js).

The REPL handler is in [`lib/ag-solo/vats/vat-http.js`](lib/ag-solo/vats/vat-http.js).

The HTML frontend code is pure JS/DOM (no additional libraries yet), in
`lib/ag-solo/html/index.html` and `lib/ag-solo/html/main.js`.


#### Scenario 2: a single local testnet node (develop on-chain demo)

In this scenario, you run: 
- a **solo node** exposing an HTTP server in localhost
- a **single local blockchain testnet node** with the server-side Pixel Demo running
- a **web browser** connecting to the solo node and enabling user interaction with the Pixel Demo

The solo node communicates with the testnet node

you install the pixel demo is run 

Before using this scenario, it is recommanded that you test your code with Scenario 3.

Run:
```sh
make scenario2-setup
make scenario2-run-chain
```

Wait about 5 seconds for the chain to produce its first block, then switch to another terminal:
```sh
make scenario2-run-client
```
  
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

Alternatively, running the solo node from a Docker image and no local source code is described in the [top section](#agorics-cosmic-swingset).  

Now go to http://localhost:8000/ to interact with your new solo node.

# Pixel Demo

This demo is roughly based on [Reddit's
r/Place](https://en.wikipedia.org/wiki/Place_(Reddit)), but has a 
number of additional features that showcase the unique affordances of
the Agoric platform, including: higher-order contracts, easy creation
of new assets, and safe code reusability.

| ![Reddit's r/place](readme-assets/rplace.png) | 
|:--:| 
| *Reddit's r/place as a social experiment in cooperation* |


## Installation

| <img src="readme-assets/pixel-demo.png" alt="Pixel Gallery"> | 
|:--:| 
| *The testnet pixel demo. Slightly fewer pixels.* |


The pixel demo runs on [our private testnet](https://github.com/Agoric/cosmic-swingset#agorics-cosmic-swingset). For instructions on how to
run a local, off-chain version for yourself, please see [Scenario 3
here](https://github.com/Agoric/cosmic-swingset#different-scenarios).

## Getting Started

In the pixel demo, the goal is to be able to amass enough pixels to
draw a design on a pixel canvas. You start out empty-handed, with no
money and no pixels to your name. However, you do have access to the *gallery*, the
administrator of the canvas. The gallery has a handful of
methods that allow you to obtain a few pixels for free, color them,
sell them, and buy more.

To access the gallery, type `home.gallery` in the REPL. `home.gallery`
is a remote object (what we call a *presence*). It actually lives in
another environment (what we call a *vat*). Instead of obj.foo(), we
can write E(obj).foo() or the syntactic sugar, obj!foo() and get a
promise for the result. We call this syntactic sugar ['infix
bang'](https://github.com/Agoric/proposal-infix-bang). The syntax
means "deliver the message foo() to the actual object asynchronously,
in its own turn, wherever and whenever it is, even if it is local."
Using E or !, you can talk asynchronously to local and remote objects
in exactly the same way. For example, the first thing you might want
to do is tap the gallery faucet to get a pixel for free:

```js
home.gallery!tapFaucet()
```

`tapFaucet` returns a pixel and saves it under `history[0]`. The pixel that you receive is
actually in the form of an ERTP payment. [ERTP](https://github.com/Agoric/ERTP) (Electronic Rights Transfer Protocol)]
is our smart contract framework for handling transferable objects.
Payments have a few functions. Let's call `getBalance()` on our payment
to see which pixel we received. 

```js
history[0]!getBalance()
```

You might see something like: 

```js
{"label":{"issuer":[Presence 15],"description":"pixels"},"quantity":[{"x":1,"y":4}]}
```

The `quantity` tells us which pixels we've received. `{ x:1, y:4 }`
means that we got a pixel that is in the fifth row (`y:4`) and 2 pixels
from the left (`x:1`). To color the pixel, we need to get the use
object from the payment. You can think of the use object as a regular
JavaScript object that just happens to be associated with an ERTP
payment. 

```js
history[0]!getUse()

```

Your use object will be stored under history, as `history[2]`. Now we
can use it to color. 

```js
history[2]!changeColorAll('#FF69B4')
```

The following commands show a pixel being obtained from the faucet,
getting the 'use' object, coloring the pixel, and selling a pixel to the gallery through a
escrow smart contract.  

```
home.gallery!tapFaucet()
history[0]!getBalance()
history[0]!getUse()
history[2]!changeColorAll('#FF69B4')
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
history[16]!getBalance()
```

Woohoo! We're now 6 dust richer than when we started.

Learn more about ERTP and our pixel demo [here](https://github.com/Agoric/ERTP). 

### Initial Endowments

When a client is started up, it has a few items in a record named home.

* gallery: the Pixel Gallery, described above
* purse: a purse that can hold pixel Dust
* handoffService: a handoff service, which makes it possible to pass capabilities between vats
* canvasStatePublisher: a service with the message subscribe(callback)

#### handoffService

home.handoffService is a handoff service that lets you connect to
other vats that are connected to the same remote vat. handoffService
has three methods: createBoard(name), grabBoard(name), and
validate(board). These allow you to create a 'corkboard' which you can
use to pass items to and from another vat. The handoff service's
methods are designed to allow you to share a newly created corkboard
with one other vat, after which the name can't be reused.

The way to use it is to call createBoard() with a name that you share
with someone else. They then call grabBoard() and pass the name you
gave. If they get a valid corkboard, then you have a private
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

```
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

Then connect to http://localhost:8000 and go to the [Gallery Demo](#gallery-pixel-demo) section.

If you don't have a provisioning code, or otherwise want to run the demo from the code in this directory,
read [the next section](#different-scenarios).



# Acknowledgements

This work was started by combining the [Cosmos SDK tutorial](https://cosmos.network/docs/tutorial/) with the build process described in a [Golang Node.js addon example](https://github.com/BuildingXwithJS/node-blackfriday-example).
