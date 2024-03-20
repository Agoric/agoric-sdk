# Deploy Script Support

To install code on chain or in the a3p-integration environment, you'll have to
generate a proposal, and write a script to build the core proposal. The
proposals have limited access to bootstrap powers, described by their manifests.


### Proposal

The proposal is called with `(powers, options)` available. The manifest
detailing the powers that will be used is usually in the same file, and
conventionally provided by a function named `getManifestForFoo`. The manifest
needs to have a unique name, since it will be referenced by name from the script.
The usual format is
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

`manifest` contains descriptions of powers to be provided to the proposals.

**TODO**  what happens with the `installations` in [`startPsm.js`](https://github.com/Agoric/agoric-sdk/blob/b13743a2cccf0cb63a412b54384435596d4e81ea/packages/inter-protocol/src/proposals/startPSM.js#L496)?

`options` allows the proposal to be provided with arbitray other powerful
objects.

### Script


**REVIEWERS**: _I don't know how much of this applies to building proposals for
mainnet. I learned it by building proposals in a3p, so I'd appreciate
confirmation of its generality, or a quick summary of how the corresponding task
is done for main-net proposals._


The script describes how to build the core proposal. For
`agoric-3-proposals` and uploading to the chain, the script must be named in the
`CoreProposalSteps` section in
[`app.go`](https://github.com/Agoric/agoric-sdk/blob/b13743a2cccf0cb63a412b54384435596d4e81ea/golang/cosmos/app/app.go#L881),
and its `defaultProposalBuilder` will be invoked
directly.

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
to the proposal. (`foo` in the example above). A common thing to want to pass in
options is a reference to code to be installed on-chain. The `fooRef` example
above shows how. `publishRef(install(<path>))` is built from sources in the
sdk, and passed as a `bundleRef`, which contains a `bundleID` suitable for
passing to Zoe (for contracts) or `vatAdminService` (for non-contract vat code).

