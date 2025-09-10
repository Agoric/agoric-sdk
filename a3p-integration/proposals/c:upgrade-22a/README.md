# Proposal to upgrade the chain software

This holds a draft proposal for hypothetical agoric-upgrade-22a, a test for a
follow-up upgrade on top of agoric-upgrade-22. It will not be published.

The "binaries" property of `upgradeInfo` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
`releaseNotes` is set to `false`.
