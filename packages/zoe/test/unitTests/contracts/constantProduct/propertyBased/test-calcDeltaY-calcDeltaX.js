// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

// eslint-disable-next-line import/no-extraneous-dependencies
import jsc from 'jsverify';
import { AmountMath } from '@agoric/ertp';

import {
  calcDeltaYSellingX,
  calcDeltaXSellingX,
} from '../../../../../src/contracts/constantProduct/core';
import { setupMintKits } from '../setupMints';

const doTest = (x, y, deltaX) => {
  const { run, bld } = setupMintKits();
  const runX = run(x);
  const bldY = bld(y);
  const runDeltaX = run(deltaX);
  const deltaY = calcDeltaYSellingX(runX, bldY, runDeltaX);
  const newDeltaX = calcDeltaXSellingX(runX, bldY, deltaY);

  // Pass through again, should always get the same answer.
  const newDeltaY = calcDeltaYSellingX(runX, bldY, newDeltaX);

  return AmountMath.isEqual(deltaY, newDeltaY);
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
