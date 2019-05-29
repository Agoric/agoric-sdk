// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { insist } from '../../collections/insist';
import { escrowExchangeSrc } from './escrow';
import { coveredCallSrc } from './coveredCall';
import { exchangeChitAmount, makeCollect } from './chit';

function makeAlice(E, host, log) {
  const collect = makeCollect(E, log);

  function showPaymentBalance(name, paymentP) {
    E(paymentP)
      .getXferBalance()
      .then(amount => log(name, ' xfer balance ', amount));
  }

  let initialized = false;
  let timerP;
  let chitIssuerP;

  let myMoneyPurseP;
  let moneyIssuerP;

  let myStockPurseP;
  let stockIssuerP;

  let myOptFinPurseP;
  let optFinIssuerP;

  let optFredP;

  function init(
    timer,
    myMoneyPurse,
    myStockPurse,
    myOptFinPurse = undefined,
    optFred = undefined,
  ) {
    timerP = E.resolve(timer);
    chitIssuerP = E(host).getChitIssuer();

    myMoneyPurseP = E.resolve(myMoneyPurse);
    moneyIssuerP = E(myMoneyPurseP).getIssuer();

    myStockPurseP = E.resolve(myStockPurse);
    stockIssuerP = E(myStockPurseP).getIssuer();

    if (myOptFinPurse) {
      myOptFinPurseP = E.resolve(myOptFinPurse);
      optFinIssuerP = E(myOptFinPurseP).getIssuer();
    }
    optFredP = optFred;

    initialized = true;
    // eslint-disable-next-line no-use-before-define
    return alice; // alice and init use each other
  }

  const alice = harden({
    init,
    payBobWell(bob) {
      log('++ alice.payBobWell starting');
      insist(initialized)`\
ERR: alice.payBobWell called before init()`;

      const paymentP = E(myMoneyPurseP).withdraw(10);
      return E(bob).buy('shoe', paymentP);
    },

    invite(allegedChitPaymentP) {
      log('++ alice.invite starting');
      insist(initialized)`\
ERR: alice.invite called before init()`;

      showPaymentBalance('alice chit', allegedChitPaymentP);

      const allegedMetaAmountP = E(allegedChitPaymentP).getXferBalance();

      const verifiedChitP = E.resolve(allegedMetaAmountP).then(
        allegedMetaAmount => {
          const clams10 = harden({
            label: {
              issuer: moneyIssuerP,
              description: 'clams',
            },
            quantity: 10,
          });
          const fudco7 = harden({
            label: {
              issuer: stockIssuerP,
              description: 'fudco',
            },
            quantity: 7,
          });

          const metaOneAmountP = exchangeChitAmount(
            chitIssuerP,
            allegedMetaAmount.quantity.label.identity,
            escrowExchangeSrc,
            [clams10, fudco7],
            0,
            clams10,
            fudco7,
          );

          return E.resolve(metaOneAmountP).then(metaOneAmount =>
            E(chitIssuerP).getExclusive(
              metaOneAmount,
              allegedChitPaymentP,
              'verified chit',
            ),
          );
        },
      );

      showPaymentBalance('verified chit', verifiedChitP);

      const seatP = E(host).redeem(verifiedChitP);
      const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
      E(seatP).offer(moneyPaymentP);
      return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice escrow');
    },

    acceptOption(allegedChitPaymentP) {
      if (optFredP) {
        return alice.acceptOptionForFred(allegedChitPaymentP);
      }
      return alice.acceptOptionDirectly(allegedChitPaymentP);
    },

    acceptOptionDirectly(allegedChitPaymentP) {
      log('++ alice.acceptOptionDirectly starting');
      insist(initialized)`\
ERR: alice.acceptOptionDirectly called before init()`;

      showPaymentBalance('alice chit', allegedChitPaymentP);

      const allegedMetaAmountP = E(allegedChitPaymentP).getXferBalance();

      const verifiedChitP = E.resolve(allegedMetaAmountP).then(
        allegedMetaAmount => {
          const smackers10 = harden({
            label: {
              issuer: moneyIssuerP,
              description: 'smackers',
            },
            quantity: 10,
          });
          const yoyodyne7 = harden({
            label: {
              issuer: stockIssuerP,
              description: 'yoyodyne',
            },
            quantity: 7,
          });

          const metaOneAmountP = exchangeChitAmount(
            chitIssuerP,
            allegedMetaAmount.quantity.label.identity,
            coveredCallSrc,
            [smackers10, yoyodyne7, timerP, 'singularity'],
            'holder',
            smackers10,
            yoyodyne7,
          );

          return E.resolve(metaOneAmountP).then(metaOneAmount =>
            E(chitIssuerP).getExclusive(
              metaOneAmount,
              allegedChitPaymentP,
              'verified chit',
            ),
          );
        },
      );

      showPaymentBalance('verified chit', verifiedChitP);

      const seatP = E(host).redeem(verifiedChitP);
      const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
      E(seatP).offer(moneyPaymentP);
      return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice option');
    },

    acceptOptionForFred(allegedChitPaymentP) {
      log('++ alice.acceptOptionForFred starting');
      insist(initialized)`\
ERR: alice.acceptOptionForFred called before init()`;

      const finNeededP = E(E(optFinIssuerP).getAssay()).make(55);
      const chitNeededP = E(allegedChitPaymentP).getXferBalance();

      const termsP = harden([finNeededP, chitNeededP]);
      const chitsP = E(host).start(escrowExchangeSrc, termsP);
      const fredChitP = chitsP.then(chits => chits[0]);
      const aliceForFredChitP = chitsP.then(chits => chits[1]);
      const doneP = Promise.all([
        E(optFredP).acceptOptionOffer(fredChitP),
        E(alice).completeOptionsSale(aliceForFredChitP, allegedChitPaymentP),
      ]);
      doneP.then(
        _res => log('++ alice.acceptOptionForFred done'),
        rej => log('++ alice.acceptOptionForFred reject: ', rej),
      );
      return doneP;
    },

    completeOptionsSale(aliceForFredChitP, allegedChitPaymentP) {
      log('++ alice.completeOptionsSale starting');
      insist(initialized)`\
ERR: alice.completeOptionsSale called before init()`;

      const aliceForFredSeatP = E(host).redeem(aliceForFredChitP);
      E(aliceForFredSeatP).offer(allegedChitPaymentP);
      const myChitPurseP = E(chitIssuerP).makeEmptyPurse();
      return collect(
        aliceForFredSeatP,
        myOptFinPurseP,
        myChitPurseP,
        'alice options sale',
      );
    },
  });
  return alice;
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAlice(host) {
        return harden(makeAlice(E, host, log));
      },
    }),
  );
}
export default harden(setup);
