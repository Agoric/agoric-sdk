// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { allComparable } from '../../collections/sameStructure';
import { insist } from '../../collections/insist';
import { escrowExchangeSrc } from './escrow';
import { coveredCallSrc } from './coveredCall';
import { exchangeInviteAmount, makeCollect } from './contractHost';

function makeFred(E, host, log) {
  const collect = makeCollect(E, log);

  let initialized = false;
  let timerP;
  let inviteIssuerP;

  let myMoneyPurseP;
  let moneyIssuerP;

  let myStockPurseP;
  let stockIssuerP;

  let myFinPurseP;
  let finIssuerP;

  function init(timer, myMoneyPurse, myStockPurse, myFinPurse) {
    timerP = E.resolve(timer);
    inviteIssuerP = E(host).getInviteIssuer();

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
    acceptOptionOffer(allegedInvitePaymentP) {
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

      const allegedMetaAmountP = E(allegedInvitePaymentP).getXferBalance();

      const verifiedInviteP = E.resolve(allegedMetaAmountP).then(
        allegedMetaAmount => {
          const allegedBaseOptionsInviteIssuer =
            allegedMetaAmount.quantity.label.description.terms[1];

          const metaOptionAmountP = exchangeInviteAmount(
            inviteIssuerP,
            allegedBaseOptionsInviteIssuer.quantity.label.identity,
            coveredCallSrc,
            [dough10, wonka7, timerP, 'singularity'],
            'holder',
            dough10,
            wonka7,
          );

          const metaOptionSaleAmountP = exchangeInviteAmount(
            inviteIssuerP,
            allegedMetaAmount.quantity.label.identity,
            escrowExchangeSrc,
            [fin55, metaOptionAmountP],
            0,
            fin55,
            metaOptionAmountP,
          );

          return E.resolve(metaOptionSaleAmountP).then(metaOptionSaleAmount =>
            E(inviteIssuerP).getExclusive(
              metaOptionSaleAmount,
              allegedInvitePaymentP,
              'verified invite',
            ),
          );
        },
      );
      const seatP = E(host).redeem(verifiedInviteP);
      const finPaymentP = E(myFinPurseP).withdraw(55);
      E(seatP).offer(finPaymentP);
      const optionInvitePurseP = E(inviteIssuerP).makeEmptyPurse();
      const gotOptionP = collect(
        seatP,
        optionInvitePurseP,
        myFinPurseP,
        'fred buys escrowed option',
      );
      return E.resolve(gotOptionP).then(_ => {
        // Fred bought the option. Now fred tries to exercise the option.
        const optionInvitePayment = E(optionInvitePurseP).withdrawAll();
        const optionSeatP = E(host).redeem(optionInvitePayment);
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
