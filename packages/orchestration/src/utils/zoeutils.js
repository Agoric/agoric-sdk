import { Fail } from '@agoric/assert';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * @import {ChainAddress} from '../types.js';
 * @import {OrchestrationAccount} from './types.js';
 */

export const makeZoeUtils = (zone, { zcf, vowTools }) => {
  /**
   * Transfer the assets for a specific keyword from a seat to a local account.
   *
   * @param {ZCFSeat} srcSeat
   * @param {OrchestrationAccount<any>} localAccount
   * @param {AmountKeywordRecord} give
   * @returns {Promise<void>}
   */
  const localTransfer = async (srcSeat, localAccount, give) => {
    !srcSeat.hasExited() || Fail`The seat cannot have exited.`;
    const [[kw, _amt]] = Object.entries(give);
    const { zcfSeat: tempSeat, userSeat: userSeatP } = zcf.makeEmptySeatKit();
    const userSeat = await userSeatP;
    // TODO get the userSeat into baggage so it's at least recoverable
    atomicTransfer(zcf, srcSeat, tempSeat, give);
    tempSeat.exit();
    // Now all the `give` are accessible, so we can move them to the localAccount`
    const pmt = await userSeat.getPayout(kw);
    return localAccount.deposit(pmt);
    // remove userSeat from baggage
  };

  /**
   * Transfer the `give` a seat to a local account.
   *
   * @param {ZCFSeat} srcSeat
   * @param {OrchestrationAccount<any>} localAccount
   * @param {AmountKeywordRecord} give
   * @returns {Promise<void>}
   */
  const localTransferAll = async (srcSeat, localAccount, give) => {
    !srcSeat.hasExited() || Fail`The seat cannot have exited.`;

    const { zcfSeat: tempSeat, userSeat: userSeatP } = zcf.makeEmptySeatKit();
    const userSeat = await userSeatP;
    // TODO get the userSeat into baggage so it's at least recoverable
    atomicTransfer(zcf, srcSeat, tempSeat, give);
    tempSeat.exit();

    // Now all the `give` are accessible, so we can move them to the localAccount`

    const promises = Object.entries(give).map(async ([kw, _amount]) => {
      const pmt = await userSeat.getPayout(kw);
      // TODO arrange recovery on upgrade of pmt?
      return localAccount.deposit(pmt);
    });
    await Promise.all(promises);
    // remove userSeat from baggage
  };

  return harden({
    localTransfer: vowTools.retriable(zone, 'localTransfer', localTransfer),
    localTransferAll: vowTools.retriable(
      zone,
      'localTransferAll',
      localTransferAll,
    ),
  });
};
