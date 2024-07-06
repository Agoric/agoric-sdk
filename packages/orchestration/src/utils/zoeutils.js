import { Fail } from '@endo/errors';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * @import {ChainAddress} from '../types.js';
 * @import {OrchestrationAccount} from './types.js';
 */

export const makeZoeUtils = (zone, { zcf, vowTools }) => {
  /**
   * Transfer the `give` a seat to a local account.
   *
   * @param {ZCFSeat} srcSeat
   * @param {OrchestrationAccount<any>} localAccount
   * @param {AmountKeywordRecord} give
   * @returns {Promise<void>}
   */
  const localTransfer = vowTools.retriable(
    zone,
    'localTransfer',
    async (subzone, srcSeat, localAccount, give) => {
      !srcSeat.hasExited() || Fail`The seat cannot have exited.`;
      const [[kw, _amt]] = Object.entries(give);
      const { zcfSeat: tempSeat, userSeat: userSeatP } = zcf.makeEmptySeatKit();
      const userSeat = await userSeatP;
      atomicTransfer(zcf, srcSeat, tempSeat, give);
      tempSeat.exit();
      // TODO get the userSeat into baggage so it's at least recoverable
      // const userSeat = await subzone.makeOnce(
      //   'localTransferHelper',
      //   async () => {
      //     const { zcfSeat: tempSeat, userSeat: userSeatP } =
      //       zcf.makeEmptySeatKit();
      //     const uSeat = await userSeatP;
      //     // TODO how do I store in the place for this retriable?
      //     atomicTransfer(zcf, srcSeat, tempSeat, give);
      //     tempSeat.exit();
      //     return uSeat;
      //   },
      // );

      // Now all the `give` are accessible, so we can move them to the localAccount`

      const promises = Object.entries(give).map(async ([kw, _amount]) => {
        const pmt = await userSeat.getPayout(kw);
        // TODO arrange recovery on upgrade of pmt?
        return localAccount.deposit(pmt);
      });
      await Promise.all(promises);
      // TODO remove userSeat from baggage
    },
  );

  // TODO how to get rid of the string names below?

  return harden({
    localTransfer,
  });
};
