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

# Start a wallet UI, new shell
cd packages/wallet/ui && yarn start
# NB: trailing slash
open http://localhost:3000/wallet/ 
# Network config should use Smart Wallet, config URL is http://localhost:3000/wallet/network-config (not port 8000!), and "Keplr" connection method
# You may have to type in "3000" and choose it from the list.
# Click "Connect Smart Wallet"
# Should get a Keplr connection prompt when you confirm.
# Should get "query not found" error, wallet not initialized yet

# Fund keplr
cd packages/cosmic-swingset
# Copy the agoric address from your keplr wallet here, starts with "agoric1"
KEPLR_ADDRESS=<yours>
make ACCT_ADDR=$KEPLR_ADDRESS AGORIC_POWERS=SMART_WALLET fund-acct provision-acct
# now refresh the wallet UI and purses should load
