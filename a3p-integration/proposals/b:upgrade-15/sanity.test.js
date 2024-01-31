/**
 * @file Sanity checks of upgrade-14
 *
 * This "upgrade-14" test is a dummy since there is no upgrade behavior to be tested.
 * This file serves as a starting point for tests of upgrade-14.
 */
import test from 'ava';

import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';

test(`Ensure Smart Wallet vat is at 2`, async t => {
  const incarnation = await getIncarnation('walletFactory');
  t.is(incarnation, 2);
});
