# Proposal to upgrade the chain software

The `UNRELEASED_A3P_INTEGRATION` software upgrade may include core proposals
defined in its upgrade handler. See `CoreProposalSteps` in the
`unreleasedUpgradeHandler` in
[golang/cosmos/app/upgrade.go](../../../golang/cosmos/app/upgrade.go).

This test proposal may also include `coreProposals` in its `upgradeInfo`, which
are executed after those defined in that upgrade handler. See `agoricProposal`
in [package.json](./package.json).

The "binaries" property of `upgradeInfo` is now required since Cosmos SDK 0.46,
however it cannot be computed for an unreleased upgrade. To disable the check,
`releaseNotes` is set to `false`.

## `vatOptionUpdates` — promoting a running vat to `critical`

This proposal's `upgradeInfo` can carry a `vatOptionUpdates` array, entries of
the form `{ "vatID": "vNNN", "critical": true }`. At the upgrade's reboot
point, `applyVatOptionUpdates`
([packages/SwingSet/src/controller/upgradeSwingset.js](../../../packages/SwingSet/src/controller/upgradeSwingset.js))
read-modify-writes the named vat's persisted `${vatID}.options`, so
`terminateVat()` will `panic()` (halt the chain) instead of severing the vat.

Real chains get this pin hard-coded per chain in the cosmos upgrade handler
(`golang/cosmos/app/upgrade.go`, `upgradeDetails.vatOptionUpdates`). This
proposal instead uses the `upgradeInfo.vatOptionUpdates` channel, to the same
effect, so that an a3p-specific vatID doesn't need to be baked into that
hard-coded chain list.

`g:ymax1` starts the ymax1 contract; here we mark its vat `critical`:

```json
"vatOptionUpdates": [{ "vatID": "v91", "critical": true, "label": "ymax1" }]
```

Because the vatID must be pinned statically in this package.json,
`test/critical-vat.test.js` cross-checks it against the live vat before
asserting the promotion took effect. If the pin ever goes stale (e.g. a3p's
proposal layering changes), check `g:ymax1`'s test logs for the current
vatID and update the pin above.