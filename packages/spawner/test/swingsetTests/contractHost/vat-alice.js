// Copyright (C) 2018 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { allComparable } from '@agoric/same-structure';
import { makeLocalAmountMath } from '@agoric/ertp';

import { makeCollect } from '../../../src/makeCollect';

function makeAliceMaker(host, log) {
  const collect = makeCollect(E, log);

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, issuer, paymentP) {
    return paymentP.then(payment => {
      return E(issuer)
        .getAmountOf(payment)
        .then(amount => log(name, ' balance ', amount))
        .catch(err => console.log(err));
    });
  }

  return Far('aliceMaker', {
    async make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      moneyIssuerP,
      stockIssuerP,
      myMoneyPurseP,
      myStockPurseP,
      myOptFinPurseP = undefined,
      optFredP = undefined,
    ) {
      const inviteIssuerP = E(host).getInvitationIssuer();

      const moneyMath = await makeLocalAmountMath(moneyIssuerP);
      const stockMath = await makeLocalAmountMath(stockIssuerP);

      const alice = Far('alice', {
        payBobWell(bob) {
          log('++ alice.payBobWell starting');
          const paymentP = E(myMoneyPurseP).withdraw(moneyMath.make(10));
          return E(bob).buy('shoe', paymentP);
        },

        acceptInvite(allegedInvitePaymentP) {
          log('++ alice.acceptInvite starting');
          showPaymentBalance('alice invite', allegedInvitePaymentP);
          const clams10 = moneyMath.make(10);
          const fudco7 = stockMath.make(7);
          const verifiedInvitePaymentP = E(inviteIssuerP)
            .getAmountOf(allegedInvitePaymentP)
            .then(inviteAmount => {
              return E(escrowExchangeInstallationP)
                .checkUnits(
                  inviteAmount,
                  { left: clams10, right: fudco7 },
                  'left',
                )
                .then(() => {
                  return E(inviteIssuerP).claim(
                    allegedInvitePaymentP,
                    inviteAmount,
                  );
                });
            });

          return Promise.resolve(
            showPaymentBalance(
              'verified invite',
              inviteIssuerP,
              verifiedInvitePaymentP,
            ),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInvitePaymentP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(moneyMath.make(10));
            E(seatP).offer(moneyPaymentP);
            return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice escrow');
          });
        },

        acceptOption(allegedInvitePaymentP) {
          if (optFredP) {
            return alice.acceptOptionForFred(allegedInvitePaymentP);
          }
          return alice.acceptOptionDirectly(allegedInvitePaymentP);
        },

        acceptOptionDirectly(allegedInvitePaymentP) {
          log('++ alice.acceptOptionDirectly starting');
          showPaymentBalance(
            'alice invite',
            inviteIssuerP,
            allegedInvitePaymentP,
          );

          const inviteAmountP = E(inviteIssuerP).getAmountOf(
            allegedInvitePaymentP,
          );

          const verifiedInvitePaymentP = Promise.resolve(inviteAmountP).then(
            inviteAmount => {
              const smackers10 = moneyMath.make(10);
              const yoyodyne7 = stockMath.make(7);
              const coveredCallTermsP = harden([
                smackers10,
                yoyodyne7,
                timerP,
                'singularity',
              ]);
              return Promise.resolve(allComparable(coveredCallTermsP)).then(
                terms => {
                  return E(coveredCallInstallationP)
                    .checkUnits(inviteAmount, terms)
                    .then(_ => {
                      return E(inviteIssuerP).claim(
                        inviteAmount,
                        allegedInvitePaymentP,
                      );
                    });
                },
              );
            },
          );

          return Promise.resolve(
            showPaymentBalance(
              'verified invite',
              inviteIssuerP,
              verifiedInvitePaymentP,
            ),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInvitePaymentP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(moneyMath.make(10));
            E(seatP).offer(moneyPaymentP);
            return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice option');
          });
        },

        acceptOptionForFred(allegedInvitePaymentP) {
          log('++ alice.acceptOptionForFred starting');
          const finNeeded = moneyMath.make(55);
          const inviteNeededP = E(inviteIssuerP).getAmountOf(
            allegedInvitePaymentP,
          );

          const terms = harden({ left: finNeeded, right: inviteNeededP });
          const invitePaymentsP = E(escrowExchangeInstallationP).spawn(terms);
          const fredInvitePaymentP = invitePaymentsP.then(
            invitePayments => invitePayments.left,
          );
          const aliceForFredInvitePaymentP = invitePaymentsP.then(
            invitePayments => invitePayments.right,
          );
          const doneP = Promise.all([
            E(optFredP).acceptOptionOffer(fredInvitePaymentP),
            E(alice).completeOptionsSale(
              aliceForFredInvitePaymentP,
              allegedInvitePaymentP,
            ),
          ]);
          doneP.then(
            _res => log('++ alice.acceptOptionForFred done'),
            rej => log('++ alice.acceptOptionForFred reject: ', rej),
          );
          return doneP;
        },

        completeOptionsSale(aliceForFredInvitePaymentP, allegedInvitePaymentP) {
          log('++ alice.completeOptionsSale starting');
          const aliceForFredSeatP = E(host).redeem(aliceForFredInvitePaymentP);

          E(aliceForFredSeatP).offer(allegedInvitePaymentP);
          const myInvitePurseP = E(inviteIssuerP).makeEmptyPurse();
          return collect(
            aliceForFredSeatP,
            myOptFinPurseP,
            myInvitePurseP,
            'alice options sale',
          );
        },
      });
      return alice;
    },
  });
}

export function buildRootObject(vatPowers) {
  return Far('root', {
    makeAliceMaker(host) {
      return makeAliceMaker(host, vatPowers.log);
    },
  });
}
