/* global harden */
import { E } from '@agoric/eventual-send';

function makeAliceMaker(log) {
  return harden({
    make(issuer, unitOps, oldPaymentP) {
      const alice = harden({
        async testSplitPayments() {
          log('oldPayment balance:', await E(issuer).getAmountOf(oldPaymentP));
          const splitPayments = await E(issuer).split(
            oldPaymentP,
            await E(unitOps).make(10),
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

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, _vatPowers =>
    harden({
      makeAliceMaker(host) {
        return harden(makeAliceMaker(log, host));
      },
    }),
  );
}
export default harden(setup);
