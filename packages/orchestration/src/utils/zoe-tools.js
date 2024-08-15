import { makeError, q, Fail } from '@endo/errors';
import { depositToSeat } from '@agoric/zoe/src/contractSupport/index.js';
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
 *   amounts: AmountKeywordRecord,
 * ) => Promise<void>} LocalTransfer
 */

/**
 * @typedef {(
 *   localAccount: LocalAccountMethods,
 *   destSeat: ZCFSeat,
 *   amounts: AmountKeywordRecord,
 * ) => Promise<void>} WithdrawToSeat
 */

/**
 * @param {Zone} zone
 * @param {{ zcf: ZCF; vowTools: VowTools }} io
 */
export const makeZoeTools = (
  zone,
  { zcf, vowTools: { retriable, when, allVows, allSettled } },
) => {
  /**
   * Transfer the `amounts` from `srcSeat` to `localAccount`. If any of the
   * deposits fail, everything will be rolled back to the `srcSeat`. Supports
   * multiple items in the `amounts` {@link AmountKeywordRecord}.
   */
  const localTransfer = retriable(
    zone,
    'localTransfer',
    /**
     * @type {LocalTransfer}
     */
    async (srcSeat, localAccount, amounts) => {
      !srcSeat.hasExited() || Fail`The seat cannot have exited.`;
      const { zcfSeat: tempSeat, userSeat: userSeatP } = zcf.makeEmptySeatKit();
      const userSeat = await userSeatP;
      zcf.atomicRearrange(harden([[srcSeat, tempSeat, amounts]]));
      tempSeat.exit();
      // TODO (#9541) get the userSeat into baggage so it's at least recoverable
      // const userSeat = await subzone.makeOnce(
      //   'localTransferHelper',
      //   async () => {
      //     const { zcfSeat: tempSeat, userSeat: userSeatP } =
      //       zcf.makeEmptySeatKit();
      //     const uSeat = await userSeatP;
      //     // TODO how do I store in the place for this retriable?
      //     atomicTransfer(zcf, srcSeat, tempSeat, amounts);
      //     tempSeat.exit();
      //     return uSeat;
      //   },
      // );

      // Now all the `amounts` are accessible, so we can move them to the localAccount
      const payments = await Promise.all(
        keys(amounts).map(kw => E(userSeat).getPayout(kw)),
      );
      const settleDeposits = await when(
        allSettled(payments.map(pmt => E(localAccount).deposit(pmt))),
      );
      // if any of the deposits to localAccount failed, unwind all of the allocations
      if (settleDeposits.find(x => x.status === 'rejected')) {
        const amts = values(amounts);
        const errors = [];
        // withdraw the successfully deposited payments
        const paymentsOrWithdrawVs = settleDeposits.map((x, i) => {
          if (x.status === 'rejected') {
            errors.push(x.reason);
            return payments[i];
          }
          return E(localAccount).withdraw(amts[i]);
        });

        // return all payments to the srcSeat
        const paymentsToReturn = await when(allVows(paymentsOrWithdrawVs));
        const paymentKwr = harden(
          keys(amounts).reduce(
            (kwr, kw, i) => assign(kwr, { [kw]: paymentsToReturn[i] }),
            {},
          ),
        );
        const depositResponse = await depositToSeat(
          zcf,
          srcSeat,
          amounts,
          paymentKwr,
        );
        console.debug(depositResponse);
        throw makeError(`One or more deposits failed ${q(errors)}`);
      }
      // TODO #9541 remove userSeat from baggage
    },
  );

  /**
   * Transfer the `amounts` from a `localAccount` to the `recipientSeat`. If any
   * of the withdrawals fail, everything will be rolled back to the
   * `srcLocalAccount`. Supports multiple items in the `amounts`
   * {@link PaymentKeywordRecord}.
   */
  const withdrawToSeat = retriable(
    zone,
    'withdrawToSeat',
    /** @type {WithdrawToSeat} */
    async (localAccount, destSeat, amounts) => {
      await null;
      !destSeat.hasExited() || Fail`The seat cannot have exited.`;

      const settledWithdrawals = await when(
        allSettled(values(amounts).map(amt => E(localAccount).withdraw(amt))),
      );

      // if any of the withdrawals were rejected, unwind the successful ones
      if (settledWithdrawals.find(x => x.status === 'rejected')) {
        const returnPaymentVs = [];
        const errors = [];
        for (const result of settledWithdrawals) {
          if (result.status === 'fulfilled') {
            returnPaymentVs.push(E(localAccount).deposit(result.value));
          } else {
            errors.push(result.reason);
          }
        }
        await when(allVows(returnPaymentVs));
        throw makeError(`One or more withdrawals failed ${q(errors)}`);
      }
      // successfully withdrew payments from srcLocalAccount, deposit to recipientSeat
      const paymentKwr = harden(
        keys(amounts).reduce(
          (acc, kw, i) =>
            assign(acc, {
              [kw]: /** @type {{ value: Amount }[]} */ (settledWithdrawals)[i]
                .value,
            }),
          {},
        ),
      );
      const depositResponse = await depositToSeat(
        zcf,
        destSeat,
        amounts,
        paymentKwr,
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
