import test from 'ava';

import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';

test(`Ensure Network Vat was installed`, async t => {
  const incarnation = await getIncarnation('network');
  t.is(incarnation, 0);
});
