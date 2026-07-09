// Post-upgrade assertion for the garden#29 "promote a running vat to critical"
// rehearsal. See ./README.md § vatOptionUpdates for the mechanism and how to
// activate it (pin the deterministic ymax1 vatID logged by g:ymax1 into this
// proposal's package.json `agoricProposal.upgradeInfo.vatOptionUpdates`, and keep
// a live ymax1 vat around by not terminating it in g:ymax1).
//
// The critical flag lives only in the swing-store kvStore key `${vatID}.options`
// (read fresh by kernel.js terminateVat), not in vstorage — so we read it through
// synthetic-chain's `getVatInfoFromID(vatID).options()`, which queries the chain's
// swingstore.sqlite directly.
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

test('garden#29: ymax vat is promoted to critical at the software upgrade', async t => {
  if (criticalPins.length === 0) {
    // Rehearsal not activated — this proposal ships with an empty
    // `vatOptionUpdates` because the target vatID must be observed from a real
    // deployment first. Keep CI green and document the exact activation path.
    t.log(
      'garden#29 rehearsal not activated: n:upgrade-next package.json ' +
        'agoricProposal.upgradeInfo.vatOptionUpdates is empty. To activate, pin the ' +
        'ymax1 vatID logged by g:ymax1 and keep that vat alive — see README.',
    );
    t.pass('promotion not configured (pending vatID pin) — see README');
    return;
  }

  // Resolve the deterministic live ymax1 contract vat.
  const liveYmax1 = await getDetailsMatchingVats('ymax1').then(vats =>
    vats.filter(v => !v.terminated),
  );
  t.is(liveYmax1.length, 1, 'exactly one live ymax1 contract vat');
  const { vatID } = liveYmax1[0];

  // The pin must name the vat we actually deployed. If deployment determinism
  // shifted the vatID, this fails loudly and the package.json pin needs updating.
  for (const pin of criticalPins) {
    t.is(
      pin.vatID,
      vatID,
      `pinned vatID ${pin.vatID} must match the live ymax1 vatID ${vatID}; ` +
        'update n:upgrade-next package.json upgradeInfo.vatOptionUpdates if deployment changed it',
    );
  }

  // The promotion took effect: options.critical is now set on the running vat,
  // with its state otherwise preserved (promoted in place, no new incarnation).
  const vatInfo = await getVatInfoFromID(vatID);
  const options = vatInfo.options();
  t.log('post-upgrade ymax1 options', options);
  t.true(
    !!options.critical,
    'ymax1 vat is critical after the software upgrade',
  );
});
