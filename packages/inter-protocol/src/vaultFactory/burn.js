// @jessie-check

import { E } from '@endo/eventual-send';

/**
 * @import {ZCF} from '@agoric/zoe';
 * @import {ZCFMint} from '@agoric/zoe';
 */

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
