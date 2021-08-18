// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import jsc from 'jsverify';

import { runTest } from '../runTest';

test('jsverify constant product small values', t => {
  const runPoolAllocationArbitrary = jsc.suchthat(jsc.nat(), u => u > 10000);
  const secondaryPoolAllocationArbitrary = jsc.suchthat(
    jsc.nat(),
    u => u > 10000,
  );
  const runValueInArbitrary = jsc.suchthat(jsc.nat(), u => u < 10000 && u > 0);

  const constantProduct = jsc.forall(
    runPoolAllocationArbitrary,
    secondaryPoolAllocationArbitrary,
    runValueInArbitrary,
    runTest,
  );

  t.true(jsc.check(constantProduct));
});
