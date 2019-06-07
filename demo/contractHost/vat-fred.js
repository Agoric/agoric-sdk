// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { allComparable } from '../../util/sameStructure';
import { makeCollect } from '../../core/contractHost';

function makeFredMaker(E, host, log) {
  const collect = makeCollect(E, log);

  return harden({
    make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      myMoneyPurseP,
      myStockPurseP,
      myFinPurseP,
    ) {
      const inviteIssuerP = E(host).getInviteIssuer();
      const inviteIssuerLabel = harden({
        issuer: inviteIssuerP,
        description: 'contract host',
      });
      const moneyIssuerP = E(myMoneyPurseP).getIssuer();
      const stockIssuerP = E(myStockPurseP).getIssuer();
      const finIssuerP = E(myFinPurseP).getIssuer();

      const fred = harden({
        acceptOptionOffer(allegedSaleInvitePaymentP) {
          log('++ fred.acceptOptionOffer starting');

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

          const allegedSaleAmountP = E(allegedSaleInvitePaymentP).getBalance();

          const verifiedSaleInvitePaymentP = E.resolve(allegedSaleAmountP).then(
            allegedSaleInviteAmount => {
              const allegedOptionsInviteAmount =
                allegedSaleInviteAmount.quantity.terms[1];

              const optionsInviteAmount = harden({
                label: inviteIssuerLabel,
                quantity: {
                  installation: coveredCallInstallationP,
                  terms: [
                    escrowExchangeInstallationP,
                    dough10,
                    wonka7,
                    timerP,
                    'singularity',
                  ],
                  seatIdentity:
                    allegedOptionsInviteAmount.quantity.seatIdentity,
                  seatDesc: 'holder',
                },
              });

              const saleInviteAmountP = allComparable(
                harden({
                  label: inviteIssuerLabel,
                  quantity: {
                    installation: escrowExchangeInstallationP,
                    terms: [fin55, optionsInviteAmount],
                    seatIdentity: allegedSaleInviteAmount.quantity.seatIdentity,
                    seatDesc: 'left',
                  },
                }),
              );

              return E.resolve(saleInviteAmountP).then(saleInviteAmount => {
                return E(inviteIssuerP).getExclusive(
                  saleInviteAmount,
                  allegedSaleInvitePaymentP,
                  'verified sale invite',
                );
              });
            },
          );

          const saleSeatP = E(host).redeem(verifiedSaleInvitePaymentP);
          const finPaymentP = E(myFinPurseP).withdraw(55);
          E(saleSeatP).offer(finPaymentP);
          const optionInvitePurseP = E(inviteIssuerP).makeEmptyPurse();
          const gotOptionP = collect(
            saleSeatP,
            optionInvitePurseP,
            myFinPurseP,
            'fred buys escrowed option',
          );
          return E.resolve(gotOptionP).then(_ => {
            // Fred bought the option. Now fred tries to exercise the option.
            const optionInvitePaymentP = E(optionInvitePurseP).withdrawAll();
            const optionSeatP = E(host).redeem(optionInvitePaymentP);
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
      makeFredMaker(host) {
        return harden(makeFredMaker(E, host, log));
      },
    }),
  );
}
export default harden(setup);
