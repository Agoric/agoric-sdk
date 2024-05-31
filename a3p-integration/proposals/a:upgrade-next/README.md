# Proposal to upgrade the chain software

The `UNRELEASED_UPGRADE` software upgrade may include core proposals defined in
its upgrade handler. See `CoreProposalSteps` in the `unreleasedUpgradeHandler`
in [golang/cosmos/app/app.go](../../../golang/cosmos/app/app.go).

This test proposal may also include `coreProposals` in its `upgradeInfo`, which
are executed after those defined in that upgrade handler. See `agoricProposal`
in [package.json](./package.json).

The "binaries" property of `upgradeInfo` is now required since Cosmos SDK 0.46, however it cannot be computed for an unreleased upgrade. To disable the check, `releaseNotes` is set to `false`.
