# Starship 

End-to-end testing environment for fully simulated chains, powered by [Starship](https://docs.cosmology.zone/starship).


## Configuration

The current commands will read from [`config.yaml`](./config.yaml) to build a multi-chain teting environment. Currently, the image includes `agoric`, `osmosis`, and `cosmos-hub` chains and a hermes relayer between each.

The `agoric` software revision includes the vats necessary for building and testing orchestration applications:
- vat-network
- vat-ibc
- vat-localchain
- vat-transfer
- vat-orchestration

## Initial Setup

Ensure you have `kubectl`, `kind`, `helm`, and `yq` installed on your machine.

```sh
make setup
```

## Getting Started

```sh
# install helm chart and start starship service
make install

# expose ports on your local machine. useful for testing dapps
make port-forward
```

**Wait 10-12** minutes. It takes some time for the above to finish setting up. Use `watch kubectl get pods` to confirm all pods are up and running before running the next command.

To setup finish setting up Agoric, then run:

```bash
make fund-provision-pool override-chain-registry
```

If you get an error like "connection refused", you need to wait longer, until all the pods are Running.

# Cleanup

```sh
# stop the containers and port-forwarding
make stop

# delete the clusters
make clean
```


## Logs

You can use the following commmands to view logs:

```sh
# agoric slogfile
make tail-slog

# agoric validator logs
kubectl logs agoriclocal-genesis-0 --container=validator --follow

# relayer logs
kubectl logs hermes-agoric-gaia-0 --container=relayer --follow
kubectl logs hermes-osmosis-gaia-0 --container=relayer --follow
```

## Agoric Smart Wallet

For the steps below, you must import a key to `agd` or create a new one.

```bash
# create a `user1` key from a random seed
kubectl exec -i agoriclocal-genesis-0 -c validator -- agd keys add user1

# get the newly created address
ADDR=$(kubectl exec -i agoriclocal-genesis-0 -c validator -- agd keys show user1 -a)

# fund the wallet with some tokens 
make fund-wallet COIN=20000000ubld ADDR=$ADDR

# provision the smart wallet
make provision-smart-wallet ADDR=$ADDR
```

# Chain Registry

These only work if you've done `make port-forward`.

http://localhost:8081/chains/agoriclocal
http://localhost:8081/chains/osmosislocal
http://localhost:8081/chains/gaialocal
http://localhost:8081/chains/agoriclocal/keys
http://localhost:8081/ibc
