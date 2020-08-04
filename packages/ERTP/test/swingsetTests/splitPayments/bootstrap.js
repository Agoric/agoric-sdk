import { E } from '@agoric/eventual-send';
import makeIssuerKit from '../../../src/issuer';

export function buildRootObject(vatPowers, vatOptions) {
  function testSplitPayments(aliceMaker) {
    vatPowers.testLog('start test splitPayments');
    const { mint: moolaMint, issuer, amountMath } = makeIssuerKit('moola');
    const moolaPayment = moolaMint.mintPayment(amountMath.make(1000));

    const aliceP = E(aliceMaker).make(issuer, amountMath, moolaPayment);
    return E(aliceP).testSplitPayments();
  }

  const obj0 = {
    async bootstrap(vats) {
      switch (vatOptions.argv[0]) {
        case 'splitPayments': {
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          return testSplitPayments(aliceMaker);
        }
        default: {
          throw new Error(`unrecognized argument value ${vatOptions.argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
