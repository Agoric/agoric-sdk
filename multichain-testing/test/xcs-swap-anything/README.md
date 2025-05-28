## Start Chains

Runs agoric, cosmoshub, and osmosis with hermes relayers.

```sh
# start starship with xcs-swap-anything configuration
make clean setup
make start FILE=config.xcs-swap-anything.yaml
```

## Run Tests

```sh
yarn test:xcs
```

## Stop Chains

```sh
make stop
```
