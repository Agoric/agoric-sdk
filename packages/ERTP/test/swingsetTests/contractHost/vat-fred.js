// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import harden from '@agoric/harden';

import { allComparable } from '../../../util/sameStructure';
import { makeCollect } from '../../../core/contractHost';

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
      const inviteAssayP = E(host).getInviteAssay();
      const dough10P = E(E(myMoneyPurseP).getAssay()).makeUnits(10);
      const wonka7P = E(E(myStockPurseP).getAssay()).makeUnits(7);
      const fin55P = E(E(myFinPurseP).getAssay()).makeUnits(55);

      const fred = harden({
        acceptOptionOffer(allegedSaleInvitePaymentP) {
          log('++ fred.acceptOptionOffer starting');

          const coveredCallTermsP = [dough10P, wonka7P, timerP, 'singularity'];
          const verifiedSaleInvitePaymentP = E(allegedSaleInvitePaymentP)
            .getBalance()
            .then(allegedInviteUnits => {
              return Promise.resolve(allComparable(fin55P)).then(f55 => {
                return E(escrowExchangeInstallationP)
                  .checkPartialUnits(allegedInviteUnits, f55, 'left')
                  .then(coveredCallUnits =>
                    Promise.all(coveredCallTermsP).then(terms => {
                      return E(coveredCallInstallationP)
                        .checkUnits(coveredCallUnits, terms)
                        .then(() => {
                          return E(inviteAssayP).claimExactly(
                            allegedInviteUnits,
                            allegedSaleInvitePaymentP,
                            'verified sale invite',
                          );
                        });
                    }),
                  );
              });
            });

          const saleSeatP = E(host).redeem(verifiedSaleInvitePaymentP);
          const finPaymentP = E(myFinPurseP).withdraw(55);
          E(saleSeatP).offer(finPaymentP);
          const optionInvitePurseP = E(inviteAssayP).makeEmptyPurse();
          const gotOptionP = collect(
            saleSeatP,
            optionInvitePurseP,
            myFinPurseP,
            'fred buys escrowed option',
          );
          return Promise.resolve(gotOptionP).then(_ => {
            // Fred bought the option. Now fred tries to exercise the option.
            const optionInvitePaymentP = E(optionInvitePurseP).withdrawAll();
            const optionSeatP = E(host).redeem(optionInvitePaymentP);
            return Promise.resolve(allComparable(dough10P)).then(d10 => {
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
