// @ts-check

import { E } from '@agoric/eventual-send';

import '../exported.js';
import { AmountMath, assertValueGetHelpers } from '@agoric/ertp';

import { q } from '@agoric/assert';

export const assertAmountsEqual = (t, amount, expected, label = '') => {
  harden(amount);
  harden(expected);
  const l = label ? `${label} ` : '';
  const brandsEqual = amount.brand === expected.brand;

  const helper = assertValueGetHelpers(expected.value);
  if (helper !== assertValueGetHelpers(amount.value)) {
    t.fail(
      `${l}Must be the same asset kind: ${amount.value} vs ${expected.value}`,
    );
  } else {
    const valuesEqual = helper.doIsEqual(amount.value, expected.value);
    if (brandsEqual && valuesEqual) {
      t.truthy(AmountMath.isEqual(amount, expected), l);
    } else if (brandsEqual && !valuesEqual) {
      t.fail(
        `${l}value (${q(amount.value)}) expected to equal ${q(expected.value)}`,
      );
    } else if (!brandsEqual && valuesEqual) {
      t.fail(`${l}brand (${amount.brand}) expected to equal ${expected.brand}`);
    } else {
      t.fail(
        `${l}Neither brand nor value matched: ${q(amount)}, ${q(expected)}`,
      );
    }
  }
};

export const assertPayoutAmount = async (
  t,
  issuer,
  payout,
  expectedAmount,
  label = '',
) => {
  const amount = await E(issuer).getAmountOf(payout);
  assertAmountsEqual(t, amount, expectedAmount, label);
};

// Returns a promise that can be awaited in tests to ensure the check completes.
export const assertPayoutDeposit = (t, payout, purse, amount) => {
  return payout.then(payment => {
    E(purse)
      .deposit(payment)
      .then(payoutAmount =>
        assertAmountsEqual(
          t,
          payoutAmount,
          amount,
          `payout was ${payoutAmount.value}, expected ${amount}.value`,
        ),
      );
  });
};

export const assertOfferResult = (t, seat, expected, msg = expected) => {
  E(seat)
    .getOfferResult()
    .then(
      result => t.is(result, expected, msg),
      e => t.fail(`expecting offer result to be ${expected}, ${e}`),
    );
};

export const assertRejectedOfferResult = (
  t,
  seat,
  expected,
  msg = `offer result rejects as expected`,
) => t.throwsAsync(() => E(seat).getOfferResult(), expected, msg);
