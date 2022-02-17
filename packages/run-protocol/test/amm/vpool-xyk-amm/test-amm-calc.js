// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { AmountMath as m, makeIssuerKit } from '@agoric/ertp';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import fc from 'fast-check';
import {
  imbalancedRequest,
  balancesToReachRatio,
} from '../../../src/vpool-xyk-amm/addLiquidity.js';

const { add, multiply } = natSafeMath;

const { brand: brandX } = makeIssuerKit('X');
const { brand: brandY } = makeIssuerKit('Y');

const arbPoolX = fc.bigUint().map(value => m.make(brandX, 100n + value));
const arbPoolY = fc.bigUint().map(value => m.make(brandY, 100n + value));
const arbGiveX = fc.bigUint().map(value => m.make(brandX, value));
const arbGiveY = fc.bigUint().map(value => m.make(brandY, value));

// left and right are within 5% of each other.
const withinEpsilon = (left, right) =>
  multiply(right, 105) >= multiply(left, 100) &&
  multiply(left, 105) >= multiply(right, 100);

test('balancesToReachRatio calculations are to spec', t => {
  fc.assert(
    fc.property(
      fc.record({
        poolX: arbPoolX,
        poolY: arbPoolY,
        giveX: arbGiveX,
        giveY: arbGiveY,
      }),
      ({ poolX, poolY, giveX, giveY }) => {
        if (
          imbalancedRequest(
            // use floats so we don't convert all fractions less than 1 to 0.
            Number(m.add(poolX, giveX).value) /
              Number(m.add(poolY, giveY).value),
            multiply(poolX.value, poolY.value),
          )
        ) {
          t.pass();
          return;
        }
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

        // target X / targetY approximately equals poolXAfter / poolYAfter
        const ratiosWithinRange = withinEpsilon(
          targetX.value * add(poolY.value, giveY.value),
          targetY.value * add(poolX.value, giveX.value),
        );

        t.truthy(
          ratiosWithinRange,
          `targetX ${targetX.value} and targetY ${targetY.value} should be in the same ratio as poolX + giveX / poolY + giveY`,
        );
      },
    ),
  );
});
