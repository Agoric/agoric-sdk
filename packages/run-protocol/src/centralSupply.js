// @ts-check

import { AmountMath } from '@agoric/ertp';
import { E, Far } from '@endo/far';

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
  const { brand: runBrand } = runMint.getIssuerRecord();
  const { zcfSeat: bootstrapZCFSeat, userSeat: bootstrapUserSeat } =
    zcf.makeEmptySeatKit();
  runMint.mintGains(
    harden({
      Bootstrap: AmountMath.make(runBrand, bootstrapPaymentValue),
    }),
    bootstrapZCFSeat,
  );
  bootstrapZCFSeat.exit();
  const bootstrapPayment = await E(bootstrapUserSeat).getPayout('Bootstrap');

  return {
    creatorFacet: Far('creator', {
      getBootstrapPayment: () => bootstrapPayment,
    }),
  };
};
harden(start);
