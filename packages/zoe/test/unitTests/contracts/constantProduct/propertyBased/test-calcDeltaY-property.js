// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import jsc from 'jsverify';
import { AmountMath } from '@agoric/ertp';

import { calcDeltaYSellingX } from '../../../../../src/contracts/constantProduct/core';
import { setupMintKits } from '../setupMints';

const doTest = (x, y, deltaX) => {
  const { run, bld } = setupMintKits();
  const runX = run(x);
  const bldY = bld(y);
  const runDeltaX = run(deltaX);
  const deltaY = calcDeltaYSellingX(runX, bldY, runDeltaX);
  const oldK = BigInt(runX.value) * BigInt(bldY.value);
  const newX = AmountMath.add(runX, runDeltaX);
  const newY = AmountMath.subtract(bldY, deltaY);
  const newK = BigInt(newX.value) * BigInt(newY.value);
  return newK >= oldK;
};

test('jsverify constant product calcDeltaYSellingX', t => {
  const runPoolAllocationArbitrary = jsc.suchthat(jsc.nat(), u => u > 1);
  const secondaryPoolAllocationArbitrary = jsc.suchthat(jsc.nat(), u => u > 1);
  const runValueInArbitrary = jsc.suchthat(jsc.nat(), u => u > 1);

  const zeroOut = jsc.forall(
    runPoolAllocationArbitrary,
    secondaryPoolAllocationArbitrary,
    runValueInArbitrary,
    doTest,
  );

  t.true(jsc.check(zeroOut));
});
