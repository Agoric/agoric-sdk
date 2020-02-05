// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';
import { allComparable } from '@agoric/same-structure';

import { makeCollect } from '../../../src/contractHost';

function makeAliceMaker(E, host, log) {
  const collect = makeCollect(E, log);

  // TODO BUG: All callers should wait until settled before doing
  // anything that would change the balance before show*Balance* reads
  // it.
  function showPaymentBalance(name, paymentP) {
    return E(paymentP)
      .getBalance()
      .then(units => log(name, ' balance ', units))
      .catch(err => console.log(err));
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
      const inviteAssayP = E(host).getInviteAssay();

      const alice = harden({
        payBobWell(bob) {
          log('++ alice.payBobWell starting');
          const paymentP = E(myMoneyPurseP).withdraw(10);
          return E(bob).buy('shoe', paymentP);
        },

        acceptInvite(allegedInvitePaymentP, checkerPaymentP) {
          function checkThenClaim(terms, checkerP, allegedInviteUnits) {
            const [left, right, escrowExchangeInstallation] = terms;
            return E(checkerP)
              .checkUnits(
                escrowExchangeInstallation,
                allegedInviteUnits,
                { left, right },
                'left',
              )
              .then(() => {
                return E(inviteAssayP).claimExactly(
                  allegedInviteUnits,
                  allegedInvitePaymentP,
                  'verified invite',
                );
              });
          }

          log('++ alice.acceptInvite starting');
          return E(host)
            .redeem(checkerPaymentP)
            .then(checkerP => {
              showPaymentBalance('alice invite', allegedInvitePaymentP);
              const clams10P = E(E(myMoneyPurseP).getAssay()).makeUnits(10);
              const fudco7P = E(E(myStockPurseP).getAssay()).makeUnits(7);
              const verifiedInvitePaymentP = E(allegedInvitePaymentP)
                .getBalance()
                .then(allegedInviteUnits => {
                  return Promise.all([
                    clams10P,
                    fudco7P,
                    escrowExchangeInstallationP,
                  ]).then(terms =>
                    checkThenClaim(terms, checkerP, allegedInviteUnits),
                  );
                });

              return Promise.resolve(
                showPaymentBalance('verified invite', verifiedInvitePaymentP),
              ).then(_ => {
                const seatP = E(host).redeem(verifiedInvitePaymentP);
                const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
                E(seatP).offer(moneyPaymentP);
                return collect(
                  seatP,
                  myStockPurseP,
                  myMoneyPurseP,
                  'alice escrow',
                );
              });
            });
        },

        acceptOption(allegedInviteP, checkerInviteP) {
          if (optFredP) {
            return alice.acceptOptionForFred(allegedInviteP, checkerInviteP);
          }
          return alice.acceptOptionDirectly(allegedInviteP, checkerInviteP);
        },

        acceptOptionDirectly(allegedInviteP, checkerPaymentP) {
          function checkThenClaim(installation, allegedInviteUnits, terms) {
            return E(host)
              .redeem(checkerPaymentP)
              .then(checkerP => {
                return E(checkerP)
                  .checkUnits(installation, allegedInviteUnits, terms)
                  .then(_ => {
                    return E(inviteAssayP).claimExactly(
                      allegedInviteUnits,
                      allegedInviteP,
                      'verified invite',
                    );
                  });
              });
          }

          log('++ alice.acceptOptionDirectly starting');
          showPaymentBalance('alice invite', allegedInviteP);
          const allegedInviteUnitsP = E(allegedInviteP).getBalance();
          const verifiedInvitePaymentP = Promise.resolve(
            allegedInviteUnitsP,
          ).then(allegedInviteUnits => {
            const smackers10P = E(E(myMoneyPurseP).getAssay()).makeUnits(10);
            const yoyodyne7P = E(E(myStockPurseP).getAssay()).makeUnits(7);
            const coveredCallTermsP = harden([
              coveredCallInstallationP,
              smackers10P,
              yoyodyne7P,
              timerP,
              'singularity',
            ]);
            return Promise.resolve(allComparable(coveredCallTermsP)).then(
              termsPlus => {
                const installation = termsPlus[0];
                const terms = termsPlus.slice(1);
                return checkThenClaim(installation, allegedInviteUnits, terms);
              },
            );
          });

          return Promise.resolve(
            showPaymentBalance('verified invite', verifiedInvitePaymentP),
          ).then(_ => {
            const seatP = E(host).redeem(verifiedInvitePaymentP);
            const moneyPaymentP = E(myMoneyPurseP).withdraw(10);
            E(seatP).offer(moneyPaymentP);
            return collect(seatP, myStockPurseP, myMoneyPurseP, 'alice option');
          });
        },

        acceptOptionForFred(allegedInvitePaymentP, coveredCallCheckerInviteP) {
          log('++ alice.acceptOptionForFred starting');
          const finNeededP = E(E(myOptFinPurseP).getAssay()).makeUnits(55);
          const inviteNeededP = E(allegedInvitePaymentP).getBalance();

          const terms = harden({ left: finNeededP, right: inviteNeededP });
          return E(escrowExchangeInstallationP)
            .spawn(terms)
            .then(({ rootObject }) => {
              const fredInvitePaymentP = rootObject.then(invitePayments =>
                E(invitePayments).left(),
              );
              const aliceForFredInvitePaymentP = rootObject.then(
                invitePayments => E(invitePayments).right(),
              );
              const escrowCheckerInviteP = E(rootObject).checker();

              const doneP = Promise.all([
                E(optFredP).acceptOptionOffer(
                  fredInvitePaymentP,
                  coveredCallCheckerInviteP,
                  escrowCheckerInviteP,
                ),
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
            });
        },

        completeOptionsSale(aliceForFredInvitePaymentP, allegedInvitePaymentP) {
          log('++ alice.completeOptionsSale starting');
          const aliceForFredSeatP = E(host).redeem(aliceForFredInvitePaymentP);

          E(aliceForFredSeatP).offer(allegedInvitePaymentP);
          const myInvitePurseP = E(inviteAssayP).makeEmptyPurse();
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
