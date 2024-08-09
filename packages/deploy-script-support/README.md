# Deploy Script Support

To install code on chain or in the a3p-integration environment, you'll have to
generate a proposal, and write a script to build the core proposal. The
proposals have limited access to bootstrap powers, described by their manifests.

There are collections of proposals in .../vats/src/proposals,
smart-wallet/src/proposals, orchestration/src/proposals, pegasus/src/proposals.

The overall format is a proposalBuilder script (There are several in
.../builders/scripts/vats/) which has a default export that passes resources to
the proposal. The resources include bundled source code and string-value
parameters. The ProposalBuilder specifies (as an import string) the proposal
it uses, identifies the "manifest", (which associates permissions to access
powers in the bootstrap space with functions to be called), and builds bundles
of source code needed by the proposal.

`.../builders/scripts/vats/upgradeVaults.js` is a canonical example. It says the
proposal to run is '@agoric/inter-protocol/src/proposals/upgrade-vaults.js',
lists the manifest there as `'getManifestForUpgradeVaults'`, and directs the
creation of a bundle from
'@agoric/inter-protocol/src/vaultFactory/vaultFactory.js', which will be made
available to the proposal as `vaultsRef` in options.

`upgrade-vaults.js` defines `getManifestForUpgradeVaults()`, which returns a
`manifest` that says `upgradeVaults()` should be executed, and specifies what
powers it should have access to.

### Proposal

The proposal is called with `(powers, options)` available. The manifest
detailing the powers that will be used is usually in the same file, and
conventionally provided by a function named `getManifestForFoo`. The manifest
needs to have a unique name, since it will be referenced by name from the
script. The usual format is
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
  const { fooRef } = options;
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

`manifest` contains descriptions of powers to be provided to the proposals.

**TODO**  what happens with the `installations` in [`startPsm.js`](https://github.com/Agoric/agoric-sdk/blob/b13743a2cccf0cb63a412b54384435596d4e81ea/packages/inter-protocol/src/proposals/startPSM.js#L496)?

`options` allows the proposal to be provided with arbitray other powerful
objects.

### proposalBuilder Script

The script describes how to build the core proposal. For
`agoric-3-proposals` and uploading to the chain, the script must be named in the
`CoreProposalSteps` section in [`upgrade.go`](../../golang/cosmos/app/upgrade.go),
and its `defaultProposalBuilder` will be invoked directly.

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
The second element of `getManifestCall` produces the `options` argument passed
to the proposal. (`fooRef` in the example above). A common thing to want to pass
in options is a reference to code to be installed on-chain. The `fooRef` example
above shows how. `publishRef(install(<path>))` is built from sources in the
sdk, and passed as a `bundleRef`, which contains a `bundleID` suitable for
passing to Zoe (for contracts) or `vatAdminService` (for non-contract vat code).

