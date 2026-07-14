# Proposal to upgrade the chain software

This holds the draft proposal for agoric-upgrade-23, which will be added to
[agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals) after it
passes.

The "binaries" property of `upgradeInfo` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
`releaseNotes` is set to `false`.

## `vatOptionUpdates` — promoting ymax vat to `critical`

This proposal's `upgradeInfo` can carry a `vatOptionUpdates` to mark the ymax
vat as critical.

This replicates the `upgradeDetails.vatOptionUpdates` that the chain's 
`golang/cosmos/app/upgrade.go` would provide for devnet and mainnet, but
targeting a ymax instance deployed in the a3p image.

Because the vatID must be pinned statically in this package.json,
`test/critical-vat.test.js` cross-checks it against the live vat before
asserting the promotion took effect.
