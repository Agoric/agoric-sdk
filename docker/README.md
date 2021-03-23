# Setting up an Agoric Dapp Client with docker-compose

See [Appendix: Installing Docker
Compose](#appendix-installing-docker-compose) below if you don't
already have `docker-compose` installed.

## Quick Start (Overview)

 1. Start the `ag-solo` service: `docker-compose up -d`
 2. Watch the logs for registration details: `docker-compose logs -f --tail=50`
 3. Issue an unguessable URL to the wallet: `docker-compose exec ag-solo npx agoric open --repl`

## Detailed Instructions

### Start `ag-solo` in the background and watch the logs

Get
[docker-compose.yml](https://raw.githubusercontent.com/Agoric/agoric-sdk/2697-docker-client/docker/docker-compose.yml)
and enter the following commands:

```sh
ls docker-compose.yml  # it's in the current directory, right?
docker-compose pull    # get the current image
docker-compose up -d
docker-compose logs -f --tail=50
```

You should see logs like:

```
ag-solo_1  | 2021-03-23T19:50:25.466Z ag-solo: init: key generated, now extracting address
ag-solo_1  | 2021-03-23T19:50:25.534Z ag-solo: init: ag-solo initialized in /usr/src/agoric-sdk/packages/cosmic-swingset/solo/agoric
ag-solo_1  | 2021-03-23T19:50:25.535Z ag-solo: init: HTTP/WebSocket will listen on 0.0.0.0:8000
```

_Note: visiting `0.0.0.0:8000` without an access token is of little use._

### Register your client via the Agoric discord faucet

The `ag-solo` service will prompt you every few seconds until you register:

```
ag-solo_1  | =============
ag-solo_1  | agoricdev-1 chain does not yet know of address agoric1l73dgx3yhxc6...
ag-solo_1  | 
ag-solo_1  | Send:
ag-solo_1  | 
ag-solo_1  |   !faucet client agoric1l73dgx3yhxc6...
ag-solo_1  | 
ag-solo_1  | to #faucet channel on https://agoric.com/discord
ag-solo_1  | =============
```

So visit https://agoric.com/discord , go to the `#faucet` channel, and
enter the message as instructed. After a brief pause, you should see
in discord that your request was approved.

_Note: Each address can be registered this way only once. If you make
another request with the same address, it will be declined._

Your `ag-solo` log should show:

```
ag-solo_1  | 2021-03-23T19:51:09.339Z start: swingset running
```

At this point, you can stop the `docker-compose logs` process
(Control-C).

### Open the Agoric wallet using an unguessable URL

Request an unguessable URL using `agoric open`:

```sh
docker-compose exec ag-solo npx agoric open --repl
```

You should see:


```
Launching wallet...
http://127.0.0.1:8000#accessToken=kIqLZ99mQe6TGpvTN...
```

Visit that URL to open the Agoric wallet and REPL.

Right away the wallet should show "connected" to the local `ag-solo`,
but most of the page is inactive while it does a few on-chain
transactions to locate issuers and such. Then you should see a few
purses with balances of various (fictitous) tokens.

## Persistent state: the `ag-solo` volume

You may have noticed that the `ag-solo` service generated a key when
it started:

```
ag-solo_1  | 2021-03-23T19:50:25.466Z ag-solo: init: key generated, now extracting address
```

The `docker-compose.yml` file is configured to set up an `ag-solo`
docker volume to store that key and your client state.

You can bring your `ag-solo` service up and down as usual; the `ag-solo`
volume is preserved:

```sh
docker-compose down

docker-compose up -d

# to check whether it's up or down:
docker-compose ps
```

### DANGER ZONE

If you want to reset the client state (note that this will **LOSE ALL
TOKENS**), use `docker-compose down -v` to remove the persistent
volume.


## Appendix: Installing Docker Compose

Choose your platform:

 - Mac: [Install Docker Desktop on
   Mac](https://docs.docker.com/docker-for-mac/install/)
 - Windows: [Install Docker Desktop on
   Windows](https://docs.docker.com/docker-for-windows/install/)
 - Linux: [Install Docker
   Engine](https://docs.docker.com/engine/install/#server) and then
   [Install Docker Compose](https://docs.docker.com/compose/install/)
 - Other: [Alternative install options](https://docs.docker.com/compose/install/#alternative-install-options)

_Note: On desktop systems like Docker Desktop for Mac and Windows,
Docker Compose is included as part of those desktop installs._
