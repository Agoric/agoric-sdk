# a3p-integration overview

This directory contains an end-to-end integration test executed against a synthetic agoric-3 chain. The test performs a chain software upgrade to the software contained in the enclosing `agoric-sdk` repository, then executes a series of functional tests verifying the upgrade accomplished its goal.

## Quick-Start: How to Get a Chain Running

To get a chain running with an existing proposal such as `f:fast-usdc`, run `yarn test -m fast-usdc --debug`; likewise `yarn test -m <proposal-name-substring> --debug` for any other proposal name.

## How to run

The synthetic chain testing infrastructure relies on Docker, Docker Buildx extended build capabilities, and the experimental Buildx Bake extension. Make sure you have a recent Docker engine installed for your system.

## Install test dependencies

This directory hierarchy, while it contains packages, is not part of the `agoric-sdk` root Yarn project. This is to isolate it from tooling that expects a public package published to NPM. For example, it doesn't run in the CI jobs for the `/packages` packages.

The end-to-end integration test relies on the [@agoric/synthetic-chain](https://www.npmjs.com/package/@agoric/synthetic-chain) test tool (published to NPM from the [`agoric-3-proposals` repository](https://github.com/Agoric/agoric-3-proposals/tree/main/packages/synthetic-chain)), and uses Yarn 4 (configured through corepack).

First time setup (or after updates to `@agoric/synthetic-chain`):
```sh
corepack enable
yarn install
```

## Run the integration test

The `@agoric/synthetic-chain` test runner is invoked through NPM scripts.

To build the agoric-3 synthetic chain images with the unreleased chain software upgrade:
```sh
yarn build
```

To run the unit tests:
```sh
yarn test
# or for an interactive session into a given proposal package
yarn test --debug -m "proposal-name"
```

# Proposal structure

## Package layering

Proposals are packages under the `/a3p-integration/proposals` folder, and are
separate from each other, from the `a3p-integration` test environment, and from
the enclosing `agoric-sdk` repository. They run inside the docker image, and
cannot access SDK code. Their names must be lower case.

In the release branches, the end-to-end `a3p-integration` test usually only has
a single proposal package named `a:upgrade-NN`, which performs a chain software
upgrade proposal to the corresponding upgrade plan. In the `master` branch, the
next release's changes are staged in `n:upgrade-next`. There may also be
core-eval proposal packages, either before or after the chain software upgrade
proposal.

The details of a proposal package are configured through the `agoricProposal` field of its `package.json`.

More details about synthetic-chain proposals can be found in the [`agoric-3-proposals` README](https://github.com/Agoric/agoric-3-proposals/blob/main/README.md)

### Chain software upgrade proposal

For a chain software upgrade proposal, the `type` is `"Software Upgrade Proposal"`, and the relevant fields are `sdkImageTag`, `planName` and `upgradeInfo`.

- `sdkImageTag` is the docker image tag to use that contains the upgraded chain software. It has a value of `unreleased`, which is the tag for the image that is built from the enclosing `agoric-sdk` repository.

- `planName` is the "upgrade name" included in the proposal which must match the value in the upgraded chain software. In the `master` branch its value is `UNRELEASED_A3P_INTEGRATION`. In the release branches, it's `agoric-upgrade-NN`.

- `upgradeInfo` contains other details passed to the governance proposal. In
   particular, it can have a `coreProposals` field which instructs the chain
   software to run other core proposals in addition to the one configured in the
   chain software's upgrade handler (see `CoreProposalSteps` in
   `/golang/cosmos/app/upgrade.go`).
  - See **Generating core-eval submissions** below for details.

For an (evolving) example, see `n:upgrade-next` in master.

### Core-eval proposal

The `type` of a core-eval proposal is `"/agoric.swingset.CoreEvalProposal"`. By
default, the submission in the subdir `submission` is evaluated. The proposal
package can override this by providing an `eval.sh` that is executed instead.
See [run_eval.sh](https://github.com/Agoric/agoric-3-proposals/blob/main/packages/synthetic-chain/public/upgrade-test-scripts/run_eval.sh)

If the proposal is planned to be executed after the chain software upgrade, and
the source of the proposal is in `agoric-sdk`, don't commit the built proposal
because CI willl test that instead of the most recent code.


Instead, generate it automatically in each test run. Since proposals cannot
access SDK code, a script can be used to generate the `submission` content.
Until there is [native support for build scripts in the `synthetic-chain`
tool](https://github.com/Agoric/agoric-3-proposals/issues/87),
`a3p-integration`'s `build:submissions` step invokes
`build-all-submissions.sh` in `agoric-sdk` before starting the upgrade test.

For core eval proposals executing before the chain software upgrade, the `submission` should be checked in, since bundles built from newer software may not be compatible with older chains.

For an example, see https://github.com/Agoric/agoric-sdk/pull/8907

## Hooks

<!-- TODO: Move this section over to synthetic-chain docs -->

Each proposal must have a `test.sh` file, which is executed during a `synthetic-chain test` invocation. In general this simply executes `yarn ava` to run any `*.test.js`. This step can perform any chain action, including submitting bespoke core-evals.

A proposal can also have a `use.sh` file to perform any persisted action after the proposal has passed. The effects of these actions can be used in the test phase, or in subsequent proposal packages.

A chain software upgrade proposal can also have a `prepare.sh` file which is executed before the proposal is submitted to the chain. The actions taken are similarly persisted.

Instead of relying on an automatic `submission` folder, a core-eval proposal can define an `eval.sh` file to generate and submit the core eval (or perform any standalone actions).

# Build details

In the `ghcr.io/agoric/agoric-sdk` image the filesystem is:
```
/usr/src/agoric-sdk
```

With the proposals layered on top of the `agoric-sdk` image, the filesystem adds (for example):
```
/usr/src/proposals/n:upgrade-next
/usr/src/proposals/z:acceptance
```

In agoric-sdk CI and development, we want the proposals to use the versions of the packages in the agoric-sdk source tree. To accomplish this we use `yarn link`. In Yarn 4 (berry) it uses a `portal` protocol to link to another Yarn project on the filesystem. One kink is that in development the command would,
```
yarn link --relative ../../.. --all
```
Which configures the package.json resolutions to find agoric-sdk three levels up.

But in CI the proposals aren't nested under agoric-sdk and the command would be,
```
yarn link --relative ../../agoric-sdk --all
```

To give a consistent location, `a3p-integration` has a symlink to the `agoric-sdk` project where the proposals expect it in the Docker fileystem. (I.e. treating `a3p-integration` as `/usr/src` of the Docker image.)


The `yarn build` script automates 3 steps:
- Building the `unreleased` SDK image
- Generating the `submission` folders in core proposal packages
- Building the synthetic-chain images using the proposals


## Generate a docker image with the `agoric-sdk` chain software

The chain software upgrade proposal contained in this end-to-end integration test performs an upgrade of the agoric-3 synthetic chain to an `UNRELEASED_A3P_INTEGRATION` plan name (or the corresponding upgrade plan name for release branches). It loads the docker image `ghcr.io/agoric/agoric-sdk:unreleased` for the software implementing that upgrade (both in the `master` branch or in release branches).

The upgrade handler is implemented by the code in the enclosing `agoric-sdk` repository. After any change to the chain software or vat code upgraded through core proposals, the image must be regenerated. This is automatically done by the `build:sdk` script, but can also be performed manually using:

```sh
make -C ../packages/deployment docker-build-sdk
```

## Generating core-eval submissions

In a3p-integration, many core-eval proposals' `submission` content has to be
generated from the local `agoric-sdk`, and must be rebuilt every time there is a
change. This package's package.json `build:submissions` script runs
`scripts/build-all-submissions.sh` to generate that content and move it into
submission subdirectories under the corresponding [proposal
directories](#package-layering). Each proposal that requires such a build step
should have a corresponding entry in the `sdk-generate` array of its proposal
directory's package.json `agoricProposal` section.

Submissions that don't need to pass in options or generate references to source
bundles can be written directly in a `foo-submission` subdirectory of the
proposal. These would include a .js script, accompanied by a similarly-named
-permit.json file (which can contain just `true` or a complete permission
manifest.) The submission should return the script, which can take
BootstrapPowers as a parameter.  

If the submission does require bundle references or other options to be
provided, it should be written as two parts: a core eval (in one of the
`.../proposals` directories) and a builder for it (under `.../builders/scripts`).

The `build-all-submissions.sh` script reads instructions from
`agoricProposal.sdk-generate` in package.json. That field contains a list of
strings, each of which describes a single submission as a list of
space-separated fields. If there is only one submission, it can use the default
directory name `submission` by specifying just one field, containing the path of
a builder script file relative to
[packages/builders/scripts](../packages/builders/scripts):
```json
"sdk-generate": ["test-localchain"],
```
If there are multiple submissions, each entry has to specify a distinct
directory name in the second field:
```json
"sdk-generate": [
  "probe-zcf-bundle probe-submission",
  "updatePriceFeeds priceFeed-submission",
  "add-auction newAuction-submission"
],
```
Any remaining fields provide additional arguments to the build script:
```json
"sdk-generate": [
  "inter-protocol/updatePriceFeeds.js submission/main main",
],
```

## Building synthetic-chain images

Synthetic-chain tests run inside generated proposal Docker images. If any changes are made to the proposals or their tests, these images must be rebuilt. This is performed during the `build:synthetic-chain` step.

# Troubleshooting

## no match for platform

If you get an error like this,
```
ERROR: failed to solve: ghcr.io/agoric/agoric-3-proposals:latest: no match for platform in manifest sha256:14e22b6f75b568a5d32f7a74b701d978b7656ba4d33e2ec7ad2ff0611e7c2530: not found
```
it's because you're on an architecture for which we don't generate an image. We currently generate `linux/amd64` and `linux/arm64` images.

You can build the `latest` image locally:

```sh
cd agoric-3-proposals
yarn install
yarn synthetic-chain build

# build the default entrypoint and tag it so the `append` command finds it
docker buildx build --tag ghcr.io/agoric/agoric-3-proposals:latest .
```

## missing "unreleased" image

If you get an error like,
```
ERROR: failed to solve: ghcr.io/agoric/agoric-sdk:unreleased: ghcr.io/agoric/agoric-sdk:unreleased: not found
```

That's because you didn't create an image from the local `agoric-sdk`. Run `yarn build:sdk`.

## UPGRADE NEEDED

If you get an error like,
```
panic: UPGRADE "UNRELEASED_A3P_INTEGRATION" NEEDED at height: 1101: {"coreProposals":["@agoric/builders/scripts/vats/init-network.js"]}
```

Means your SDK image is different than the one expected by the upgrade proposal. To build the correct image, run `yarn build:sdk`.
