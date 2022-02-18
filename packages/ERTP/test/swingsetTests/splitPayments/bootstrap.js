// @ts-check

import { E } from '@agoric/eventual-send';
import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
import { makeIssuerKit, AmountMath } from '../../../src/index.js';

export const buildRootObject = (vatPowers, vatParameters) => {
  const arg0 = vatParameters.argv[0];

  const testSplitPayments = aliceMaker => {
    vatPowers.testLog('start test splitPayments');
    const { mint: moolaMint, issuer, brand } = makeIssuerKit('moola');
    const moolaPayment = moolaMint.mintPayment(AmountMath.make(brand, 1000n));

    const aliceP = E(aliceMaker).make(issuer, brand, moolaPayment);
    return E(aliceP).testSplitPayments();
  };

  const obj0 = Far('root', {
    bootstrap: async vats => {
      switch (arg0) {
        case 'splitPayments': {
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          return testSplitPayments(aliceMaker);
        }
        default: {
          assert.fail(X`unrecognized argument value ${arg0}`);
        }
      }
    },
  });
  return obj0;
};
