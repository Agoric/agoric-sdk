import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { AmountMath as m, makeIssuerKit } from '@agoric/ertp';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import { fc } from '@fast-check/ava';
import {
  imbalancedRequest,
  balancesToReachRatio,
} from '../../../src/vpool-xyk-amm/addLiquidity.js';

const { add, multiply } = natSafeMath;

const { brand: brandX } = makeIssuerKit('X');
const { brand: brandY } = makeIssuerKit('Y');

const oneB = 1_000_000_000n;
const dec18 = 1_000_000_000_000_000_000n; // 18 decimals as used in ETH

// The starting balances in the pools will be between 10^4 and  10^27
const arbPoolX = fc
  .bigUint({ max: oneB * dec18 })
  .map(value => m.make(brandX, 10_000n + value));
const arbPoolY = fc
  .bigUint({ max: oneB * dec18 })
  .map(value => m.make(brandY, 10_000n + value));

// The amounts to be deposited will be less than 10^27
const arbGiveX = fc
  .bigUint({ max: oneB * dec18 })
  .map(value => m.make(brandX, value));
const arbGiveY = fc
  .bigUint({ max: oneB * dec18 })
  .map(value => m.make(brandY, value));

// left and right are within 5% of each other.
const withinEpsilon = (left, right) =>
  multiply(right, 105) >= multiply(left, 100) &&
  multiply(left, 105) >= multiply(right, 100);

test('balancesToReachRatio calculations are to spec', async t => {
  await fc.assert(
    fc.property(
      fc.record({
        poolX: arbPoolX,
        poolY: arbPoolY,
        giveX: arbGiveX,
        giveY: arbGiveY,
      }),
      ({ poolX, poolY, giveX, giveY }) => {
        // skip cases where the target ratio is more than K at the start
        fc.pre(
          !imbalancedRequest(
            // use floats so we don't convert all fractions less than 1 to 0.
            Number(m.add(poolX, giveX).value) /
              Number(m.add(poolY, giveY).value),
            multiply(poolX.value, poolY.value),
          ),
        );
        let ok = true;

        const { targetX, targetY } = balancesToReachRatio(
          poolX,
          poolY,
          giveX,
          giveY,
        );

        const targetWithinRangeOfK = withinEpsilon(
          multiply(targetX.value, targetY.value),
          multiply(poolX.value, poolY.value),
        );
        t.truthy(
          targetWithinRangeOfK,
          `with giveX=${giveX.value} giveY=${giveY.value}, targetX=${targetX.value} and targetY=${targetY.value} should have the same product as poolX=${poolX.value} * poolY=${poolY.value}.`,
        );
        if (!targetWithinRangeOfK) ok = false;

        // target X / targetY approximately equals poolXAfter / poolYAfter
        const ratiosWithinRange = withinEpsilon(
          targetX.value * add(poolY.value, giveY.value),
          targetY.value * add(poolX.value, giveX.value),
        );
        t.truthy(
          ratiosWithinRange,
          `targetX ${targetX.value} and targetY ${targetY.value} should be in the same ratio as poolX + giveX / poolY + giveY`,
        );
        if (!ratiosWithinRange) ok = false;

        return ok;
      },
    ),
  );
});
