# Smart Wallet UI

## Development

The UI deps and scripts were bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

To run it,

```sh
cd agoric-sdk
yarn && yarn build

# Start the chain
cd packages/cosmic-swingset
make scenario2-setup scenario2-run-chain-psm

# (new tab) chain setup
cd packages/cosmic-swingset
# Confirm you have the key material for signing
export ACCT_ADDR=<key-bech32>
agd keys show $ACCT_ADDR

# Fund the pool and your wallet
make wait-for-cosmos fund-provision-pool fund-wallet
agd query bank balances $ACCT_ADDR

# Provision your smart wallet
agoric wallet provision --spend --account <key-name>
# verify
agoric wallet list
agoric wallet show --from <key-name>

# Start a wallet UI
cd packages/wallet/ui && yarn start
# NB: trailing slash
open http://localhost:3000/wallet/ 
# Network config should use Smart Wallet, config URL is http://localhost:3000/wallet/network-config (not port 8000!), and "Keplr" connection method
# You may have to type in "3000" and choose it from the list.
# Click "Connect Smart Wallet"
# Should get a Keplr connection prompt when you confirm.
# Should get "query not found" error, wallet not initialized yet

https://psm.inter.trade/

## Testing

export AGORIC_NET=ollinet

# make sure your wallet is provisioned on the net.
agoric wallet list | grep KEPLR_WALLET_ADDR
# if it's not in the list, provision it
https://ollinet.faucet.agoric.net/

# Start a wallet UI, new shell
cd packages/wallet/ui && yarn start
# NB: trailing slash
open http://localhost:3000/wallet/ 
# ACTION: choose settings and point Network config to https://ollinet.agoric.net/network-config (you have to click on the list item)

# Make sure it has some BLD for gas.
# ACTION: If it's zero, faucet again with "delegate" option
