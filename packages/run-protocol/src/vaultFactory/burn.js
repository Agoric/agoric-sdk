// @ts-check
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';

/**
 * @param {ContractFacet} zcf
 * @param {ZCFMint} zcfMint
 * @param {Amount} amount
 */
export const paymentFromZCFMint = async (zcf, zcfMint, amount) => {
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains(harden({ Temp: amount }), zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout('Temp');
};
