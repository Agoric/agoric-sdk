// @ts-check
import '@agoric/zoe/exported';

import { E } from '@agoric/eventual-send';

/**
 * @param {ContractFacet} zcf
 * @param {ZCFMint} zcfMint
 * @param {Amount} amount
 */
export async function paymentFromZCFMint(zcf, zcfMint, amount) {
  const { zcfSeat, userSeat } = zcf.makeEmptySeatKit();
  zcfMint.mintGains({ Temp: amount }, zcfSeat);
  zcfSeat.exit();
  return E(userSeat).getPayout('Temp');
}
