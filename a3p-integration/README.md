# Integration with agoric-3 synthetic test chain

The test runner is `@agoric/synthetic-chain`. This package depends on that so that you can run,
```
yarn synthetic-chain append
yarn synthetic-chain test
yarn synthetic-chain test --debug
```

# Package management

This directory hierarchy, while it contains packages, is not part of the agoric-sdk workspace. This is to isolate it from tooling that expects a public package published to NPM.

For each proposal, their package.json is also separate but it can't access the SDK code. Instead you must either source a published version of `@agoric/synthetic-chain` (e.g. a `dev` version published on each master commit) or pack a tarball and source that.

```
cd packages/synthetic-chain
yarn pack
TARBALL=`ls *.tgz`
cd -

mv packages/synthetic-chain/$TARBALL a3p-integration/proposals/c:myproposal/
# .tgz are gitignored at the root but a closer .gitignore makes an exception for this package's tarball
git add a3p-integration/proposals/c:myproposal/$TARBALL

yarn add @agoric/synthetic-chain@file:$TARBALL

```

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
