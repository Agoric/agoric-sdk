# Deploy Script Support

To install code on chain or in the a3p-integration environment, you'll have to
write a script to build the core proposal. The proposals' access to bootstrap
powers is limited by their manifests.

There are collections of proposals in /vats/src/proposals,
smart-wallet/src/proposals, orchestration/src/proposals, pegasus/src/proposals,
and inter-protocol/src/proposals.

The overall format is a proposalBuilder script (There are several in
.../builders/scripts/vats/) which has a default export that passes resources to
the proposal. The resources include bundled source code and string-value
parameters. The script exports a CoreEvalBuilder named `defaultProposalBuilder`
that specifies (as an import string) the proposal it uses, identifies the
"manifest", (which associates permissions to access powers in the bootstrap
space with functions to be called), and builds bundles of source code needed by
the proposal.

Here's a simple example:

```
/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
const game1ProposalBuilder = async ({ publishRef, install }) => {
  return harden({
    sourceSpec: '@agoric/smart-wallet/test/start-game1-proposal.js',
    getManifestCall: [
      getManifestForGame1.name,
      {
        game1Ref: publishRef(
          install(
            '@agoric/smart-wallet/test/gameAssetContract.js',
            '../bundles/bundle-game1.js',
            { persist: true },
          ),
        ),
      },
    ],
  });
};

export default async (homeP, endowments) => {
  const { writeCoreEval } = await makeHelpers(homeP, endowments);
  await writeCoreEval('start-game1', game1ProposalBuilder);
};
```

The first element of `getManifestCall` is interpreted as the name of a function
defining a behavior. The second element of `getManifestCall` produces the
`options` argument passed to the function (`{ game1Red }` in the example
above). A common thing to want to pass in `options` is a reference to code to be
installed on-chain. The example above shows how. `publishRef(install(<path>))`
is built from sources in agoric-sdk, and passed as a `bundleRef`, which contains
a `bundleID` suitable for passing to Zoe (for contracts) or `vatAdminService`
(for non-contract vat code).

The CoreEvalBuilder says the proposal to run is
'@agoric/smart-wallet/test/start-game1-proposal.js'. It says the manifest can be
produced by running `getManifestForGame1`, and directs the creation of bundles
from `@agoric/smart-wallet/test/gameAssetContract.js` which will be made
available to the proposal as `game1Ref` in `options`.

The manifest gives permissions for accessing objects in promise space, and
passes installations to the proposalBuilder. Notice that `game1Ref` from the
proposalBuilder is passed to `getManifestForGame1`, which adds it to
`installations`, with the name `game1`. The name provided for installations will
also be used to register the installation in `agoricNames`.

```
export const getManifestForGame1 = ({ restoreRef }, { game1Ref }) => {
  return harden({
    manifest: gameManifest,
    installations: {
      game1: restoreRef(game1Ref),
    },
  });
};
```

### Invoking the coreEval Behavior

The proposalBuilder script's default export is responsible for calling
`writeCoreEval()` to produce the scripts that will be evaluated by the chain.
These define behavior functions that will be invoked based on the keys in the
manifest and passed arguments declared in the manifest. The manifest is usually
in the same file, and conventionally provided by a function named
`getManifestForFoo`. The manifest needs to have a unique name, since it will be
referenced by name from the script. 

### proposalBuilder Script

The script describes how to build the core proposal. Script files should export
`defaultProposalBuilder` and a `default` function that invokes
`writeCoreProposal` one or more times to generate sets of files describing the
proposal.

Chain-halting SoftwareUpgrades can include coreEvals, by adding them to the
`CoreProposalSteps` section in [`upgrade.go`](../../golang/cosmos/app/upgrade.go). To execute a proposal via
CoreEval, follow [the instructions at
docs.agoric.com](https://docs.agoric.com/guides/coreeval/local-testnet.html).
