// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeCollect } from '../../core/contractHost';

let storedExclusivePayment;

function makeBobMaker(E, log) {
  return harden({
    make(gallery) {
      const bob = harden({
        /**
         * This is not an imperative to Bob to buy something but rather
         * the opposite. It is a request by a client to buy something from
         * Bob, and therefore a request that Bob sell something. OO naming
         * is a bit confusing here.
         */
        async receiveUseRight(useRightPaymentP) {
          log('++ bob.receiveUseRight starting');

          const { useRightIssuer } = await E(gallery).getIssuers();
          const useRightPurse = E(useRightIssuer).makeEmptyPurse();
          // TODO: does bob know the amount that he is getting?
          // use getExclusive() instead
          const exclusiveUseRightPaymentP = E(useRightIssuer).getExclusiveAll(
            useRightPaymentP,
          );

          // putting it in a purse isn't useful but it allows us to
          // test the functionality
          await E(useRightPurse).depositAll(exclusiveUseRightPaymentP);
          const payment = await E(useRightPurse).withdrawAll();

          const exclusivePayment = await E(useRightIssuer).getExclusiveAll(
            payment,
          );

          // bob actually changes the color to light purple
          const amountP = await E(gallery).changeColor(
            exclusivePayment,
            '#B695C0',
          );

          storedExclusivePayment = exclusivePayment;
          return amountP;
        },
        async tryToColor() {
          // bob tries to change the color to light purple
          const amountP = await E(gallery).changeColor(
            storedExclusivePayment,
            '#B695C0',
          );
          return amountP;
        },
        async buyFromCorkBoard(handoffSvc) {
          const { pixelIssuer, dustIssuer, useRightIssuer } = await E(
            gallery,
          ).getIssuers();
          const dustPurse = E(dustIssuer).mint(37, 'bob purse');
          const collect = makeCollect(E, log);
          const boardP = E(handoffSvc).grab('MeetPoint');
          const contractHostP = E(boardP).get('contractHost');
          const buyerInviteP = E(boardP).get('buyerInvite');
          const buyerSeatP = E(contractHostP).redeem(buyerInviteP);

          const pixelPurseP = E(pixelIssuer).makeEmptyPurse('purchase');
          E(buyerSeatP).offer(dustPurse);
          const dustRefundP = E(dustIssuer).makeEmptyPurse('dust refund');
          await collect(buyerSeatP, pixelPurseP, dustRefundP, 'bob option');

          const exclusivePayment = await E(useRightIssuer).getExclusiveAll(
            pixelPurseP,
          );

          // bob tries to change the color to light purple
          await E(gallery)
            .changeColor(exclusivePayment, '#B695C0')
            .then(amountP => {
              const color = E(gallery).getColor(amountP.x, amountP.y);
              log(`bob tried to color, and produced ${color}`);
            });
        },
      });
      return bob;
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
      makeBobMaker() {
        return harden(makeBobMaker(E, log));
      },
    }),
  );
}
export default harden(setup);
