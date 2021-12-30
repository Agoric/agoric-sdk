// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@agoric/marshal';
import { assert, details as X, q } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

const build = async (log, zoe, brands, payments, timer) => {
  const [moolaBrand] = brands;
  const [moolaPayment] = payments;

  const oneLoanWithInterest = async vaultFactory => {
    log(`=> alice.oneLoanWithInterest called`);

    const runIssuer = await E(vaultFactory).getRunIssuer();
    const runBrand = await E(runIssuer).getBrand();

    const loanSeat = await E(zoe).offer(
      E(vaultFactory).makeLoanInvitation(),
      harden({
        give: { Collateral: AmountMath.make(moolaBrand, 100n) },
        want: { RUN: AmountMath.make(runBrand, 500000n) },
      }),
      harden({
        Collateral: moolaPayment,
      }),
    );

    const { vault, _liquidationPayout } = await E(loanSeat).getOfferResult();
    log(`Alice owes ${q(await E(vault).getDebtAmount())} after borrowing`);
    await E(timer).tick();
    log(`Alice owes ${q(await E(vault).getDebtAmount())} after interest`);
  };

  return Far('build', {
    startTest: async (testName, vaultFactory) => {
      switch (testName) {
        case 'oneLoanWithInterest': {
          return oneLoanWithInterest(vaultFactory);
        }
        default: {
          assert.fail(X`testName ${testName} not recognized`);
        }
      }
    },
  });
};

export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (...args) => build(vatPowers.testLog, ...args),
  });
}
