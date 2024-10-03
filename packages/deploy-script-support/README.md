# Deploy Script Support

To install code on chain or in the a3p-integration environment, you'll have to
generate a proposal and write a script to build the core proposal. The
proposals have limited access to bootstrap powers, described by their manifests.

There are collections of proposals in /vats/src/proposals,
smart-wallet/src/proposals, orchestration/src/proposals, pegasus/src/proposals,
and inter-protocol/src/proposals.

The overall format is a proposalBuilder script (There are several in
.../builders/scripts/vats/) which has a default export that passes resources to
the proposal. The resources include bundled source code and string-value
parameters. The ProposalBuilder specifies (as an import string) the proposal
it uses, identifies the "manifest", (which associates permissions to access
powers in the bootstrap space with functions to be called), and builds bundles
of source code needed by the proposal.

Here's a simple example from `start-valueVow.js`

```
/** @type {import('@agoric/deploy-script-support/src/externalTypes.js').CoreEvalBuilder} */
export const defaultProposalBuilder = async ({ publishRef, install }) =>
  harden({
    // Somewhat unorthodox, source the exports from this builder module
    sourceSpec: '@agoric/builders/scripts/testing/start-valueVow.js',
    getManifestCall: [
      'getManifestForValueVow',
      {
        valueVowRef: publishRef(
          install('@agoric/zoe/src/contracts/valueVow.contract.js'),
        ),
      },
    ],
  });
```

The first element of `getManifestCall` is interpreted as the name of a proposal.
The second element of `getManifestCall` produces the `options` argument passed
to the proposal (`{ valueVowRef, ... }` in the example above). A common thing to
want to pass in options is a reference to code to be installed on-chain. The
`valueVowRef` example above shows how. `publishRef(install(<path>))` is built
from sources in the sdk, and passed as a `bundleRef`, which contains a
`bundleID` suitable for passing to Zoe (for contracts) or `vatAdminService` (for
non-contract vat code).

It says the proposal to run is
'@agoric/builders/scripts/testing/start-valueVow.js', lists the manifest there
as `'getManifestForValueVow'`, and directs the creation of a bundle from
'@agoric/zoe/src/contracts/valueVow.contract.js', which will be made
available to the proposal as `valueVowRef` in options.

The manifest gives the permissions for accessing the promise space, and passes
the `installations` to the proposalBuilder. Notice that `valueVowRef` from the
proposalBuilder is passed to `getManifest`, which adds it to `installations`,
with the name `valueVow`. The latter must match the well-known name in
`consume.installation` and `agoricNames.installation`. The call to `restoreRef`
causes the installation to be registered there.

```
export const getManifestForValueVow = ({ restoreRef }, { valueVowRef }) => {
  console.log('valueVowRef', valueVowRef);
  return {
    manifest: {
      [startValueVow.name]: {
        consume: {
          startUpgradable: true,
        },
        installation: {
          consume: { valueVow: true },
        },
        instance: {
          produce: { valueVow: true },
        },
      },
    },
    installations: {
      valueVow: restoreRef(valueVowRef),
    },
  };
};
```

### Proposal

The proposal is called with `(powers, options)` available. The manifest
detailing the powers that will be used is usually in the same file, and
conventionally provided by a function named `getManifestForFoo`. The manifest
needs to have a unique name, since it will be referenced by name from the
script. 

`manifest` contains descriptions of powers to be provided to the proposals.

`options` can provide the proposal with arbitrary other powerful objects.

`installations` are  passed to the proposal,and are useful for creating
instances of contracts with Zoe. When upgrading contracts, Zoe requires
bundleIds rather than installations. The bundleId can be retrieved from the
`contractRef` from the proposalBuilder, so that is usually passed through in
options.

### proposalBuilder Script

The script describes how to build the core proposal. The process is different
for SoftwareUpgrades and coreEvals. Script files should export
`defaultProposalBuilder` and a `default` function that invokes
`writeCoreProposal` one or more times to generate sets of files describing the
proposal.

Chain-halting SoftwareUpgrades can include coreEvals, by adding them to the
`CoreProposalSteps` section in [`upgrade.go`](../../golang/cosmos/app/upgrade.go). To execute a proposal via
CoreEval, follow [the instructions at
docs.agoric.com](https://docs.agoric.com/guides/coreeval/local-testnet.html).

```js
export default async (homeP, endowments) => {
  const { writeCoreProposal } = await makeHelpers(homeP, endowments);
  await writeCoreProposal('proposalName', defaultProposalBuilder);
};
```
