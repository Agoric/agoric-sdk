// @ts-check
import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { AmountMath as m, makeIssuerKit } from '@agoric/ertp';
import { natSafeMath } from '@agoric/zoe/src/contractSupport/index.js';
import fc from 'fast-check';
import { balancesToReachRatio } from '../../../src/vpool-xyk-amm/addLiquidity.js';

const { add, multiply } = natSafeMath;

const { brand: brandX } = makeIssuerKit('X');
const { brand: brandY } = makeIssuerKit('Y');

const arbX = fc.bigUint().map(value => m.make(brandX, value));
const arbY = fc.bigUint().map(value => m.make(brandY, value));

test('balancesToReachRatio calculations are to spec', t => {
  const sameRatio = ([x1, y1], [x2, y2], label) =>
    t.deepEqual(multiply(x1, y2), multiply(x2, y1), label);

  fc.assert(
    fc.property(
      fc.record({ poolX: arbX, poolY: arbY, giveX: arbX, giveY: arbY }),
      ({ poolX, poolY, giveX, giveY }) => {
        const { newX, newY } = balancesToReachRatio(poolX, poolY, giveX, giveY);

        t.deepEqual(
          multiply(newX.value, newY.value),
          multiply(poolX.value, poolY.value),
          `with giveX=${giveX.value} giveY=${giveY.value}, targetX=${newX.value} and targetY=${newY.value} multiply to the same product as poolX=${poolX.value} * poolY=${poolY.value}.`,
        );

        sameRatio(
          [newX.value, newY.value],
          [add(poolX.value, giveX.value), add(poolY.value, giveY.value)],
          `targetX ${newX.value} and targetY ${newY.value} are in the ratio as poolX + giveX / poolY + giveY`,
        );
      },
    ),
  );
});
