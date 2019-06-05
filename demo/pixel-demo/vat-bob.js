// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { makeCollect } from './contractHost';

function makeBobMaker(E, host, log) {
  const collect = makeCollect(E, log);

  return harden({
    make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      myMoneyPurseP,
      myPixelListPurseP,
    ) {
      const moneyIssuerP = E(myMoneyPurseP).getIssuer();
      const moneyNeededP = E(E(moneyIssuerP).getAssay()).make(10);

      const pixelListIssuerP = E(myPixelListPurseP).getIssuer();
      const pixelsNeededP = E(E(pixelListIssuerP).getAssay()).make([
        { x: 1, y: 1 },
      ]);

      const bob = harden({
        /**
         * This is not an imperative to Bob to buy something but rather
         * the opposite. It is a request by a client to buy something from
         * Bob, and therefore a request that Bob sell something. OO naming
         * is a bit confusing here.
         */
        async buy(pixelList, paymentAmount, paymentP) {
          log('++ bob.buy starting');
          return E.resolve(pixelListIssuerP).then(issuer => {
            const depositResultP = E(myMoneyPurseP).deposit(
              paymentAmount,
              paymentP,
            );
            log('++ deposit');
            const pixelAmount = {
              label: {
                issuer,
                description: 'pixelList',
              },
              quantity: pixelList,
            };
            const withdrawalResultP = E(myPixelListPurseP).withdraw(
              pixelAmount,
            );
            log('++ withdrawal');
            return Promise.all([depositResultP, withdrawalResultP]).then(
              _ => 'exchange successful',
            );
          });
        },

        tradeWell(alice) {
          log('++ bob.tradeWell starting');
          // Alice has 0, 0; 0, 1
          // bob has 1, 0; 1, 1

          // bob will be offering a pixel for money
          const terms = harden([moneyNeededP, pixelsNeededP]);
          const invitesP = E(escrowExchangeInstallationP).spawn(terms);
          const aliceInviteP = invitesP.then(invites => invites[0]);
          const bobInviteP = invitesP.then(invites => invites[1]);
          const doneP = Promise.all([
            E(alice).acceptInvite(aliceInviteP),
            E(bob).acceptInvite(bobInviteP),
          ]);
          doneP.then(
            _res => log('++ bob.tradeWell done'),
            rej => log('++ bob.tradeWell reject: ', rej),
          );
          return doneP;
        },

        acceptInvite(inviteP) {
          const seatP = E(host).redeem(inviteP);
          return E.resolve(pixelsNeededP).then(pixelsNeeded => {
            const pixelPaymentP = E(myPixelListPurseP).withdraw(pixelsNeeded);
            E(seatP).offer(pixelPaymentP);
            return collect(
              seatP,
              myMoneyPurseP,
              myPixelListPurseP,
              'bob escrow',
            );
          });
        },

        offerAliceOption(alice) {
          log('++ bob.offerAliceOption starting');

          const terms = harden([
            moneyNeededP,
            pixelsNeededP,
            timerP,
            'singularity',
          ]);
          const bobInviteP = E(coveredCallInstallationP).spawn(terms);
          const bobSeatP = E(host).redeem(bobInviteP);
          return E.resolve(pixelsNeededP).then(pixelsNeeded => {
            console.log('got pixelsNeeded');
            const pixelPaymentP = E(myPixelListPurseP).withdraw(pixelsNeeded);
            const aliceInviteP = E(bobSeatP).offer(pixelPaymentP);
            const doneP = Promise.all([
              E(alice).acceptOption(aliceInviteP),
              collect(bobSeatP, myMoneyPurseP, myPixelListPurseP, 'bob option'),
            ]);
            doneP.then(
              _res => log('++ bob.offerAliceOption done'),
              rej => log('++ bob.offerAliceOption reject: ', rej),
            );
            return doneP;
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
      makeBobMaker(host) {
        return harden(makeBobMaker(E, host, log));
      },
    }),
  );
}
export default harden(setup);
