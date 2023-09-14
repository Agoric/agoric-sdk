import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '../../../src/index.js';
import {
  claim,
  combine,
  splitMany,
} from '../../../src/legacy-payment-helpers.js';

function makeAliceMaker(log) {
  return Far('aliceMaker', {
    make(issuer, brand, oldPaymentP) {
      const alice = Far('alice', {
        async testBasicFunctionality() {
          // isLive
          const alive = await E(issuer).isLive(oldPaymentP);
          log('isLive: ', alive);

          // getAmountOf
          const amount = await E(issuer).getAmountOf(oldPaymentP);
          log('getAmountOf: ', amount);

          // Make Purse

          const purse = E(issuer).makeEmptyPurse();

          // Deposit Payment

          const payment = await oldPaymentP;
          await E(purse).deposit(payment);

          // Withdraw Payment
          const newPayment = E(purse).withdraw(amount);
          const newAmount = await E(issuer).getAmountOf(newPayment);
          log('newPayment amount: ', newAmount);

          // splitMany
          const moola200 = AmountMath.make(brand, 200n);
          const [paymentToBurn, paymentToClaim, ...payments] = await splitMany(
            E(issuer).makeEmptyPurse(),
            newPayment,
            harden([moola200, moola200, moola200, moola200, moola200]),
          );

          // burn
          const burnedAmount = await E(issuer).burn(paymentToBurn);
          log('burned amount: ', burnedAmount);

          // claim
          const claimedPayment = await claim(
            E(issuer).makeEmptyPurse(),
            paymentToClaim,
          );
          const claimedPaymentAmount =
            await E(issuer).getAmountOf(claimedPayment);
          log('claimedPayment amount: ', claimedPaymentAmount);

          // combine
          const combinedPayment = combine(E(issuer).makeEmptyPurse(), payments);
          const combinedPaymentAmount =
            await E(issuer).getAmountOf(combinedPayment);
          log('combinedPayment amount: ', combinedPaymentAmount);
        },
      });
      return alice;
    },
  });
}

export function buildRootObject(vatPowers) {
  return Far('root', {
    makeAliceMaker() {
      return harden(makeAliceMaker(vatPowers.testLog));
    },
  });
}
