# How to run

```sh
yarn install
make init
make run
# When quiesced, in another terminal:
make relay
# Then run any of the other make targets:
make help
```

To add in the feature where the smart-relayer can talk to a contract on chain
`ibc0`, instead of `make relay`, do:

```sh
make register-ibc0-with-relay
make register-relay-with-ibc0
make relay
```
