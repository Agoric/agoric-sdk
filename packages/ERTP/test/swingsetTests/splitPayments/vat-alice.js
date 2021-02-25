// @ts-check

import { E } from '@agoric/eventual-send';
import { amountMath } from '../../../src';

function makeAliceMaker(log) {
  return harden({
    make(issuer, brand, oldPaymentP) {
      const alice = harden({
        async testSplitPayments() {
          log('oldPayment balance:', await E(issuer).getAmountOf(oldPaymentP));
          const splitPayments = await E(issuer).split(
            oldPaymentP,
            amountMath.make(10n, brand),
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
    makeAliceMaker() {
      return harden(makeAliceMaker(vatPowers.testLog));
    },
  });
}
