import { E } from '@agoric/eventual-send';

import '../exported';

export const assertPayoutAmount = (t, issuer, payout, expectedAmount) => {
  issuer.getAmountOf(payout).then(amount => {
    t.deepEquals(amount, expectedAmount, `payout was ${amount.value}`);
  });
};

export const assertPayoutDeposit = (t, payout, purse, amount) => {
  payout.then(payment => {
    E(purse)
      .deposit(payment)
      .then(payoutAmount => {
        t.deepEquals(
          payoutAmount,
          amount,
          `payout was ${payoutAmount.value}, expected ${amount}.value`,
        );
      });
  });
};

export const assertOfferResult = (t, seat, expected, msg = expected) => {
  E(seat)
    .getOfferResult()
    .then(
      result => t.equals(result, expected, msg),
      e => t.fail(`expecting offer result to be ${expected}, ${e}`),
    );
};

export const assertRejectedOfferResult = (
  t,
  seat,
  expected,
  msg = `offer result rejects as expected`,
) => {
  t.rejects(() => E(seat).getOfferResult(), expected, msg);
};
