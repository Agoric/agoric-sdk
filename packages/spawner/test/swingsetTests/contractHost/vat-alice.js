// Copyright (C) 2018 Agoric, under Apache License 2.0

/* global harden */
import { E } from '@agoric/eventual-send';
import { allComparable } from '@agoric/same-structure';
import makeAmountMath from '@agoric/ertp/src/amountMath';

import { makeCollect } from '../../../src/makeCollect';

function makeAliceMaker(host, log) {
  const collect = makeCollect(E, log);

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, issuer, paymentE) {
    return paymentE.then(payment => {
      return E(issuer)
        .getAmountOf(payment)
        .then(amount => log(name, ' balance ', amount))
        .catch(err => console.log(err));
    });
  }

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
      myOptFinPurseE = undefined,
      optFredE = undefined,
    ) {
      const inviteIssuerE = E(host).getInviteIssuer();

      const moneyMath = await getLocalAmountMath(moneyIssuerE);
      const stockMath = await getLocalAmountMath(stockIssuerE);

      const alice = harden({
        payBobWell(bob) {
          log('++ alice.payBobWell starting');
          const paymentE = E(myMoneyPurseE).withdraw(moneyMath.make(10));
          return E(bob).buy('shoe', paymentE);
        },

        acceptInvite(allegedInvitePaymentE) {
          log('++ alice.acceptInvite starting');
          showPaymentBalance('alice invite', allegedInvitePaymentE);
          const clams10 = moneyMath.make(10);
          const fudco7 = stockMath.make(7);
          const verifiedInvitePaymentE = E(inviteIssuerE)
            .getAmountOf(allegedInvitePaymentE)
            .then(inviteAmount => {
              return E(escrowExchangeInstallationE)
                .checkUnits(
                  inviteAmount,
                  { left: clams10, right: fudco7 },
                  'left',
                )
                .then(() => {
                  return E(inviteIssuerE).claim(
                    allegedInvitePaymentE,
                    inviteAmount,
                  );
                });
            });

          return Promise.resolve(
            showPaymentBalance(
              'verified invite',
              inviteIssuerE,
              verifiedInvitePaymentE,
            ),
          ).then(_ => {
            const seatE = E(host).redeem(verifiedInvitePaymentE);
            const moneyPaymentE = E(myMoneyPurseE).withdraw(moneyMath.make(10));
            E(seatE).offer(moneyPaymentE);
            return collect(seatE, myStockPurseE, myMoneyPurseE, 'alice escrow');
          });
        },

        acceptOption(allegedInvitePaymentE) {
          if (optFredE) {
            return alice.acceptOptionForFred(allegedInvitePaymentE);
          }
          return alice.acceptOptionDirectly(allegedInvitePaymentE);
        },

        acceptOptionDirectly(allegedInvitePaymentE) {
          log('++ alice.acceptOptionDirectly starting');
          showPaymentBalance(
            'alice invite',
            inviteIssuerE,
            allegedInvitePaymentE,
          );

          const inviteAmountE = E(inviteIssuerE).getAmountOf(
            allegedInvitePaymentE,
          );

          const verifiedInvitePaymentE = Promise.resolve(inviteAmountE).then(
            inviteAmount => {
              const smackers10 = moneyMath.make(10);
              const yoyodyne7 = stockMath.make(7);
              const coveredCallTermsE = harden([
                smackers10,
                yoyodyne7,
                timerE,
                'singularity',
              ]);
              return Promise.resolve(allComparable(coveredCallTermsE)).then(
                terms => {
                  return E(coveredCallInstallationE)
                    .checkUnits(inviteAmount, terms)
                    .then(_ => {
                      return E(inviteIssuerE).claim(
                        inviteAmount,
                        allegedInvitePaymentE,
                      );
                    });
                },
              );
            },
          );

          return Promise.resolve(
            showPaymentBalance(
              'verified invite',
              inviteIssuerE,
              verifiedInvitePaymentE,
            ),
          ).then(_ => {
            const seatE = E(host).redeem(verifiedInvitePaymentE);
            const moneyPaymentE = E(myMoneyPurseE).withdraw(moneyMath.make(10));
            E(seatE).offer(moneyPaymentE);
            return collect(seatE, myStockPurseE, myMoneyPurseE, 'alice option');
          });
        },

        acceptOptionForFred(allegedInvitePaymentE) {
          log('++ alice.acceptOptionForFred starting');
          const finNeeded = moneyMath.make(55);
          const inviteNeededE = E(inviteIssuerE).getAmountOf(
            allegedInvitePaymentE,
          );

          const terms = harden({ left: finNeeded, right: inviteNeededE });
          const invitePaymentsE = E(escrowExchangeInstallationE).spawn(terms);
          const fredInvitePaymentE = invitePaymentsE.then(
            invitePayments => invitePayments.left,
          );
          const aliceForFredInvitePaymentE = invitePaymentsE.then(
            invitePayments => invitePayments.right,
          );
          const doneE = Promise.all([
            E(optFredE).acceptOptionOffer(fredInvitePaymentE),
            E(alice).completeOptionsSale(
              aliceForFredInvitePaymentE,
              allegedInvitePaymentE,
            ),
          ]);
          doneE.then(
            _res => log('++ alice.acceptOptionForFred done'),
            rej => log('++ alice.acceptOptionForFred reject: ', rej),
          );
          return doneE;
        },

        completeOptionsSale(aliceForFredInvitePaymentE, allegedInvitePaymentE) {
          log('++ alice.completeOptionsSale starting');
          const aliceForFredSeatE = E(host).redeem(aliceForFredInvitePaymentE);

          E(aliceForFredSeatE).offer(allegedInvitePaymentE);
          const myInvitePurseE = E(inviteIssuerE).makeEmptyPurse();
          return collect(
            aliceForFredSeatE,
            myOptFinPurseE,
            myInvitePurseE,
            'alice options sale',
          );
        },
      });
      return alice;
    },
  });
}

export function buildRootObject(vatPowers) {
  return harden({
    makeAliceMaker(host) {
      return harden(makeAliceMaker(host, vatPowers.log));
    },
  });
}
