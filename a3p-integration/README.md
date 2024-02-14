# Integration with agoric-3 synthetic test chain

The test runner is `@agoric/synthetic-chain`. This package depends on that so that you can run,
```
yarn synthetic-chain build
yarn synthetic-chain test
yarn synthetic-chain test --debug
```

# Package management

This directory hierarchy, while it contains packages, is not part of the agoric-sdk workspace. This is to isolate it from tooling that expects a public package published to NPM. For example, it doesn't run in the CI jobs for the `/packages` packages.

For each proposal, their package.json is also separate and can't access the SDK code. There is an issue to automatically build proposals from scripts declared in the proposal package.json: https://github.com/Agoric/agoric-3-proposals/issues/87 . Until that is resolved, use `agoric run` on the proposal and copy the outputs to a `submission` directory within the proposals package, to be checked in.

# Troubleshooting

## no match for platform

If you get an error like this,
```
ERROR: failed to solve: ghcr.io/agoric/agoric-3-proposals:main: no match for platform in manifest sha256:83321abda66fa94915f1ae20d651b66870f2d1aac17b71449c04ecd46b6b1b96: not found
```
it's because our CI only builds x64 yet and you're on some other machine, probably a Mac.

There is some effort to make CI build multiplatform: https://github.com/Agoric/agoric-3-proposals/pull/32

Meanwhile you can build the `main` image locally:

```sh
cd agoric-3-proposals
./node_modules/.bin/synthetic-chain build

# build the default entrypoint and tag it so the `append` command finds it
docker buildx build --tag ghcr.io/agoric/agoric-3-proposals:main .
```

## missing "unreleased" image

If you get an error like,
```
ERROR: failed to solve: ghcr.io/agoric/agoric-sdk:unreleased: ghcr.io/agoric/agoric-sdk:unreleased: not found
```

That's probably because you don't have that image built locally. To build it,
```
cd packages/deployment
make docker-build-sdk
```

### UPGRADE NEEDED
```
panic: UPGRADE "UNRELEASED_UPGRADE" NEEDED at height: 1101: {"coreProposals":["@agoric/builders/scripts/vats/init-network.js"]}
```

Means your SDK image is different than the one expected by the upgrade proposal. The remedy also to rebuild it as in the case it's missing.
