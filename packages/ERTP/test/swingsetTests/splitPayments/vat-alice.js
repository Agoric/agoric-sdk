// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '../../../src/index.js';

function makeAliceMaker(log) {
  return Far('aliceMaker', {
    make(issuer, brand, oldPaymentP) {
      const alice = Far('alice', {
        async testSplitPayments() {
          log('oldPayment balance:', await E(issuer).getAmountOf(oldPaymentP));
          const splitPayments = await E(issuer).split(
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
