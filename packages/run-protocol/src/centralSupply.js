// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E, Far } from '@endo/far';

const { details: X } = assert;

/**
 * The sole purpose of this contract is to mint the initial
 * supply of the central currency, RUN.
 *
 * @param {ContractFacet} zcf
 * @param {Object} privateArgs
 * @param {FeeMintAccess} privateArgs.feeMintAccess
 */
export const start = async (zcf, { feeMintAccess }) => {
  const { bootstrapPaymentValue } = zcf.getTerms();
  assert.typeof(bootstrapPaymentValue, 'bigint');

  const runMint = await zcf.registerFeeMint('RUN', feeMintAccess);
  const { brand: runBrand } = await E(runMint).getIssuerRecord();
  const mintBootstrapPayment = () => {
    const { zcfSeat: bootstrapZCFSeat, userSeat: bootstrapUserSeat } =
      zcf.makeEmptySeatKit();
    const bootstrapAmount = AmountMath.make(runBrand, bootstrapPaymentValue);
    runMint.mintGains(
      harden({
        Bootstrap: bootstrapAmount,
      }),
      bootstrapZCFSeat,
    );
    bootstrapZCFSeat.exit();
    const bootstrapPayment = E(bootstrapUserSeat).getPayout('Bootstrap');

    /**
     * @param {Amount=} expectedAmount - if provided, assert that the bootstrap
     * payment is at least the expected amount
     */
    const getBootstrapPayment = expectedAmount => {
      if (expectedAmount) {
        assert(
          AmountMath.isGTE(bootstrapAmount, expectedAmount),
          X`${bootstrapAmount} is not at least ${expectedAmount}`,
        );
      }
      return bootstrapPayment;
    };
    return getBootstrapPayment;
  };

  return {
    creatorFacet: Far('creator', {
      getBootstrapPayment: mintBootstrapPayment(),
    }),
  };
};
harden(start);
