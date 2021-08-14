// @ts-check

// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { Far } from '@agoric/marshal';

import { makeChargeForComputrons } from '../../../src/zoeService/chargeForComputrons.js';
import { natSafeMath } from '../../../src/contractSupport/index.js';

const { multiply, ceilDivide } = natSafeMath;

test('chargeForComputrons', async t => {
  const meteringConfig = {
    incrementBy: 50n,
    price: { feeNumerator: 5n, computronDenominator: 3n },
  };

  const feeBrand = Far('brand', {});

  const feesCharged = [];

  const chargeZoeFee = async (_purse, feeToCharge) => {
    feesCharged.push(feeToCharge.value);
  };

  const chargeForComputrons = makeChargeForComputrons(
    meteringConfig,
    feeBrand,
    chargeZoeFee,
  );

  t.deepEqual(feesCharged, []);
  await chargeForComputrons('feePurse');
  // 50 computrons * (5 RUN per 3 computrons or about 1.666) = 84 RUN
  t.deepEqual(feesCharged, [ceilDivide(multiply(50n, 5n), 3n)]);
});
