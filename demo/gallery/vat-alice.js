// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../util/insist';

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

          const pixelIssuer = E(pixelPaymentP).getIssuer();
          const exclusivePixelPaymentP = E(pixelIssuer).getExclusiveAll(
            pixelPaymentP,
          );

          const useRightTransferRightBundleP = await E(
            gallery,
          ).transformToTransferAndUse(exclusivePixelPaymentP);

          const {
            useRightPayment: useRightPaymentP,
          } = useRightTransferRightBundleP;

          const useRightIssuer = E(useRightPaymentP).getIssuer();
          const exclusiveUseRightPaymentP = E(useRightIssuer).getExclusiveAll(
            useRightPaymentP,
          );

          const changedAmount = await E(gallery).changeColor(
            exclusiveUseRightPaymentP,
            '#000000',
          );
          return changedAmount;
        },
        async doSendOnlyUseRight(bob) {
          log('++ alice.doOnlySendUseRight starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          log('tapped Faucet');

          const pixelIssuer = E(pixelPaymentP).getIssuer();
          const exclusivePixelPaymentP = await E(pixelIssuer).getExclusiveAll(
            pixelPaymentP,
          );

          const amount = await E(exclusivePixelPaymentP).getBalance();

          const rawPixel = amount.quantity[0];

          const origColor = await E(gallery).getColor(rawPixel.x, rawPixel.y);

          log(
            `pixel x:${rawPixel.x}, y:${
              rawPixel.y
            } has original color ${origColor}`,
          );

          const {
            useRightPayment: useRightPaymentP,
            transferRightPayment: transferRightPaymentP,
          } = await E(gallery).transformToTransferAndUse(
            exclusivePixelPaymentP,
          );

          const useRightIssuer = E(useRightPaymentP).getIssuer();
          const exclusiveUseRightPaymentP = E(useRightIssuer).getExclusiveAll(
            useRightPaymentP,
          );

          const transferRightIssuer = E(transferRightPaymentP).getIssuer();
          const exclusiveTransferRightPaymentP = E(
            transferRightIssuer,
          ).getExclusiveAll(transferRightPaymentP);

          // we have gotten exclusive access to both the useRight and
          // the transferRight payments.

          // send useRightPayment to Bob
          // Alice keeps transferRightPayment
          const result = await E(bob).receiveUseRight(
            exclusiveUseRightPaymentP,
          );
          const bobsRawPixel = result.quantity[0];
          insist(
            bobsRawPixel.x === rawPixel.x && bobsRawPixel.y === rawPixel.y,
          );
          const bobsColor = await E(gallery).getColor(rawPixel.x, rawPixel.y);
          log(
            `pixel x:${rawPixel.x}, y:${
              rawPixel.y
            } changed to bob's color ${bobsColor}`,
          );

          // alice takes the right back
          const pixelPayment2P = await E(gallery).transformToPixel(
            exclusiveTransferRightPaymentP,
          );
          const exclusivePixelPayment2P = await E(pixelIssuer).getExclusiveAll(
            pixelPayment2P,
          );
          const { useRightPayment: useRightPayment2P } = await E(
            gallery,
          ).transformToTransferAndUse(exclusivePixelPayment2P);

          const exclusiveUseRightPayment2P = await E(
            useRightIssuer,
          ).getExclusiveAll(useRightPayment2P);

          const changedAmount = await E(gallery).changeColor(
            exclusiveUseRightPayment2P,
            '#9FBF95', // a light green
          );

          const alicesColor = await E(gallery).getColor(rawPixel.x, rawPixel.y);
          log(
            `pixel x:${rawPixel.x}, y:${
              rawPixel.y
            } changed to alice's color ${alicesColor}`,
          );

          // tell bob to try to color, he can't
          return E(bob)
            .tryToColor()
            .then(
              _res => log('uh oh, bob was able to color'),
              rej => log(`bob was unable to color: ${rej}`),
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
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker() {
        return harden(makeAliceMaker(E, log));
      },
    }),
  );
}
export default harden(setup);
