import '@endo/init/debug.js';

import test from 'ava';
import { minSignedBigInt, maxSignedBigInt } from '../../src/utils/abitype.ts';

for (const [bits, min, max] of [
  [1n, -1n, 0n],
  [39n, -274_877_906_944n, 274_877_906_943n],
  [256n, -(2n ** 255n), 2n ** 255n - 1n],
]) {
  test(`signed integer bounds for ${bits} bits`, t => {
    t.is(minSignedBigInt(bits), min);
    t.is(maxSignedBigInt(bits), max);
  });
}

test('signed integer bounds reject nonpositive widths', t => {
  for (const bits of [0n, -1n]) {
    t.throws(() => minSignedBigInt(bits), { instanceOf: RangeError });
    t.throws(() => maxSignedBigInt(bits), { instanceOf: RangeError });
  }
});
