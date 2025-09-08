# Proposal to upgrade the chain software

This holds the draft proposal for agoric-upgrade-22, which will be added to
[agoric-3-proposals](https://github.com/Agoric/agoric-3-proposals) after it
passes.

The "binaries" property of `upgradeInfo` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
`releaseNotes` is set to `false`.
