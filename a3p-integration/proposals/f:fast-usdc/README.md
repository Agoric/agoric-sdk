# proposal for deploying fast-usdc

Note that this will run after upgrade-next but for iteration speed it runs before n:upgrade-next in the build sequence.

A consequence of this is that it can't use `yarn link` to get `@agoric/fast-usdc` because it's not in the base image. Instead it sources the packages from NPM using `dev` to get the latest master builds.

