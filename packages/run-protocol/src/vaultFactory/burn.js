// @ts-check
import '@agoric/zoe/exported.js';

import { E } from '@agoric/eventual-send';

// No burning going on here. Why is this file named burn.js ?
// Should this be moved to the contractSupport library of helpers?

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
