// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { makeCollect } from '../../../core/contractHost';
import { allComparable } from '../../../util/sameStructure';

function makeAliceMaker(E, host, log) {
  const collect = makeCollect(E, log);

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getBalance()
      .then(amount => log(name, ' balance ', amount));
  }

  return harden({
    make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      myMoneyPurseP,
      myStockPurseP,
      myOptFinPurseP = undefined,
      optFredP = undefined,
    ) {
      const inviteIssuerP = E(host).getInviteIssuer();

      const alice = harden({
        payBobWell(bob) {
          log('++ alice.payBobWell starting');
          const paymentP = E(myMoneyPurseP).withdraw(10);
          return E(bob).buy('shoe', paymentP);
        },

        acceptInvite(allegedInvitePaymentP) {
          log('++ alice.acceptInvite starting');
          showPaymentBalance('alice invite', allegedInvitePaymentP);
          const clams10P = E(E(myMoneyPurseP).getIssuer()).makeAmount(10);
          const fudco7P = E(E(myStockPurseP).getIssuer()).makeAmount(7);
          const verifiedInvitePaymentP = E(allegedInvitePaymentP)
            .getBalance()
            .then(allegedInviteAmount => {
              return E.resolve(Promise.all([clams10P, fudco7P])).then(terms => {
                const [left, right] = terms;
                return E(escrowExchangeInstallationP)
                  .checkAmount(allegedInviteAmount, { left, right }, 'left')
                  .then(() => {
                    return E(inviteIssuerP).claim(
                      allegedInviteAmount,
                      allegedInvitePaymentP,
                      'verified invite',
                    );
                  });
              });
            });

          return E.resolve(
            showPaymentBalance('verified invite', verifiedInvitePaymentP),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInvitePaymentP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
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
          showPaymentBalance('alice invite', allegedInvitePaymentP);

          const allegedInviteAmountP = E(allegedInvitePaymentP).getBalance();

          const verifiedInvitePaymentP = E.resolve(allegedInviteAmountP).then(
            allegedInviteAmount => {
              const smackers10P = E(E(myMoneyPurseP).getIssuer()).makeAmount(
                10,
              );
              const yoyodyne7P = E(E(myStockPurseP).getIssuer()).makeAmount(7);
              const coveredCallTermsP = harden([
                smackers10P,
                yoyodyne7P,
                timerP,
                'singularity',
              ]);
              return E.resolve(allComparable(coveredCallTermsP)).then(terms => {
                return E(coveredCallInstallationP)
                  .checkAmount(allegedInviteAmount, terms)
                  .then(_ => {
                    return E(inviteIssuerP).claim(
                      allegedInviteAmount,
                      allegedInvitePaymentP,
                      'verified invite',
                    );
                  });
              });
            },
          );

          return E.resolve(
            showPaymentBalance('verified invite', verifiedInvitePaymentP),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInvitePaymentP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
            E(seatP).offer(moneyPaymentP);
            return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice option');
          });
        },

        acceptOptionForFred(allegedInvitePaymentP) {
          log('++ alice.acceptOptionForFred starting');
          const finNeededP = E(E(myOptFinPurseP).getIssuer()).makeAmount(55);
          const inviteNeededP = E(allegedInvitePaymentP).getBalance();

          const terms = harden({ left: finNeededP, right: inviteNeededP });
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

function setup(syscall, state, helpers) {
  function log(...args) {
    helpers.log(...args);
    console.log(...args);
  }
  return helpers.makeLiveSlots(syscall, state, E =>
    harden({
      makeAliceMaker(host) {
        return harden(makeAliceMaker(E, host, log));
      },
    }),
  );
}
export default harden(setup);
