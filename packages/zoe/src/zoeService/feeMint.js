// @ts-check

import { makeIssuerKit } from '@agoric/ertp';

import { makeHandle } from '../makeHandle.js';

const { details: X } = assert;
/**
 * @param {FeeIssuerConfig} feeIssuerConfig
 * @returns {{
 *    feeMintAccess: FeeMintAccess,
 *    getFeeIssuerKit: GetFeeIssuerKit,
 *    feeIssuer: Issuer }}
 */
const createFeeMint = feeIssuerConfig => {
  /** @type {IssuerKit} */
  const feeIssuerKit = makeIssuerKit(
    feeIssuerConfig.name,
    feeIssuerConfig.assetKind,
    feeIssuerConfig.displayInfo,
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

  return harden({
    feeMintAccess,
    getFeeIssuerKit,
    feeIssuer: feeIssuerKit.issuer,
  });
};

export { createFeeMint };
