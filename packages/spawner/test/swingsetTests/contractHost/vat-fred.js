// Copyright (C) 2013 Google Inc, under Apache License 2.0
// Copyright (C) 2018 Agoric, under Apache License 2.0

/* global harden */
import { E } from '@agoric/eventual-send';
import makeAmountMath from '@agoric/ertp/src/amountMath';
import { allComparable } from '@agoric/same-structure';

import { makeCollect } from '../../../src/makeCollect';

function makeFredMaker(host, log) {
  const collect = makeCollect(E, log);

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
      finIssuerE,
      myMoneyPaymentE,
      myStockPaymentE,
      myFinPaymentE,
    ) {
      const inviteIssuerE = E(host).getInviteIssuer();
      const myMoneyPurseE = E(moneyIssuerE).makeEmptyPurse();
      const myStockPurseE = E(stockIssuerE).makeEmptyPurse();
      const myFinPurseE = E(finIssuerE).makeEmptyPurse();
      await E(myMoneyPurseE).deposit(myMoneyPaymentE);
      await E(myStockPurseE).deposit(myStockPaymentE);
      await E(myFinPaymentE).deposit(myFinPaymentE);

      const moneyMath = await getLocalAmountMath(moneyIssuerE);
      const stockMath = await getLocalAmountMath(stockIssuerE);
      const finMath = await getLocalAmountMath(finIssuerE);
      const dough10 = moneyMath.make(10);
      const wonka7 = stockMath.make(7);
      const fin55 = finMath.make(55);

      const fred = harden({
        acceptOptionOffer(allegedSaleInvitePaymentE) {
          log('++ fred.acceptOptionOffer starting');

          const coveredCallTermsE = [dough10, wonka7, timerE, 'singularity'];
          const verifiedSaleInvitePaymentE = E(inviteIssuerE)
            .getAmountOf(allegedSaleInvitePaymentE)
            .then(allegedInviteUnits => {
              return Promise.resolve(allComparable(fin55)).then(f55 => {
                return E(escrowExchangeInstallationE)
                  .checkPartialUnits(allegedInviteUnits, f55, 'left')
                  .then(coveredCallUnits =>
                    Promise.all(coveredCallTermsE).then(terms => {
                      return E(coveredCallInstallationE)
                        .checkUnits(coveredCallUnits, terms)
                        .then(() => {
                          return E(inviteIssuerE).claimExactly(
                            allegedInviteUnits,
                            allegedSaleInvitePaymentE,
                            'verified sale invite',
                          );
                        });
                    }),
                  );
              });
            });

          const saleSeatE = E(host).redeem(verifiedSaleInvitePaymentE);
          const finPaymentE = E(myFinPurseE).withdraw(55);
          E(saleSeatE).offer(finPaymentE);
          const optionInvitePurseE = E(inviteIssuerE).makeEmptyPurse();
          const gotOptionE = collect(
            saleSeatE,
            optionInvitePurseE,
            myFinPurseE,
            'fred buys escrowed option',
          );
          return Promise.resolve(gotOptionE).then(_ => {
            // Fred bought the option. Now fred tries to exercise the option.
            const optionInvitePaymentE = E(optionInvitePurseE).withdrawAll();
            const optionSeatE = E(host).redeem(optionInvitePaymentE);
            return Promise.resolve(allComparable(dough10)).then(d10 => {
              const doughPaymentE = E(myMoneyPurseE).withdraw(d10);
              E(optionSeatE).offer(doughPaymentE);
              return collect(
                optionSeatE,
                myStockPurseE,
                myMoneyPurseE,
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
  return harden({
    makeFredMaker(host) {
      return harden(makeFredMaker(host, vatPowers.log));
    },
  });
}
