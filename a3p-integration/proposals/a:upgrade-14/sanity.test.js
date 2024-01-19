/**
 * @file Sanity checks of upgrade-14
 *
 * This "upgrade-14" test is a dummy since there is no upgrade behavior to be tested.
 * This file serves as a starting point for tests of upgrade-14.
 */
import test from 'ava';

import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';

test(`Ensure Zoe Vat is at 0`, async t => {
  const incarnation = await getIncarnation('zoe');
  t.is(incarnation, 0);
});
