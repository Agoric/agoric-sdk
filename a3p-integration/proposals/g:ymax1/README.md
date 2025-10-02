# proposal for deploying YMax beta

Note: YMax Beta doesn't deploy a new ymax contract; rather: it creates a contract control delegating upgrade etc. to an Agoric Opco smartWallet.
This also updates the ymax0 (alpha) contract control instance.

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get packages like `@agoric/client-utils` from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.
