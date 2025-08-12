# proposal for deploying YMax alpha 3

Note: YMax Alpha 3 doesn't deploy a new ymax contract; rather: it delegates upgrade etc. to an Agoric Opco smartWallet.

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get packages like `@agoric/client-utils` from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.
