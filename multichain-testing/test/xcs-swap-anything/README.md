## Spin up Environment
```sh
cd agoric-sdk/multichain-testing
make start FILE=config.xcs-swap-anything.yaml
make osmosis-xcs-setup
make create-osmosis-pool

## Configure the osmosis registries
cd cd agoric-sdk/multichain-testing/test/xcs-swap-anything
make tx-chain-channel-links
make tx-bec32-prefixes    
```

## Run tests
```sh
## For payments contract
cd agoric-sdk/packages/payments
yarn build

cd agoric-sdk/multichain-testing
yarn ava test/xcs-swap-anything/swap-anything.test.ts
yarn ava test/xcs-swap-anything/payments.test.ts ## To deploy payments contract
```