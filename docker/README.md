# Setting up an Agoric Dapp Client with docker-compose

## Quick Start (Overview)

1. Download the `docker-compose.yml` pre-configured for the chain, e.g. [`devnet`](https://devnet.agoric.net/docker-compose.yml), and start the `ag-solo` service:

   ```sh
   docker-compose up -d
   ```

1. Alternatively use the generic `docker-compose.yml` in this repository and configure it with the right SDK version and network config URL:

   - Figure out which version tag to use. Usually the version tag is the same as the name of the chain. You can find the chain name either in the explorer (https://devnet.explorer.agoric.net/) or in the [`network-config` file](https://devnet.agoric.net/network-config).
   - Start the `ag-solo` service on `devnet`:
     ```sh
     SDK_TAG=agoricdev-5.2 NETCONFIG_URL=https://devnet.agoric.net/network-config docker-compose up -d
     ```

1. Watch the logs for registration details:

   ```sh
   docker-compose logs -f --tail=50
   ```

1. Issue an unguessable URL to the wallet:

   ```sh
   docker-compose exec ag-solo agoric open --repl
   ```

## Detailed Instructions

See [Setting up an Agoric Dapp Client with docker compose](https://github.com/Agoric/agoric-sdk/wiki/Setting-up-an-Agoric-Dapp-Client-with-docker-compose) in the [agoric\-sdk wiki](https://github.com/Agoric/agoric-sdk/wiki).
