import { E } from '@agoric/eventual-send';

function makeAliceMaker(log) {
  return harden({
    make(issuer, amountMath, oldPaymentP) {
      const alice = harden({
        async testSplitPayments() {
          log('oldPayment balance:', await E(issuer).getAmountOf(oldPaymentP));
          const splitPayments = await E(issuer).split(
            oldPaymentP,
            await E(amountMath).make(10),
          );
          log(
            'splitPayment[0] balance: ',
            await E(issuer).getAmountOf(splitPayments[0]),
          );
          log(
            'splitPayment[1] balance: ',
            await E(issuer).getAmountOf(splitPayments[1]),
          );
        },
      });
      return alice;
    },
  });
}

export function buildRootObject(vatPowers) {
  return harden({
    makeAliceMaker(host) {
      return harden(makeAliceMaker(vatPowers.testLog, host));
    },
  });
}
