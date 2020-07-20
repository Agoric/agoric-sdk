/* global harden */
import { E } from '@agoric/eventual-send';
import makeIssuerKit from '../../../src/issuer';

function build(log) {
  function testSplitPayments(aliceMaker) {
    log('start test splitPayments');
    const { mint: moolaMint, issuer, amountMath } = makeIssuerKit('moola');
    const moolaPayment = moolaMint.mintPayment(amountMath.make(1000));

    const aliceP = E(aliceMaker).make(issuer, amountMath, moolaPayment);
    return E(aliceP).testSplitPayments();
  }

  const obj0 = {
    async bootstrap(argv, vats) {
      switch (argv[0]) {
        case 'splitPayments': {
          const aliceMaker = await E(vats.alice).makeAliceMaker();
          return testSplitPayments(aliceMaker);
        }
        default: {
          throw new Error(`unrecognized argument value ${argv[0]}`);
        }
      }
    },
  };
  return harden(obj0);
}
harden(build);

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  log(`=> setup called`);
  return helpers.makeLiveSlots(
    syscall,
    state,
    _vatPowers => build(log),
    helpers.vatID,
  );
}
export default harden(setup);
