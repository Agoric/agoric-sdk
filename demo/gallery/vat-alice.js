// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import evaluate from '@agoric/evaluate';
import { insist } from '../../util/insist';
import { makeCollect, makeContractHost } from '../../core/contractHost';
import { escrowExchangeSrcs } from '../../core/escrow';

let storedUseRight;
let storedTransferRight;

function createSaleOffer(E, pixelPaymentP, gallery, dustPurseP, collect, log) {
  return Promise.resolve(pixelPaymentP).then(async pixelPayment => {
    const { pixelIssuer, dustIssuer } = await E(gallery).getIssuers();
    const pixelAmount = await E(pixelPayment).getBalance();
    const dustAmount = await E(E(dustIssuer).getAssay()).make(37);
    const terms = harden({ left: dustAmount, right: pixelAmount });
    const contractHost = makeContractHost(E, evaluate);
    const escrowExchangeInstallationP = E(contractHost).install(
      escrowExchangeSrcs,
    );
    const { left: buyerInviteP, right: sellerInviteP } = await E(
      escrowExchangeInstallationP,
    ).spawn(terms);
    const seatP = E(contractHost).redeem(sellerInviteP);
    E(seatP).offer(pixelPayment);
    E(E(seatP).getWinnings())
      .getBalance()
      .then(b => log(`Alice collected ${b.quantity} ${b.label.description}`));
    const pixelPurseP = E(pixelIssuer).makeEmptyPurse();
    collect(seatP, dustPurseP, pixelPurseP, 'alice escrow');
    return { buyerInviteP, contractHost };
  });
}

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

          const useRightTransferRightBundleP = await E(gallery).split(
            exclusivePixelPaymentP,
          );

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
            `pixel x:${rawPixel.x}, y:${rawPixel.y} has original color ${origColor}`,
          );

          const {
            useRightPayment: useRightPaymentP,
            transferRightPayment: transferRightPaymentP,
          } = await E(gallery).split(exclusivePixelPaymentP);

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
            `pixel x:${rawPixel.x}, y:${rawPixel.y} changed to bob's color ${bobsColor}`,
          );

          // alice takes the right back
          const pixelPayment2P = await E(gallery).toPixel(
            exclusiveTransferRightPaymentP,
          );
          const exclusivePixelPayment2P = await E(pixelIssuer).getExclusiveAll(
            pixelPayment2P,
          );
          const { useRightPayment: useRightPayment2P } = await E(gallery).split(
            exclusivePixelPayment2P,
          );

          const exclusiveUseRightPayment2P = await E(
            useRightIssuer,
          ).getExclusiveAll(useRightPayment2P);

          await E(gallery).changeColor(
            exclusiveUseRightPayment2P,
            '#9FBF95', // a light green
          );

          const alicesColor = await E(gallery).getColor(rawPixel.x, rawPixel.y);
          log(
            `pixel x:${rawPixel.x}, y:${rawPixel.y} changed to alice's color ${alicesColor}`,
          );

          // tell bob to try to color, he can't
          return E(bob)
            .tryToColor()
            .then(
              _res => log('uh oh, bob was able to color'),
              rej => log(`bob was unable to color: ${rej}`),
            );
        },
        async doTapFaucetAndStore() {
          log('++ alice.doTapFaucetAndStore starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          const { pixelIssuer, useRightIssuer, transferRightIssuer } = await E(
            gallery,
          ).getIssuers();
          const exclusivePixelPaymentP = await E(pixelIssuer).getExclusiveAll(
            pixelPaymentP,
          );

          const {
            useRightPayment: useRightPaymentP,
            transferRightPayment: transferRightPaymentP,
          } = await E(gallery).split(exclusivePixelPaymentP);

          const exclusiveUseRightPaymentP = E(useRightIssuer).getExclusiveAll(
            useRightPaymentP,
          );

          const exclusiveTransferRightPaymentP = E(
            transferRightIssuer,
          ).getExclusiveAll(transferRightPaymentP);

          storedUseRight = exclusiveUseRightPaymentP;
          storedTransferRight = exclusiveTransferRightPaymentP;

          const amount = await E(storedUseRight).getBalance();

          const rawPixel = amount.quantity[0];

          return rawPixel;
        },
        async checkAfterRevoked() {
          log('++ alice.checkAfterRevoked starting');
          // changeColor throws an Error with an empty payment
          // check transferRight is empty
          E(gallery)
            .changeColor(
              storedUseRight,
              '#9FBF95', // a light green
            )
            .then(
              _res => log(`successfully changed color, but shouldn't`),
              rej => log(`successfully threw ${rej}`),
            );

          const amount = await E(storedTransferRight).getBalance();
          log(
            `amount quantity should be an array of length 0: ${amount.quantity.length}`,
          );
        },
        async doSellAndBuy() {
          log('++ alice.doSellAndBuy starting');
          const pixelPaymentP = E(gallery).tapFaucet();
          const { pixelIssuer, dustIssuer } = await E(gallery).getIssuers();
          const exclusivePixelPaymentP = await E(pixelIssuer).getExclusiveAll(
            pixelPaymentP,
          );
          const amount = await E(exclusivePixelPaymentP).getBalance();
          // sellToGallery creates a escrow smart contract with the
          // terms of the amount parameter plus what the gallery is
          // willing to offer for it
          // sellToGallery returns an invite to the smart contract
          const { inviteP, host } = await E(gallery).sellToGallery(amount);
          const seatP = E(host).redeem(inviteP);
          await E(seatP).offer(exclusivePixelPaymentP);
          const dustPurseP = E(dustIssuer).makeEmptyPurse();
          const pixelPurseP = E(pixelIssuer).makeEmptyPurse();
          await E(gallery).collectFromGallery(
            seatP,
            dustPurseP,
            pixelPurseP,
            'alice escrow',
          );
          // now buy it back
          const {
            inviteP: buyBackInviteP,
            host: buyBackHost,
            dustNeeded,
          } = await E(gallery).buyFromGallery(amount);
          const buyBackSeatP = await E(buyBackHost).redeem(buyBackInviteP);
          const dustPaymentP = await E(dustPurseP).withdraw(dustNeeded);

          E(buyBackSeatP).offer(dustPaymentP);
          // alice is buying a pixel, so her win purse is a pixel
          // purse and her refund purse is a dust purse
          await E(gallery).collectFromGallery(
            buyBackSeatP,
            pixelPurseP,
            dustPurseP,
            'alice escrow 2',
          );
          showPaymentBalance('alice pixel purse', pixelPurseP);
          showPaymentBalance('alice dust purse', dustPurseP);
        },
        async doTapFaucetAndOfferViaCorkboard(handoffSvc, dustPurseP) {
          log('++ alice.doTapFaucetAndOfferViaCorkboard starting');
          const { pixelIssuer } = await E(gallery).getIssuers();
          const exclusivePixelPaymentP = await E(pixelIssuer).getExclusiveAll(
            E(gallery).tapFaucet(),
          );

          const { buyerInviteP, contractHost } = await createSaleOffer(
            E,
            exclusivePixelPaymentP,
            gallery,
            dustPurseP,
            makeCollect(E, log),
            log,
          );

          // store buyerInviteP and contractHost in corkboard
          const cbP = E(handoffSvc).createBoard('MeetPoint');
          const buyerSeatReceipt = E(cbP).addEntry('buyerSeat', buyerInviteP);
          const contractHostReceipt = E(cbP).addEntry(
            'contractHost',
            contractHost,
          );

          const pixelRefundP = E(pixelIssuer).makeEmptyPurse('refund');
          return {
            aliceRefundP: pixelRefundP,
            alicePaymentP: dustPurseP,
            buyerSeatReceipt,
            contractHostReceipt,
          };
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
