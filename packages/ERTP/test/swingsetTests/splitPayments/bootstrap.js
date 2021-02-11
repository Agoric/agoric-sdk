import { E } from '@agoric/eventual-send';
import { makeIssuerKit } from '../../../src';

const { details: X } = assert;

export function buildRootObject(vatPowers, vatParameters) {
  function testSplitPayments(aliceMaker) {
    vatPowers.testLog('start test splitPayments');
    const { mint: moolaMint, issuer, amountMath } = makeIssuerKit('moola');
    const moolaPayment = moolaMint.mintPayment(amountMath.make(1000));

    const aliceP = E(aliceMaker).make(issuer, amountMath, moolaPayment);
    return E(aliceP).testSplitPayments();
  }

  const obj0 = {
    // eslint-disable-next-line consistent-return
    async bootstrap(vats) {
      switch (vatParameters.argv[0]) {
        case 'splitPayments': {
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          return testSplitPayments(aliceMaker);
        }
        default: {
          assert.fail(X`unrecognized argument value ${vatParameters.argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
