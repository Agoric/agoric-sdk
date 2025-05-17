// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';

import { makeHistoryReviver } from '@agoric/vats/tools/board-utils.js';
import { chainStorageEntries } from './psm-storage-fixture.js';

test('restore PSM: revive metrics, governance with old board IDs', async t => {
  const toSlotReviver = makeHistoryReviver(chainStorageEntries);

  const psmNames = toSlotReviver.children('published.psm.IST.');
  t.true(psmNames.includes('USDC_axl'));

  const a0 = {
    metrics: toSlotReviver.getItem(`published.psm.IST.USDC_axl.metrics`),
    governance: toSlotReviver.getItem(`published.psm.IST.USDC_axl.governance`),
  };

  t.deepEqual(
    a0.metrics.anchorPoolBalance,
    { brand: 'board0223', value: 487_464_281_410n },
    'metrics.anchorPoolBalance',
  );
  t.deepEqual(
    a0.governance.current.MintLimit.value,
    { brand: 'board02314', value: 1_000_000_000_000n },
    'governance.MintLimit',
  );
});
