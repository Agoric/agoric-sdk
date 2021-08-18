// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import jsc from 'jsverify';

import { runTest } from '../runTest';

// larger values than this seem to take a really long time and the
// test hangs
test('jsverify constant product large values', t => {
  const runPoolAllocationArbitrary = jsc.suchthat(jsc.nat(), u => u > 30468);
  const secondaryPoolAllocationArbitrary = jsc.suchthat(
    jsc.nat(),
    u => u > 30468,
  );
  const runValueInArbitrary = jsc.suchthat(jsc.nat(), u => u < 30468 && u > 0);

  const constantProduct = jsc.forall(
    runPoolAllocationArbitrary,
    secondaryPoolAllocationArbitrary,
    runValueInArbitrary,
    runTest,
  );

  t.true(jsc.check(constantProduct));
});
