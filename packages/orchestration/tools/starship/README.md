# Starship 

End-to-end testing environment for fully simulated chains, powered by [Starship](https://docs.cosmology.zone/starship).


## Initial Setup

Ensure you have `docker`, `kubectl`, `kind`, and `helm` installed on your machine  For convenience, the following command will install dependencies:

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
