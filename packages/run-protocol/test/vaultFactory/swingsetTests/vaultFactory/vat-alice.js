// @ts-check

import { E } from '@agoric/eventual-send';
import { Far } from '@endo/marshal';
import { assert, details as X, q } from '@agoric/assert';
import { AmountMath } from '@agoric/ertp';

/**
 *
 * @param {(msg: any)=> void} log
 * @param {ZoeService} zoe
 * @param {Brand[]} brands
 * @param {Payment[]} payments
 * @param {ManualTimer} timer configured to tick one day (@see setup.js)
 * @returns {Promise<{startTest: Function}>}
 */
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

    const { vault } = await E(loanSeat).getOfferResult();
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

/** @type {BuildRootObjectForTestVat} */
export function buildRootObject(vatPowers) {
  return Far('root', {
    build: (zoe, brands, payments, timer) =>
      build(vatPowers.testLog, zoe, brands, payments, timer),
  });
}
