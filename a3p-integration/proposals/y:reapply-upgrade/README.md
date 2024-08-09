# Proposal to reapply same upgrade of chain software

The `UNRELEASED_REAPPLY` software upgrade simply re-runs the upgrade to the
same software version, verifying that we can have multiple rc releases
stacked on each other.

This layer does not perform any test beyond making sure the chain starts.

The "binaries" property of `upgradeInfo` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
`releaseNotes` is set to `false`.
