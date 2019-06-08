// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

function makeAliceMaker(E, log) {
  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getBalance()
      .then(amount => log(name, ' balance ', amount));
  }

  return harden({
    make(gallery) {
      const alice = harden({
        doTapFaucet() {
          log('++ alice.doTapFaucet starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          showPaymentBalance('pixel from faucet', pixelPaymentP);
        },
        async doChangeColor() {
          log('++ alice.doChangeColor starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          log('tapped Faucet');

          // skip getExclusive
          const { useRightPayment } = await E(
            gallery,
          ).transformToTransferAndUse(pixelPaymentP);
          const changedAmount = await E(gallery).changeColor(
            useRightPayment,
            '#000000',
          );
          return changedAmount;
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
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker() {
        return harden(makeAliceMaker(E, log));
      },
    }),
  );
}
export default harden(setup);
