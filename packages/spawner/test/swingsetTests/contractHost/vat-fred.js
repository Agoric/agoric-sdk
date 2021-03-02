// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { makeLocalAmountMath } from '@agoric/ertp';
import { allComparable } from '@agoric/same-structure';

import { makeCollect } from '../../../src/makeCollect';

function makeFredMaker(host, log) {
  const collect = makeCollect(E, log);

  return Far('fredMaker', {
    async make(
      escrowExchangeInstallationP,
      coveredCallInstallationP,
      timerP,
      moneyIssuerP,
      stockIssuerP,
      finIssuerP,
      myMoneyPaymentP,
      myStockPaymentP,
      myFinPaymentP,
    ) {
      const inviteIssuerP = E(host).getInvitationIssuer();
      const myMoneyPurseP = E(moneyIssuerP).makeEmptyPurse();
      const myStockPurseP = E(stockIssuerP).makeEmptyPurse();
      const myFinPurseP = E(finIssuerP).makeEmptyPurse();
      await E(myMoneyPurseP).deposit(myMoneyPaymentP);
      await E(myStockPurseP).deposit(myStockPaymentP);
      await E(myFinPaymentP).deposit(myFinPaymentP);

      const moneyMath = await makeLocalAmountMath(moneyIssuerP);
      const stockMath = await makeLocalAmountMath(stockIssuerP);
      const finMath = await makeLocalAmountMath(finIssuerP);
      const dough10 = moneyMath.make(10);
      const wonka7 = stockMath.make(7);
      const fin55 = finMath.make(55);

      const fred = Far('fred', {
        acceptOptionOffer(allegedSaleInvitePaymentP) {
          log('++ fred.acceptOptionOffer starting');

          const coveredCallTermsP = [dough10, wonka7, timerP, 'singularity'];
          const verifiedSaleInvitePaymentP = E(inviteIssuerP)
            .getAmountOf(allegedSaleInvitePaymentP)
            .then(allegedInviteUnits => {
              return Promise.resolve(allComparable(fin55)).then(f55 => {
                return E(escrowExchangeInstallationP)
                  .checkPartialUnits(allegedInviteUnits, f55, 'left')
                  .then(coveredCallUnits =>
                    Promise.all(coveredCallTermsP).then(terms => {
                      return E(coveredCallInstallationP)
                        .checkUnits(coveredCallUnits, terms)
                        .then(() => {
                          return E(inviteIssuerP).claimExactly(
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
          const optionInvitePurseP = E(inviteIssuerP).makeEmptyPurse();
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
            return Promise.resolve(allComparable(dough10)).then(d10 => {
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

export function buildRootObject(vatPowers) {
  return Far('root', {
    makeFredMaker(host) {
      return makeFredMaker(host, vatPowers.log);
    },
  });
}
