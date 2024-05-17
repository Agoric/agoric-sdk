# Proposals

These scripts are referenced by proposals to the BLDer DAO to run on the chain.
There are other collections of proposals in .../vats/src/proposals,
smart-wallet/src/proposals, orchestration/src/proposals, pegasus/src/proposals.

The overall format is a proposalBuilder (There are several in
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
