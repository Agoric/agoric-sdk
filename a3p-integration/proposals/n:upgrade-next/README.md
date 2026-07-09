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

## `vatOptionUpdates` — promoting a running vat to `critical` (garden#29)

This proposal's `upgradeInfo` may also carry a `vatOptionUpdates` array, the
proposer-supplied channel for the in-place vat-option promotion added in
kriskowal/garden#29 (`applyVatOptionUpdates` in
[packages/SwingSet/src/controller/upgradeSwingset.js](../../../packages/SwingSet/src/controller/upgradeSwingset.js),
wired in
[packages/cosmic-swingset/src/launch-chain.js](../../../packages/cosmic-swingset/src/launch-chain.js)).
Each entry is `{ "vatID": "vNNN", "critical": true }`: it read-modify-writes that
running vat's persisted `${vatID}.options` blob at the upgrade's reboot point, so
`terminateVat()` will `panic()` (halt the chain) instead of severing the vat.

There are two channels, merged and applied together:

- **structured** — `upgradeDetails.vatOptionUpdates`, hard-coded per chain in the
  cosmos upgrade handler (`golang/cosmos/app/upgrade.go`, gated on `ChainID()`:
  `agoric-3`→`v288`/ymax1, `agoricdev-25`→`v320`/ymax0). The synthetic chain's
  chain-id matches neither, so **nothing** is injected here on a3p; and
- **flexible** — this proposal's `upgradeInfo.vatOptionUpdates` (below), which is
  therefore the channel an a3p rehearsal must use.

### Activating the a3p rehearsal

It ships **empty** (a no-op — the chain boots normally and nothing is promoted),
because the target vatID must be observed from a real deployment first. To
activate the rehearsal covered by `test/critical-vat.test.js`:

1. Run the `g:ymax1` proposal and read the `garden#29 ymax1 deterministic vatID`
   line it logs (see `g:ymax1/test/ymax1.test.js`). Because deployment is
   deterministic, that vatID is stable across runs.
2. Pin it here:

   ```json
   "vatOptionUpdates": [{ "vatID": "vNNN", "critical": true }]
   ```

   If the logged vatID ever changes, this pin must be updated to match;
   `critical-vat.test.js` cross-checks the pin against the live ymax1 vatID and
   fails loudly on drift.
3. Ensure a **live** ymax1 vat survives into this upgrade: `g:ymax1` currently
   terminates ymax1 in its final step ("leave state as we found it"), so that
   cleanup must be dropped (or the rehearsal must start its own vat) for the
   promotion to have a target — otherwise `applyVatOptionUpdates` will fail its
   live-dynamic-vat guard.

With those in place, `critical-vat.test.js` asserts the vat's
`options().critical` is `true` after the upgrade.