/**
 * @file Sanity checks of master branch
 *
 * This 'upgrade-next' test is a dummy on this branch since there is no upgrade to be tested.
 * This file serves as a starting point for tests on release branchs.
 */
import test from 'ava';

import { agd } from '@agoric/synthetic-chain/src/lib/cliHelper.js';
import { getIncarnation } from '@agoric/synthetic-chain/src/lib/vat-status.js';

test('MaxBytes param', async t => {
  const { value: rawParams } = await agd.query(
    'params',
    'subspace',
    'baseapp',
    'BlockParams',
  );
  const blockParams = JSON.parse(rawParams);
  t.is(blockParams.max_bytes, '5242880');
});

test(`Ensure Zoe Vat is at 0`, async t => {
  const incarnation = await getIncarnation('zoe');
  t.is(incarnation, 0);
});
