# Smart Wallet UI

## Development

The UI deps and scripts were bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

To run it,

```sh
# freshen sdk
cd agoric-sdk
yarn install && yarn build

# local chain running with wallet provisioned
packages/smart-wallet/scripts/start-local-chain.sh YOUR_ACCOUNT_KEY

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
