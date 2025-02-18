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

```js
import { makeHelpers } from '@agoric/deploy-script-support';
import { getManifestForGame1 } from '@agoric/smart-wallet/test/start-game1-proposal.js';

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

This CoreEvalBuilder returns an object whose "sourceSpec" indicates that the
proposal to run is "@agoric/smart-wallet/test/start-game1-proposal.js" and whose
"getManifestCall" is a [functionName, ...args] array describing an invocation of
`getManifestForGame1` exported from that file which is expected to return an
object including a "manifest" as described below (but the actual invocation will
insert as the first argument a "powers" object that includes functions such as
`restoreRef`). A common thing to want to pass in `args` is a reference to code
to be installed on-chain, and the example above shows how.
`publishRef(install(...))` is built from sources in agoric-sdk, and passed as a
`bundleRef`, which contains a `bundleID` suitable for passing to Zoe (for
contracts) or `vatAdminService` (for non-contract vat code).

The manifest from such an invocation is a JSON-serializable object in which each
key is the name of a function to itself be invoked and the corresponding value
is a "permit" describing an attenuation of the core-eval promise space to be
provided as its first argument. A permit is either `true` or a string (_both
meaning no attenuation of the respective subtree of the promise space, with a
string serving as a grouping label for convenience and/or diagram generation_),
or an object whose keys identify child properties and whose corresponding values
are theirselves (recursive) permits. See `BootstrapManifiest` in
[lib-boot.js](../vats/src/core/lib-boot.js).

The manifest object returned from a "getManifestCall" invocation may also
include "installations" (they'll be registered with `agoricNames` and in the
bootstrap promise space) and/or "options" (they'll be provided as the "options"
property of the second argument for each call of the manifest's functions):

```js
/** @type {import('@agoric/vats/src/core/lib-boot').BootstrapManifest} */
const gameManifest = harden({
  [startGameContract.name]: {
    consume: {...},
    brand: {...},
    issuer: {...},
    ...
  },
});

export const getManifestForGame1 = ({ restoreRef }, { game1Ref }) => {
  return harden({
    manifest: gameManifest,
    // a reference to the game1 bundle will be published in agoricNames as "game1"
    installations: {
      game1: restoreRef(game1Ref),
    },
    // the second argument of `startGameContract` will be `{ options: ["foo"] }`
    options: ["foo"],
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
