# proposal for deploying YMax beta

Note: YMax Beta doesn't deploy a new ymax contract; rather: it creates a contract control delegating upgrade etc. to an Agoric Opco smartWallet.
This also updates the ymax0 (alpha) contract control instance.

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get packages like `@agoric/client-utils` from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.

## Deploying ymax1

`use.sh` provisions the wallet, redeems the `ContractControl` invitation, and
then installs and starts ymax1 ([`install-and-start.js`](./install-and-start.js)),
so the contract is live with a stable vatID by the end of this layer, for
other proposals (e.g. `o:ymax1-multisig-control`, `n:upgrade-next`) to
reference.

The initial instance uses the `ymax-v0.3.2605-beta1` contract bundle and ymax1
private arguments, both checksum-pinned by `eval.sh`. Synthetic-chain asset
metadata is added because the release's upgrade overrides rely on an existing
instance to retain it.
