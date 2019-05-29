// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../collections/insist';
import { escrowExchangeSrc } from './escrow';
import { coveredCallSrc } from './coveredCall';
import { makeCollect } from './chit';

function makeBob(E, host, log) {
  const collect = makeCollect(E, log);

  let initialized = false;
  let timerP;

  let myMoneyPurseP;
  let moneyIssuerP;
  let moneyNeededP;

  let myStockPurseP;
  let stockIssuerP;
  let stockNeededP;

  function init(timer, myMoneyPurse, myStockPurse) {
    timerP = E.resolve(timer);

    myMoneyPurseP = E.resolve(myMoneyPurse);
    moneyIssuerP = E(myMoneyPurseP).getIssuer();
    moneyNeededP = E(E(moneyIssuerP).getAssay()).make(10);

    myStockPurseP = E.resolve(myStockPurse);
    stockIssuerP = E(myStockPurseP).getIssuer();
    stockNeededP = E(E(stockIssuerP).getAssay()).make(7);

    initialized = true;
    // eslint-disable-next-line no-use-before-define
    return bob; // bob and init use each other
  }

  const bob = harden({
    init,

    /**
     * This is not an imperative to Bob to buy something but rather
     * the opposite. It is a request by a client to buy something from
     * Bob, and therefore a request that Bob sell something. OO naming
     * is a bit confusing here.
     */
    buy(desc, paymentP) {
      insist(initialized)`\
ERR: buy called before init()`;

      /* eslint-disable-next-line no-unused-vars */
      let amount;
      let good;
      desc = `${desc}`;
      switch (desc) {
        case 'shoe': {
          amount = 10;
          good = 'If it fits, ware it.';
          break;
        }
        default: {
          throw new Error(`unknown desc: ${desc}`);
        }
      }

      return E(myMoneyPurseP)
        .deposit(amount, paymentP)
        .then(_ => good);
    },

    tradeWell(alice) {
      log('++ bob.tradeWell starting');
      insist(initialized)`\
ERR: tradeWell called before init()`;

      const termsP = harden([moneyNeededP, stockNeededP]);
      const chitsP = E(host).start(escrowExchangeSrc, termsP);
      const aliceChitP = chitsP.then(chits => chits[0]);
      const bobChitP = chitsP.then(chits => chits[1]);
      const doneP = Promise.all([
        E(alice).invite(aliceChitP),
        E(bob).invite(bobChitP),
      ]);
      doneP.then(
        _res => log('++ bob.tradeWell done'),
        rej => log('++ bob.tradeWell reject: ', rej),
      );
      return doneP;
    },

    /**
     * As with 'buy', the naming is awkward. A client is inviting
     * this object, asking it to join in a contract instance. It is not
     * requesting that this object invite anything.
     */
    invite(chitP) {
      insist(initialized)`\
ERR: invite called before init()`;

      const seatP = E(host).redeem(chitP);
      const stockPaymentP = E(myStockPurseP).withdraw(7);
      E(seatP).offer(stockPaymentP);
      return collect(seatP, myMoneyPurseP, myStockPurseP, 'bob escrow');
    },

    offerAliceOption(alice) {
      log('++ bob.offerAliceOption starting');
      insist(initialized)`\
ERR: offerAliceOption called before init()`;

      const termsP = harden([
        moneyNeededP,
        stockNeededP,
        timerP,
        'singularity',
      ]);
      const bobChitP = E(host).start(coveredCallSrc, termsP);
      const bobSeatP = E(host).redeem(bobChitP);
      const stockPaymentP = E(myStockPurseP).withdraw(7);
      const aliceChitP = E(bobSeatP).offer(stockPaymentP);
      const doneP = Promise.all([
        E(alice).acceptOption(aliceChitP),
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
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeBob(host) {
        return harden(makeBob(E, host, log));
      },
    }),
  );
}
export default harden(setup);
