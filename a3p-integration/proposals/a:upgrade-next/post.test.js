import test from 'ava';

import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';

test(`Ensure Network Vat was installed`, async t => {
  const incarnation = await getIncarnation('network');
  t.is(incarnation, 0);
});

test(`Smart Wallet vat was upgraded`, async t => {
  const incarnation = await getIncarnation('walletFactory');

  t.is(incarnation, 2);
});

