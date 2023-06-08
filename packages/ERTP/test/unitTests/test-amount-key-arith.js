import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { fc } from '@fast-check/ava';
import { keyEQ, keyGTE } from '@agoric/store';

import { AmountMath as m } from '../../src/index.js';
import { arbAmount } from '../../tools/arb-amount.js';

test('amount equality iff key equality', async t => {
  await fc.assert(
    fc.property(fc.record({ x: arbAmount, y: arbAmount }), ({ x, y }) => {
      return t.true(m.isEqual(x, y) === keyEQ(x, y));
    }),
  );
});

test('amount >= iff key >=', async t => {
  await fc.assert(
    fc.property(fc.record({ x: arbAmount, y: arbAmount }), ({ x, y }) => {
      return t.true(m.isGTE(x, y) === keyGTE(x, y));
    }),
  );
});
