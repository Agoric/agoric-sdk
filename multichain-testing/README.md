# Starship 

End-to-end testing environment for fully simulated chains, powered by [Starship](https://docs.cosmology.zone/starship).


## Configuration

The current commands will read from [`config.yaml`](./config.yaml) to build a multi-chain teting environment. Currently, the image includes `agoric`, `osmosis`, and `cosmos-hub` chains and a hermes relayer between each.

A less-resource intensive version of the configuration is available at [`config.ci.yaml`](./config.ci.yaml) and is currently used for CI tests.

## Initial Setup

Ensure you have `kubectl`, `kind`, `helm`, and `yq` installed on your machine. For convenience, the following command will install dependencies:

```sh
make setup-deps
```

You will need a `kind` cluster:

```sh
make setup-kind
```

## Getting Started

```sh
# install helm chart and start starship service
make install

# NOTE: it takes about 10-12 minutes for the above to finish setting up. Use `watch kubectl get pods` to confirm all pods are up and running before running the next command.

# expose ports on your local machine. useful for testing dapps
make port-forward

# stop the containers and port-forwarding
make stop
```

To setup finish setting up Agoric, also run:

```bash
make fund-provision-poool
```

You can use these commands to fund an account and make a smart wallet:
```bash
ADDR=agoric123 COIN=100000ubld make fund-wallet
ADDR=agoric123 make provision-smart-wallet
```

## Logs

You can use the following commmands to view logs:

```sh
# agoric slogfile
make tail-slog

# agoric validator logs
kubkubectl logs agoriclocal-genesis-0 --container=validator --follow
```
