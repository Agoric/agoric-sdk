/**
 * @file Sanity checks of upgrade-15
 *
 * This "upgrade-15" test is a dummy since there is no upgrade behavior to be tested.
 * This file serves as a starting point for tests of upgrade-15.
 */
import test from 'ava';

import { getIncarnation } from '@agoric/synthetic-chain';

test(`Ensure Zoe Vat is running`, async t => {
  const incarnation = await getIncarnation('zoe');
  t.true(Number.isInteger(incarnation));
  t.true(incarnation >= 0);
});
