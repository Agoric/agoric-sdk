import test from 'ava';

import { getIncarnation } from '@agoric/synthetic-chain';

test(`Ensure Network Vat was installed`, async t => {
  const incarnation = await getIncarnation('network');
  t.is(incarnation, 0);
});

test(`Smart Wallet vat was upgraded`, async t => {
  const incarnation = await getIncarnation('walletFactory');

  t.is(incarnation, 2);
});

test(`Zoe vat was upgraded`, async t => {
  const incarnation = await getIncarnation('zoe');

  t.is(incarnation, 1);
});
