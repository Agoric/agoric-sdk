// @ts-check
/** @file Use-object for the owner of a staking account */
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { decodeTxResult, txToBase64 } from '../utils/tx.js';

/**
 * @import { ChainAccount, ChainAddress } from '../types.js';
 * @import { RecorderKit, MakeRecorderKit } from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import { Baggage } from '@agoric/swingset-liveslots';
 */

const trace = makeTracer('StakingAccountHolder');

const { Fail } = assert;
/**
 * @typedef {object} StakingAccountNotification
 * @property {string} address
 */

/**
 * @typedef {{
 *  topicKit: RecorderKit<StakingAccountNotification>;
 *  account: ChainAccount;
 *  chainAddress: ChainAddress;
 * }} State
 */

const HolderI = M.interface('holder', {
  getPublicTopics: M.call().returns(TopicsRecordShape),
  makeDelegateInvitation: M.call(M.string(), AmountShape).returns(M.promise()),
  makeCloseAccountInvitation: M.call().returns(M.promise()),
  makeTransferAccountInvitation: M.call().returns(M.promise()),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Staking Account holder status', M.any()],
};

/**
 * @param {Baggage} baggage
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 */
export const prepareStakingAccountHolder = (baggage, makeRecorderKit, zcf) => {
  const makeAccountHolderKit = prepareExoClassKit(
    baggage,
    'Staking Account Holder',
    {
      helper: UnguardedHelperI,
      holder: HolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: HolderI.payload.methodGuards.makeDelegateInvitation,
        CloseAccount: HolderI.payload.methodGuards.makeCloseAccountInvitation,
        TransferAccount:
          HolderI.payload.methodGuards.makeTransferAccountInvitation,
      }),
    },
    /**
     * @param {ChainAccount} account
     * @param {StorageNode} storageNode
     * @param {ChainAddress} chainAddress
     * @returns {State}
     */
    (account, storageNode, chainAddress) => {
      // must be the fully synchronous maker because the kit is held in durable state
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);

      return { account, chainAddress, topicKit };
    },
    {
      helper: {
        /** @throws if this holder no longer owns the account */
        owned() {
          const { account } = this.state;
          if (!account) {
            throw Fail`Using account holder after transfer`;
          }
          return account;
        },
        getUpdater() {
          return this.state.topicKit.recorder;
        },
        /**
         * _Assumes users has already sent funds to their ICA, until #9193
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        async delegate(validatorAddress, ertpAmount) {
          // FIXME get values from proposal or args
          // FIXME brand handling and amount scaling
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'uatom',
          };

          const account = this.facets.helper.owned();
          trace('chainAccount', account);

          // const delegatorAddress = await E(chainAccount).getAccountAddress();
          const delegatorAddress = this.state.chainAddress;
          trace('delegatorAddress', delegatorAddress);

          const result = await E(account).executeEncodedTx([
            txToBase64(
              MsgDelegate.toProtoMsg({
                delegatorAddress,
                validatorAddress,
                amount,
              }),
            ),
          ]);
          trace('Result', result);
          const resultOrError = decodeTxResult(result, MsgDelegateResponse);
          trace('Decoded Result', result);

          if (JSON.stringify(resultOrError) === '{}') return 'Success';
          throw Fail`Failed to delegate. ${resultOrError}`;
        },
      },
      invitationMakers: {
        Delegate(validatorAddress, amount) {
          return this.facets.holder.makeDelegateInvitation(
            validatorAddress,
            amount,
          );
        },
        CloseAccount() {
          return this.facets.holder.makeCloseAccountInvitation();
        },
        TransferAccount() {
          return this.facets.holder.makeTransferAccountInvitation();
        },
      },
      holder: {
        getPublicTopics() {
          const { topicKit } = this.state;
          return harden({
            account: {
              description: PUBLIC_TOPICS.account[0],
              subscriber: topicKit.subscriber,
              storagePath: topicKit.recorder.getStoragePath(),
            },
          });
        },
        /**
         *
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        async delegate(validatorAddress, ertpAmount) {
          trace('delegate', validatorAddress, ertpAmount);
          return this.facets.helper.delegate(validatorAddress, ertpAmount);
        },
        /**
         *
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        makeDelegateInvitation(validatorAddress, ertpAmount) {
          trace('makeDelegateInvitation', validatorAddress, ertpAmount);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.helper.delegate(validatorAddress, ertpAmount);
          }, 'Delegate');
        },
        makeCloseAccountInvitation() {
          throw Error('not yet implemented');
        },
        /**
         * Starting a transfer revokes the account holder. The associated updater
         * will get a special notification that the account is being transferred.
         */
        makeTransferAccountInvitation() {
          throw Error('not yet implemented');
        },
      },
    },
  );
  return makeAccountHolderKit;
};
