// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeLocalAmountMath } from '@agoric/ertp';

import { assert, details as X } from '@agoric/assert';
import { makeCollect } from '../../../src/makeCollect';

function makeBobMaker(host, log) {
  const collect = makeCollect(E, log);

  return Far('bobMaker', {
    async make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      moneyIssuerP,
      stockIssuerP,
      myMoneyPurseP,
      myStockPurseP,
    ) {
      const moneyMath = await makeLocalAmountMath(moneyIssuerP);
      const stockMath = await makeLocalAmountMath(stockIssuerP);

      const moneyNeeded = moneyMath.make(10);
      const stockNeeded = stockMath.make(7);

      const bob = Far('bob', {
        /*
         * This is not an imperative to Bob to buy something but rather
         * the opposite. It is a request by a client to buy something from
         * Bob, and therefore a request that Bob sell something. OO naming
         * is a bit confusing here.
         */
        buy(desc, paymentP) {
          let amount;
          let good;
          desc = `${desc}`;
          switch (desc) {
            case 'shoe': {
              amount = moneyMath.make(10);
              good = 'If it fits, ware it.';
              break;
            }
            default: {
              assert.fail(X`unknown desc: ${desc}`);
            }
          }

          return paymentP.then(payment =>
            E(myMoneyPurseP)
              .deposit(payment, amount)
              .then(_ => good),
          );
        },

        tradeWell(alice) {
          log('++ bob.tradeWell starting');
          const terms = harden({ left: moneyNeeded, right: stockNeeded });
          const invitesP = E(escrowExchangeInstallationP).spawn(terms);
          const aliceInvitePaymentP = invitesP.then(invites => invites.left);
          const bobInvitePaymentP = invitesP.then(invites => invites.right);
          const doneP = Promise.all([
            E(alice).acceptInvite(aliceInvitePaymentP),
            E(bob).acceptInvite(bobInvitePaymentP),
          ]);
          doneP.then(
            _res => log('++ bob.tradeWell done'),
            rej => log('++ bob.tradeWell reject: ', rej),
          );
          return doneP;
        },

        acceptInvite(inviteP) {
          const seatP = E(host).redeem(inviteP);
          const stockPaymentP = E(myStockPurseP).withdraw(stockMath.make(7));
          E(seatP).offer(stockPaymentP);
          return collect(seatP, myMoneyPurseP, myStockPurseP, 'bob escrow');
        },

        offerAliceOption(alice) {
          log('++ bob.offerAliceOption starting');
          const terms = harden({
            escrowExchangeInstallation: escrowExchangeInstallationP,
            money: moneyNeeded,
            stock: stockNeeded,
            timer: timerP,
            deadline: 'singularity',
          });
          const bobInviteP = E(coveredCallInstallationP).spawn(terms);
          const bobSeatP = E(host).redeem(bobInviteP);
          const stockPaymentP = E(myStockPurseP).withdraw(stockMath.make(7));
          const aliceInviteP = E(bobSeatP).offer(stockPaymentP);
          const doneP = Promise.all([
            E(alice).acceptOption(aliceInviteP),
            collect(bobSeatP, myMoneyPurseP, myStockPurseP, 'bob option'),
          ]);
          doneP.then(
            _res => log('++ bob.offerAliceOption done'),
            rej => log('++ bob.offerAliceOption reject: ', rej),
          );
          return doneP;
        },
      });
      return bob;
    },
  });
}

export function buildRootObject(vatPowers) {
  return Far('root', {
    makeBobMaker(host) {
      return makeBobMaker(host, vatPowers.log);
    },
  });
}
