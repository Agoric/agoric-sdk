// @jessie-check

import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * @import {ZCF} from '@agoric/zoe';
 * @import {ZCFSeat} from '@agoric/zoe';
 * @import {Invitation} from '@agoric/zoe';
 */

/**
 * Provide shared support for providing access to fees from a service contract.
 *
 * @param {ZCF} zcf
 * @param {ZCFSeat} feeSeat
 * @param {Brand} feeBrand
 * @param {string} keyword
 * @returns {Promise<Invitation<string>>}
 */
export const makeCollectFeesInvitation = (zcf, feeSeat, feeBrand, keyword) => {
  const collectFees = seat => {
    const amount = feeSeat.getAmountAllocated(keyword, feeBrand);
    atomicTransfer(zcf, feeSeat, seat, { [keyword]: amount }, { Fee: amount });

    seat.exit();
    return `paid out ${amount.value}`;
  };

  return zcf.makeInvitation(collectFees, 'collect fees');
};
