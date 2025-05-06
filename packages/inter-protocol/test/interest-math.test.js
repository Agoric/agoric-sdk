import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeIssuerKit, AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/ratio.js';
import { calculateCurrentDebt, reverseInterest } from '../src/interest-math.js';

const brand = makeIssuerKit('foo').brand;

/**
 * @param {any} t
 * @param {readonly [bigint, bigint, bigint]} input
 * @param {bigint} result
 */
function checkDebt(t, [debt, interest, compounded], result) {
  /** @type {Amount<'nat'>} */
  const debtSnapshot = AmountMath.make(brand, debt);
  const interestSnapshot = makeRatio(100n + interest, brand);
  const currentCompoundedInterest = makeRatio(100n + compounded, brand);
  t.is(
    calculateCurrentDebt(
      debtSnapshot,
      interestSnapshot,
      currentCompoundedInterest,
    ).value,
    result,
  );
}

test('no debt wo/compounding', checkDebt, [0n, 0n, 0n], 0n);
test('no debt w/ compounding', checkDebt, [0n, 0n, 250n], 0n);
test('some debt wo/compounding', checkDebt, [1_000_000n, 0n, 0n], 1_000_000n);
test('some debt w/ compounding', checkDebt, [1_000_000n, 0n, 2n], 1_020_000n);
test(
  'previous interest wo/compounding',
  checkDebt,
  [1_000_000n, 2n, 2n],
  1_000_000n,
);
test(
  'previous interest w/ compounding',
  checkDebt,
  [1_000_000n, 2n, 4n],
  1_019_608n,
);
test(
  'previous interest, compounded down',
  checkDebt,
  [1_000_000n, 2n, 0n], // negative interest since snapshot
  980_392n,
);

function checkReverse(t, [debt, interest], result) {
  // /** @type {Amount<'nat'>} */
  const debtSnap = AmountMath.make(brand, debt);
  const interestApplied = makeRatio(100n + interest, brand);
  t.deepEqual(reverseInterest(debtSnap, interestApplied).value, result);
}

test('none', checkReverse, [0n, 0n], 0n);
test('none w/interest', checkReverse, [0n, 1n], 0n);

test('some', checkReverse, [1_000_000n, 0n], 1_000_000n);
test('some w/interest', checkReverse, [1_000_000n, 2n], 980_392n);
test('some w/100% interest', checkReverse, [1_000_000n, 100n], 500_000n);
