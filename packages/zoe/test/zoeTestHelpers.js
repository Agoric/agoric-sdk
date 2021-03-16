// @ts-check

import { E } from '@agoric/eventual-send';

import '../exported';

export const assertPayoutAmount = async (
  t,
  issuer,
  payout,
  expectedAmount,
  label = '',
) => {
  const amount = await issuer.getAmountOf(payout);
  t.deepEqual(amount, expectedAmount, `${label} payout was ${amount.value}`);
};

// Returns a promise that can be awaited in tests to ensure the check completes.
export const assertPayoutDeposit = (t, payout, purse, amount) => {
  return payout.then(payment => {
    E(purse)
      .deposit(payment)
      .then(payoutAmount =>
        t.deepEqual(
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
