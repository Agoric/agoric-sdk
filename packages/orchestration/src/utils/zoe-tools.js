import { Fail } from '@endo/errors';
import { atomicTransfer } from '@agoric/zoe/src/contractSupport/index.js';

/**
 * @import {LocalOrchestrationAccountKit} from '../exos/local-orchestration-account.js';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {OrchestrationAccount} from '../orchestration-api.js'
 */

/**
 * @param {Zone} zone
 * @param {{ zcf: ZCF; vowTools: VowTools }} io
 */
export const makeZoeTools = (zone, { zcf, vowTools }) => {
  /**
   * Transfer the `give` a seat to a local account.
   */
  const localTransfer = vowTools.retriable(
    zone,
    'localTransfer',
    /**
     * @type {(
     *   srcSeat: ZCFSeat,
     *   localAccount: LocalOrchestrationAccountKit['holder'],
     *   give: AmountKeywordRecord,
     * ) => Promise<void>}
     */
    async (srcSeat, localAccount, give) => {
      !srcSeat.hasExited() || Fail`The seat cannot have exited.`;
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

  return harden({
    localTransfer,
  });
};
