// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

/* global harden */
import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import { makeCollect } from '../../../src/makeCollect';

function makeBobMaker(host, log) {
  const collect = makeCollect(E, log);

  const getLocalAmountMath = issuer =>
    Promise.all([
      E(issuer).getBrand(),
      E(issuer).getMathHelpersName(),
    ]).then(([brand, mathHelpersName]) =>
      makeAmountMath(brand, mathHelpersName),
    );

  return harden({
    async make(
      escrowExchangeInstallationE,
      coveredCallInstallationE,
      timerE,
      moneyIssuerE,
      stockIssuerE,
      myMoneyPurseE,
      myStockPurseE,
    ) {
      const moneyMath = await getLocalAmountMath(moneyIssuerE);
      const stockMath = await getLocalAmountMath(stockIssuerE);

      const moneyNeeded = moneyMath.make(10);
      const stockNeeded = stockMath.make(7);

      const bob = harden({
        /**
         * This is not an imperative to Bob to buy something but rather
         * the opposite. It is a request by a client to buy something from
         * Bob, and therefore a request that Bob sell something. OO naming
         * is a bit confusing here.
         */
        buy(desc, paymentE) {
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
              throw new Error(`unknown desc: ${desc}`);
            }
          }

          return paymentE.then(payment =>
            E(myMoneyPurseE)
              .deposit(payment, amount)
              .then(_ => good),
          );
        },

        tradeWell(alice) {
          log('++ bob.tradeWell starting');
          const terms = harden({ left: moneyNeeded, right: stockNeeded });
          const invitesE = E(escrowExchangeInstallationE).spawn(terms);
          const aliceInvitePaymentE = invitesE.then(invites => invites.left);
          const bobInvitePaymentE = invitesE.then(invites => invites.right);
          const doneE = Promise.all([
            E(alice).acceptInvite(aliceInvitePaymentE),
            E(bob).acceptInvite(bobInvitePaymentE),
          ]);
          doneE.then(
            _res => log('++ bob.tradeWell done'),
            rej => log('++ bob.tradeWell reject: ', rej),
          );
          return doneE;
        },

        acceptInvite(inviteE) {
          const seatE = E(host).redeem(inviteE);
          const stockPaymentE = E(myStockPurseE).withdraw(stockMath.make(7));
          E(seatE).offer(stockPaymentE);
          return collect(seatE, myMoneyPurseE, myStockPurseE, 'bob escrow');
        },

        offerAliceOption(alice) {
          log('++ bob.offerAliceOption starting');
          const terms = harden({
            escrowExchangeInstallation: escrowExchangeInstallationE,
            money: moneyNeeded,
            stock: stockNeeded,
            timer: timerE,
            deadline: 'singularity',
          });
          const bobInviteE = E(coveredCallInstallationE).spawn(terms);
          const bobSeatE = E(host).redeem(bobInviteE);
          const stockPaymentE = E(myStockPurseE).withdraw(stockMath.make(7));
          const aliceInviteE = E(bobSeatE).offer(stockPaymentE);
          const doneE = Promise.all([
            E(alice).acceptOption(aliceInviteE),
            collect(bobSeatE, myMoneyPurseE, myStockPurseE, 'bob option'),
          ]);
          doneE.then(
            _res => log('++ bob.offerAliceOption done'),
            rej => log('++ bob.offerAliceOption reject: ', rej),
          );
          return doneE;
        },
      });
      return bob;
    },
  });
}

export function buildRootObject(vatPowers) {
  return harden({
    makeBobMaker(host) {
      return harden(makeBobMaker(host, vatPowers.log));
    },
  });
}
