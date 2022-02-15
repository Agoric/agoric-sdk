// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { AmountMath as m, makeIssuerKit } from '@agoric/ertp';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import fc from 'fast-check';
import { balancesToReachRatio } from '../../../src/vpool-xyk-amm/addLiquidity.js';

const { add, multiply } = natSafeMath;

const { brand: brandX } = makeIssuerKit('X');
const { brand: brandY } = makeIssuerKit('Y');

const oneB = 1_000_000_000n;
// const dec18 = 1_000_000_000_000_000_000n; // 18 decimals as used in ETH

const arbPoolX = fc
  .bigUint({ max: oneB })
  .map(value => m.make(brandX, 100n + value));
const arbPoolY = fc
  .bigUint({ min: 100n, max: oneB })
  .map(value => m.make(brandY, 100n + value));
const arbGiveX = fc
  .bigUint({ min: 100n, max: oneB })
  .map(value => m.make(brandX, value));
const arbGiveY = fc
  .bigUint({ min: 100n, max: oneB })
  .map(value => m.make(brandY, value));

function withinEpsilon(numer, denom, epsilon) {
  return (
    Number(denom) * (1 - epsilon) <= numer &&
    numer <= Number(denom) * (1 + epsilon)
  );
}

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
        const { targetX, targetY } = balancesToReachRatio(
          poolX,
          poolY,
          giveX,
          giveY,
        );

        if (targetX.value === 0n && targetY.value === 0n) {
          t.pass();
        } else {
          const targetProduct = Number(multiply(targetX.value, targetY.value));
          const withinRange = withinEpsilon(
            targetProduct,
            Number(multiply(poolX.value, poolY.value)),
            0.05,
          );
          t.truthy(
            withinRange,
            `with giveX=${giveX.value} giveY=${giveY.value}, targetX=${targetX.value} and targetY=${targetY.value} should have the same product as poolX=${poolX.value} * poolY=${poolY.value}.`,
          );

          const ratiosWithinRange = withinEpsilon(
            targetX.value * add(poolY.value, giveY.value),
            targetY.value * add(poolX.value, giveX.value),
            0.05,
          );

          t.truthy(
            ratiosWithinRange,
            `targetX ${targetX.value} and targetY ${targetY.value} should be in the same ratio as poolX + giveX / poolY + giveY`,
          );
        }
      },
    ),
  );
});
