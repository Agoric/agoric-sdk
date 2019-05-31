// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { allComparable } from '../../collections/sameStructure';
import { insist } from '../../collections/insist';
import { escrowExchangeSrc } from './escrow';
import { coveredCallSrc } from './coveredCall';
import { exchangeChitAmount, makeCollect } from './chit';

function makeFred(E, host, log) {
  const collect = makeCollect(E);

  let initialized = false;
  let timerP;
  let chitIssuerP;

  let myMoneyPurseP;
  let moneyIssuerP;

  let myStockPurseP;
  let stockIssuerP;

  let myFinPurseP;
  let finIssuerP;

  function init(timer, myMoneyPurse, myStockPurse, myFinPurse) {
    timerP = E.resolve(timer);
    chitIssuerP = E(host).getChitIssuer();

    myMoneyPurseP = E.resolve(myMoneyPurse);
    moneyIssuerP = E(myMoneyPurseP).getIssuer();

    myStockPurseP = E.resolve(myStockPurse);
    stockIssuerP = E(myStockPurseP).getIssuer();

    myFinPurseP = E.resolve(myFinPurse);
    finIssuerP = E(myFinPurseP).getIssuer();

    initialized = true;
    // eslint-disable-next-line no-use-before-define
    return fred; // fred and init use each other
  }

  const fred = harden({
    init,
    acceptOptionOffer(allegedChitPaymentP) {
      log('++ fred.acceptOptionOffer starting');
      insist(initialized)`\
ERR: fred.acceptOptionOffer called before init()`;

      const dough10 = harden({
        label: {
          issuer: moneyIssuerP,
          description: 'dough',
        },
        quantity: 10,
      });
      const wonka7 = harden({
        label: {
          issuer: stockIssuerP,
          description: 'wonka',
        },
        quantity: 7,
      });
      const fin55 = harden({
        label: {
          issuer: finIssuerP,
          description: 'fins',
        },
        quantity: 55,
      });

      const allegedMetaAmountP = E(allegedChitPaymentP).getXferBalance();

      const verifiedChitP = E.resolve(allegedMetaAmountP).then(
        allegedMetaAmount => {
          const allegedBaseOptionsChitIssuer =
            allegedMetaAmount.quantity.label.description.terms[1];

          const metaOptionAmountP = exchangeChitAmount(
            chitIssuerP,
            allegedBaseOptionsChitIssuer.quantity.label.identity,
            coveredCallSrc,
            [dough10, wonka7, timerP, 'singularity'],
            'holder',
            dough10,
            wonka7,
          );

          const metaOptionSaleAmountP = exchangeChitAmount(
            chitIssuerP,
            allegedMetaAmount.quantity.label.identity,
            escrowExchangeSrc,
            [fin55, metaOptionAmountP],
            0,
            fin55,
            metaOptionAmountP,
          );

          return E.resolve(metaOptionSaleAmountP).then(metaOptionSaleAmount =>
            E(chitIssuerP).getExclusive(
              metaOptionSaleAmount,
              allegedChitPaymentP,
              'verified chit',
            ),
          );
        },
      );
      const seatP = E(host).redeem(verifiedChitP);
      const finPaymentP = E(myFinPurseP).withdraw(55);
      E(seatP).offer(finPaymentP);
      const optionChitPurseP = E(chitIssuerP).makeEmptyPurse();
      const gotOptionP = collect(
        seatP,
        optionChitPurseP,
        myFinPurseP,
        'fred buys escrowed option',
      );
      return E.resolve(gotOptionP).then(_ => {
        // Fred bought the option. Now fred tries to exercise the option.
        const optionChitPayment = E(optionChitPurseP).withdrawAll();
        const optionSeatP = E(host).redeem(optionChitPayment);
        return E.resolve(allComparable(dough10)).then(d10 => {
          const doughPaymentP = E(myMoneyPurseP).withdraw(d10);
          E(optionSeatP).offer(doughPaymentP);
          return collect(
            optionSeatP,
            myStockPurseP,
            myMoneyPurseP,
            'fred exercises option, buying stock',
          );
        });
      });
    },
  });
  return fred;
}

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeFred(host) {
        return harden(makeFred(E, host, log));
      },
    }),
  );
}
export default harden(setup);
