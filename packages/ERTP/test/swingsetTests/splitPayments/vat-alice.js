import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '../../../src/index.js';
import { split } from '../../../src/legacy-payment-helpers.js';

function makeAliceMaker(log) {
  return Far('aliceMaker', {
    make(issuer, brand, oldPaymentP) {
      const alice = Far('alice', {
        async testSplitPayments() {
          log('oldPayment balance:', await E(issuer).getAmountOf(oldPaymentP));
          const splitPayments = await split(
            E(issuer).makeEmptyPurse(),
            oldPaymentP,
            AmountMath.make(brand, 10n),
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
  return Far('root', {
    makeAliceMaker() {
      return makeAliceMaker(vatPowers.testLog);
    },
  });
}
