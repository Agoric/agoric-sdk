// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { runTest } from './runTest';

// Parameters are:
// runPoolAllocationNat,
// secondaryPoolAllocationNat,
// runValueInNat,

test('specifyRunIn 101, 101, 0', t => {
  t.throws(() => runTest(101, 101, 0), {
    message: 'runAmountIn cannot be empty',
  });
});

test('specifyRunIn 101, 101, 2', t => {
  t.true(runTest(101, 101, 2));
});

test('specifyRunIn 101, 101, 3', t => {
  t.true(runTest(101, 101, 3));
});
