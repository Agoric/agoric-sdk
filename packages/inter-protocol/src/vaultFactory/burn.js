// @jessie-check

/// <reference types="@agoric/zoe/exported" />

import { E } from '@endo/eventual-send';

/**
 * @param {ZCF} zcf
 * @param {ZCFMint} zcfMint
 * @param {Amount} amount
 */
export const paymentFromZCFMint = async (zcf, zcfMint, amount) => {
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains(harden({ Temp: amount }), zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout('Temp');
};
