// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { AmountMath } from '../../../src/index.js';

const makeAliceMaker = log =>
  Far('aliceMaker', {
    make: (issuer, brand, oldPaymentP) => {
      const alice = Far('alice', {
        testSplitPayments: async () => {
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

export const buildRootObject = vatPowers =>
  Far('root', {
    makeAliceMaker: () => makeAliceMaker(vatPowers.testLog),
  });
