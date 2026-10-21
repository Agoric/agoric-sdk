// Post-upgrade assertion that the vat(s) pinned in package.json
// `agoricProposal.upgradeInfo.vatOptionUpdates` were promoted to `critical`.
// Deliberately target-agnostic: it drives off the pinned vatID(s), not a
// hard-coded label; an optional `label` on a pin is only a cross-check.
//
// The critical flag lives only in the swing-store kvStore key `${vatID}.options`
// (read fresh by kernel.js terminateVat), so we read it directly from the chain's
// swingstore.sqlite via synthetic-chain's `getVatInfoFromID(vatID).options()`.
import { readFileSync } from 'node:fs';

import test from 'ava';
import '@endo/init/debug.js';

import {
  getDetailsMatchingVats,
  getVatInfoFromID,
} from '@agoric/synthetic-chain';

const upgradeInfo = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8'),
).agoricProposal?.upgradeInfo;

const criticalPins = (upgradeInfo?.vatOptionUpdates ?? []).filter(
  u => u.critical,
);

test('pinned vat is promoted to critical at the software upgrade', async t => {
  if (criticalPins.length === 0) {
    t.pass('no critical vatOptionUpdates pinned — see README');
    return;
  }

  for (const pin of criticalPins) {
    const { vatID, label } = pin;

    // This runs as a post-upgrade test rather than a pre-upgrade check: a
    // pre-upgrade failure would surface while building the proposal layers,
    // before test.sh (and its logs showing the live vatID) ever runs — so a
    // stale pin would fail with no clue what to re-pin it to.
    if (label) {
      const live = await getDetailsMatchingVats(label).then(vats =>
        vats.filter(v => !v.terminated),
      );
      const liveIDs = live.map(v => v.vatID);
      t.true(
        liveIDs.includes(vatID),
        `pinned vatID ${vatID} must be a live vat labelled ${label}; found ${JSON.stringify(
          liveIDs,
        )} — update n:upgrade-next package.json upgradeInfo.vatOptionUpdates if deployment changed it`,
      );
    }

    // The promotion took effect: options.critical is now set on the running vat,
    // with its state otherwise preserved (promoted in place, no new incarnation).
    const vatInfo = await getVatInfoFromID(vatID);
    const options = vatInfo.options();
    t.log(`post-upgrade options for ${vatID}`, options);
    t.true(
      !!options.critical,
      `vat ${vatID} is critical after the software upgrade`,
    );
  }
});
