# proposal for updating wallet factory

This proposal simulates the expected core eval for updating the wallet factory with:
- Support for invokeEntry on existing smart wallets
- Marshaller optimizations

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get `@agoric` packages from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.
