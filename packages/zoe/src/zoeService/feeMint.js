// @ts-check

import { makeIssuerKit, AmountMath } from '@agoric/ertp';

import { makeHandle } from '../makeHandle.js';

const { details: X } = assert;
/**
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @param {ShutdownWithFailure} shutdownZoeVat
 * @returns {{
 *    feeMintAccess: FeeMintAccess,
 *    getFeeIssuerKit: GetFeeIssuerKit,
 *    feeIssuer: Issuer,
 *    feeBrand: Brand,
 *    initialFeeFunds: Payment,
 * }}
 */
const createFeeMint = (feeIssuerConfig, shutdownZoeVat) => {
  /** @type {IssuerKit} */
  const feeIssuerKit = makeIssuerKit(
    feeIssuerConfig.name,
    feeIssuerConfig.assetKind,
    feeIssuerConfig.displayInfo,
    shutdownZoeVat,
  );

  /** @type {FeeMintAccess} */
  const feeMintAccess = makeHandle('feeMintAccess');

  /** @type {GetFeeIssuerKit} */
  const getFeeIssuerKit = allegedFeeMintAccess => {
    assert(
      feeMintAccess === allegedFeeMintAccess,
      X`The object representing access to the fee brand mint was not provided`,
    );
    return feeIssuerKit;
  };

  const initialFeeFunds = feeIssuerKit.mint.mintPayment(
    AmountMath.make(feeIssuerKit.brand, feeIssuerConfig.initialFunds),
  );

  return harden({
    feeMintAccess,
    getFeeIssuerKit,
    feeIssuer: feeIssuerKit.issuer,
    feeBrand: feeIssuerKit.brand,
    initialFeeFunds,
  });
};

export { createFeeMint };
