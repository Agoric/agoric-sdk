# Verify that ymax0 can continue to be updated through ymax0 control

The persistent setup replaces the original A3P instance with the exact
`ymax-v0.3.2605-beta1` bundle and the effective devnet configuration from
`ymax-v0.3.2604-beta1`. Release downloads are checksum-pinned.

Because this runs before `n:upgrade-next` its base image isn't a build of the local agoric-sdk. So it can't use `yarn link` to get packages like `@agoric/client-utils` from the source tree. Instead it sources the packages from NPM using `dev` to get the latest master builds.
