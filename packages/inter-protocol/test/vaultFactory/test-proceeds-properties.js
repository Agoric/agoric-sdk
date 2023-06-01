import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { AmountMath, makeIssuerKit } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { fc } from '@fast-check/ava';
import { calculateDistributionPlan } from '../../src/vaultFactory/proceeds.js';

const minted = makeIssuerKit('Minted', 'nat', { decimalPlaces: 2 });
const collateral = makeIssuerKit('Collateral', 'nat', { decimalPlaces: 4 });

/** @param {Brand<'nat'>} brand */
const arbAmount = brand =>
  fc
    .bigUint({ max: 1_000_000_000_000_000n })
    .map(value => AmountMath.make(brand, value));

const arbAmtKWRecord = fc.record({
  Minted: arbAmount(minted.brand),
  Collateral: arbAmount(collateral.brand),
});

const collateralUnit = AmountMath.make(collateral.brand, 1_000n);
/** @type {fc.Arbitrary<PriceDescription>} */
// @ts-expect-error mock
const arbPriceDescription = fc.record({
  amountIn: fc.constant(collateralUnit),
  amountOut: arbAmount(minted.brand).filter(price => price.value > 0n),
});

const arbBalances = fc.record({
  collateral: arbAmount(collateral.brand),
  presaleDebt: arbAmount(minted.brand),
  currentDebt: arbAmount(minted.brand),
});

const BP = 100n * 100n;
const arbRate = fc
  .bigUint({ max: BP })
  .map(bp => makeRatio(bp, minted.brand, BP));

test('calculateDistributionPlan always returns something', async t => {
  await fc.assert(
    fc.property(
      fc.record({
        proceeds: arbAmtKWRecord,
        totalDebt: arbAmount(minted.brand),
        totalCollateral: arbAmount(collateral.brand),
        oraclePriceAtStart: arbPriceDescription,
        vaultsBalances: fc.array(arbBalances),
        penaltyRate: arbRate,
      }),
      inputs => {
        return (
          // Total
          t.truthy(calculateDistributionPlan(inputs))
        );
      },
    ),
  );
});
