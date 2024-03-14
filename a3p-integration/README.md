# Overview

This folder contains an end-to-end integration test executed against a synthetic agoric-3 chain. The test performs a chain software upgrade to the software contained in the enclosing `agoric-sdk` repository, then executes a series of functional tests verifying the upgrade accomplished its goal.

# How to run

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
cannot access SDK code. Their names must be lower case, and they are executed in
lexical order.

In the release branches, the end-to-end `a3p-integration` test usually only has
a single proposal package named `a:upgrade-NN`, which performs a chain software
upgrade proposal to the corresponding upgrade plan. In the `master` branch, the
next release's changes are staged in `a:upgrade-next`. There may also be
core-eval proposal packages, either before or after the chain software upgrade
proposal.

The details of a proposal package are configured through the `agoricProposal` field of its `package.json`.

More details about synthetic-chain proposals can be found in the [`agoric-3-proposals` README](https://github.com/Agoric/agoric-3-proposals/blob/main/README.md)

### Chain software upgrade proposal

For a chain software upgrade proposal, the `type` is `"Software Upgrade Proposal"`, and the relevant fields are `sdkImageTag`, `planName` and `upgradeInfo`.

- `sdkImageTag` is the docker image tag to use that contains the upgraded chain software. It has a value of `unreleased`, which is the tag for the image that is built from the enclosing `agoric-sdk` repository.
- `planName` is the "upgrade name" included in the proposal which must match the value in the upgraded chain software. In the `master` branch its value is `UNRELEASED_UPGRADE`. In the release branches, it's `agoric-upgrade-NN`.
- `upgradeInfo` contains other details passed to the governance proposal. In
   particular, it can have a `coreProposals` field which instructs the chain
   software to run other core proposals in addition to the one configured in the
   chain software's upgrade handler (see `CoreProposalSteps` in
   `/golang/cosmos/app/app.go`). This field is likely not relevant for release
   branches.

For an example, see `a:upgrade-next` in master.

### Core-eval proposal

The `type` of a core-eval proposal is `"/agoric.swingset.CoreEvalProposal"`, and content is submitted from a subfolder whose name defaults to `submission`.

If the proposal is planned to be executed after the chain software upgrade, and the source of the proposal is in `agoric-sdk`, it's recommended to not check-in the `submission` content in source control and instead generate it automatically when testing. Since proposals cannot access SDK code, a script can be used to generate the `submission` content. Until there is [native support for build scripts in the `synthetic-chain` tool](https://github.com/Agoric/agoric-3-proposals/issues/87), `a3p-integration`'s `build:submissions` step invokes `/script/generate-a3p-submissions.sh` in `agoric-sdk` before starting the upgrade test.

For core eval proposals executing before the chain software upgrade, the `submission` should be checked in, since bundles built from newer software may not be compatible with older chains.

For an example, see https://github.com/Agoric/agoric-sdk/pull/8907

## Hooks

<!-- TODO: Move this section over to synthetic-chain docs -->

Each proposal must have a `test.sh` file, which is executed during a `synthetic-chain test` invocation. In general this simply executes `yarn ava` to run any `*.test.js`. This step can perform any chain action, including submitting bespoke core-evals.

A proposal can also have a `use.sh` file to perform any persisted action after the proposal has passed. The effects of these actions can be used in the test phase, or in subsequent proposal packages.

A chain software upgrade proposal can also have a `prepare.sh` file which is executed before the proposal is submitted to the chain. The actions taken are similarly persisted.

Instead of relying on an automatic `submission` folder, a core-eval proposal can define an `eval.sh` file to generate and submit the core eval (or perform any standalone actions).

# Build details

The `yarn build` script automates 3 steps:
- Building the `unreleased` SDK image
- Generating the `submission` folders in core proposal packages
- Building the synthetic-chain images using the proposals

## Generate a docker image with the `agoric-sdk` chain software

The chain software upgrade proposal contained in this end-to-end integration test performs an upgrade of the agoric-3 synthetic chain to an `UNRELEASED_UPGRADE` plan name (or the corresponding upgrade plan name for release branches). It loads the docker image `ghcr.io/agoric/agoric-sdk:unreleased` for the software implementing that upgrade (both in the `master` branch or in release branches).

The upgrade handler is implemented by the code in the enclosing `agoric-sdk` repository. After any change to the chain software or vat code upgraded through core proposals, the image must be regenerated. This is automatically done by the `build:sdk` script, but can also be performed manually using:

```sh
make -C ../packages/deployment docker-build-sdk
```

## Generating core-eval submissions

Some core-eval proposals `submission` content are generated from the `agoric-sdk`
code, and must be rebuilt every time there is a change. The
`scripts/generate-a3p-submissions.sh` script contains commands to generate the
core-eval content and move it to the expected proposal package's submission
directory. It is executed as part of `a3p-integration`'s `build:submissions` step.
Each proposal that requires such a build step should add an entry to the
`sdk-generate` array in the `agoricProposal` section of `package.json`.

Submissions that don't need to pass in options or generate references to source
bundles can be written directly in a `foo-submission` subdirectory of the
proposal. These would incude a .js or .tjs file, accompanied by a similarly-named
-permit.json file that can contain just `true`, or a complete permission manifest.
The submission should return the script, which can take BootstrapPowers as a
parameter.  

If the submission does require a bundle reference, or other options to be
provided, it should be written as two parts. The proposal usually goes in
`.../vats/proposals`, and the script in `.../builders/scripts/vats`.

### Proposal

The proposal is called with `(powers, options)` available. The manifest
detailing the powers that will be used is usually in the same file, and
conventionally named `getManifestForFoo`. The manifest needs to have a unique
name, since it will be referenced by name from the script. The usual format is
```js
export const foo = async (
  {
    consume: {
      ...
    },
    brands: {
      ...
    }
  },
 options,
) => {
  // do the things using powers and options
};

export const getManifestForFoo = (powers, options) => {
  manifest: {
     [foo.name]: {
       consume: {
         ...
      },
  options,
)};
```

### Script

The script describes how to build the core proposal for `a3p-integration`. For
`agoric-3-proposals` and uploading to the chain, the script is named in
`CoreProposalSteps` in `app.go`, and its `defaultProposalBuilder` is invoked
directly. The submission directories in a3p-integration are generated by the
`generate-a3p-submissions.sh` script, which reads instructions from
`agoricProposal.sdk-generate` in `package.json`. That field contains a list of
strings, each of which describes a single submission. If there is only one
submission, it can use the default directory name `submission` by specifying
only the name of the script file in `builders/scripts/vars`:
```json
"sdk-generate": ["test-localchain"],
```
If there are multiple submissions, each entry has to specify the script name and
a distinct directory name.
```json
"sdk-generate": [
  "probe-zcf-bundle probe-submission",
  "updatePriceFeeds priceFeed-submission",
  "add-auction newAuction-submission"
],
```

Script files should export `defaultProposalBuilder` and a `default` function
that invokes `writeCoreProposal` one or more times to generate sets of files
describing the proposal.

```js
export const defaultProposalBuilder = ({ publishRef, install }) => {
  return harden({
    sourceSpec: '@agoric/vats/src/proposals/foo.js',
    getManifestCall: [
      'getManifestForFoo',
      {
        fooRef: publishRef(install('@agoric/...')),
        ...otherParams,
      },
    ],
  });
};
`
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('proposalName', defaultProposalBuilder);
};
```

The first element of `getManifestCall` is interpreted as the name of a proposal.
`fooRef` (i.e. `publishRef(install(<path>))`) is built from sources under
`../packages`, and passed as a `bundleRef`, which contains a `bundleID` suitable
for passing to Zoe or `vatAdminService`.

The second element of `getManifestCall` produces the `options` argument passed
to the proposal. (`foo` in the example above).``

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
panic: UPGRADE "UNRELEASED_UPGRADE" NEEDED at height: 1101: {"coreProposals":["@agoric/builders/scripts/vats/init-network.js"]}
```

Means your SDK image is different than the one expected by the upgrade proposal. To build the correct image, run `yarn build:sdk`.
