# Agoric Wallet

This directory contains two Agoric Wallet pieces:

- `api` - the legacy "off-chain" wallet used by [@agoric/solo](../solo)
- `ui` - the [@agoric/smart-wallet](../smart-wallet) user interface

The smart wallet has not yet subsumed all the features of the off-chain wallet.  Until it does, we require the `api` directory.

The `ui` directory no longer supports the off-chain wallet.  In order to work around this, we point the solo web server at a wallet UI package that does.

## Upgrading the solo wallet UI

Change the legacy wallet UI:

1. Check out the Agoric SDK branch containing a working ag-solo wallet (such as `community-dev`).
2. `yarn && yarn build`
3. `cd packages/wallet/ui`
4. Develop any changes to the wallet, then `yarn build`
5. `yarn publish`, setting the version number to end in `-solo.N` where N is greater than the previous.
6. Commit, create a PR and target it at the same branch in step 1.

Next, you can update the master branch:

1. Check out the Agoric SDK master branch.
2. Set the version of `@agoric/wallet-ui` in the `packages/wallet/package.json` to be the one you published (the exact version, no caret or tilde).
3. `yarn`
4. Test your wallet updates by running an ag-solo (sim chain is fine).
5. Commit, create a PR and target it at master.

After merging the first PR, you can merge the second.
