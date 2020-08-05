import bundleSource from '@agoric/bundle-source';
import {E} from "@agoric/eventual-send";

export const assertPayout = (t, payout, purse, amount) => {
  payout.then(payment => {
    purse.deposit(payment);
    t.deepEquals(
      purse.getCurrentAmount().value,
      amount,
      `payout was ${amount}`,
    );
  });
};

export const assertOfferResult = (t, seat, expected) => {
  seat.getOfferResult().then(
    result => t.equals(result, expected, `offer result as expected`),
    e => t.fail(`expecting offer result to be ${expected}, ${e}`),
  );
};

export const assertRejectedOfferResult = (t, seat, expected) => {
  seat.getOfferResult().then(
    result => t.fail(`expected offer result to be rejected, got ${result}`),
    e => t.equals(e, expected, 'Expected offer to be rejected'),
  );
};

export const installationPFromSource = (zoe, source) =>
  bundleSource(source).then(b => zoe.install(b));

export const getInviteFields = (inviteIssuer, inviteP) =>
  E(inviteIssuer)
    .getAmountOf(inviteP)
    .then(amount => amount.value[0]);
