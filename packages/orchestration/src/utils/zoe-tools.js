import { Fail, q } from '@endo/errors';
import {
  atomicTransfer,
  depositToSeat,
} from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';

const { assign, keys, values } = Object;

/**
 * @import {InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {ResolvedPublicTopic} from '@agoric/zoe/src/contractSupport/topics.js';
 * @import {VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {LocalAccountMethods} from '../types.js';
 */

/**
 * @typedef {{
 *   invitationMakers: InvitationMakers;
 *   publicSubscribers: Record<string, ResolvedPublicTopic<any>>;
 * }} ResolvedContinuingOfferResult
 *
 * @see {ContinuingOfferResult}
 */

/**
 * @typedef {(
 *   srcSeat: ZCFSeat,
 *   localAccount: LocalAccountMethods,
 *   give: AmountKeywordRecord,
 * ) => Promise<void>} LocalTransfer
 */

/**
 * @typedef {(
 *   srcLocalAccount: LocalAccountMethods,
 *   recipientSeat: ZCFSeat,
 *   amounts: AmountKeywordRecord,
 * ) => Promise<void>} WithdrawToSeat
 */

/**
 * @param {Zone} zone
 * @param {{ zcf: ZCF; vowTools: VowTools }} io
 */
export const makeZoeTools = (
  zone,
  { zcf, vowTools: { retriable, when, allVows, allVowsSettled } },
) => {
  /**
   * Transfer the `give` of a seat to a local account. If any of the deposits
   * fail, everything will be rolled back to the `srcSeat`. Supports multiple
   * items in the `give` {@link PaymentKeywordRecord}.
   */
  const localTransfer = retriable(
    zone,
    'localTransfer',
    /**
     * @type {LocalTransfer}
     */
    async (srcSeat, localAccount, give) => {
      !srcSeat.hasExited() || Fail`The seat cannot have exited.`;
      const { zcfSeat: tempSeat, userSeat: userSeatP } = zcf.makeEmptySeatKit();
      const userSeat = await userSeatP;
      atomicTransfer(zcf, srcSeat, tempSeat, give);
      tempSeat.exit();
      // TODO (#9541) get the userSeat into baggage so it's at least recoverable
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
      const payments = await Promise.all(
        keys(give).map(kw => E(userSeat).getPayout(kw)),
      );
      const settleDeposits = await when(
        allVowsSettled(payments.map(pmt => localAccount.deposit(pmt))),
      );
      // if any of the deposits to LCA failed, unwind all the allocations
      if (settleDeposits.find(x => x.status === 'rejected')) {
        const amounts = values(give);
        const errors = [];
        // withdraw the successfully deposited payments
        const paymentsOrWithdrawVs = settleDeposits.map((x, i) => {
          if (x.status === 'rejected') {
            errors.push(x.reason);
            return payments[i];
          }
          return localAccount.withdraw(amounts[i]);
        });

        // return all payments to the srcSeat
        const paymentsToReturn = await when(allVows(paymentsOrWithdrawVs));
        const paymentsKwr = harden(
          keys(give).reduce(
            (kwr, kw, i) => assign(kwr, { [kw]: paymentsToReturn[i] }),
            {},
          ),
        );
        const depositResponse = await depositToSeat(
          zcf,
          srcSeat,
          give,
          paymentsKwr,
        );
        console.debug(depositResponse);
        throw Fail`One or more deposits to LCA failed. ${q(errors)}`;
      }
      // TODO remove userSeat from baggage
    },
  );

  /**
   * Transfer the `amounts` from a local account to the `recipientSeat`. If any
   * of the withdrawals fail, everything will be rolled back to the
   * `srcLocalAccount`. Supports multiple items in the `amounts`
   * {@link PaymentKeywordRecord}.
   */
  const withdrawToSeat = retriable(
    zone,
    'withdrawToSeat',
    /** @type {WithdrawToSeat} */
    async (srcLocalAccount, recipientSeat, amounts) => {
      await null;
      !recipientSeat.hasExited() || Fail`The seat cannot have exited.`;

      const settledWithdrawals = await when(
        allVowsSettled(
          values(amounts).map(amt => srcLocalAccount.withdraw(amt)),
        ),
      );

      // if any of the withdrawals were rejected, unwind the successful ones
      if (settledWithdrawals.find(x => x.status === 'rejected')) {
        const returnPaymentVs = [];
        const errors = [];
        for (const result of settledWithdrawals) {
          if (result.status === 'fulfilled') {
            returnPaymentVs.push(srcLocalAccount.deposit(result.value));
          } else {
            errors.push(result.reason);
          }
        }
        await when(allVows(returnPaymentVs));
        throw Fail`One or more withdrawals failed. Returned all payments to the source local account. ${q(
          errors,
        )}`;
      }
      // successfully withdraw all payments for srcLocalAccount, deposit to recipientSeat
      const paymentsKwr = harden(
        keys(amounts).reduce(
          (acc, kw, i) => assign(acc, { [kw]: settledWithdrawals[i].value }),
          {},
        ),
      );
      const depositResponse = await depositToSeat(
        zcf,
        recipientSeat,
        amounts,
        paymentsKwr,
      );
      console.debug(depositResponse);
    },
  );

  return harden({
    localTransfer,
    withdrawToSeat,
  });
};
/** @typedef {ReturnType<typeof makeZoeTools>} ZoeTools */
