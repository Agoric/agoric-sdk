// @ts-check
/** @file Use-object for the owner of a staking account */
import {
  MsgWithdrawDelegatorReward,
  MsgWithdrawDelegatorRewardResponse,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  MsgDelegate,
  MsgDelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any } from '@agoric/cosmic-proto/google/protobuf/any.js';
import { AmountShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { decodeBase64 } from '@endo/base64';
import { E } from '@endo/far';

/**
 * @import { ChainAccount, ChainAddress, ChainAmount, CosmosValidatorAddress } from '../types.js';
 * @import { RecorderKit, MakeRecorderKit } from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import { Baggage } from '@agoric/swingset-liveslots';
 * @import {AnyJson} from '@agoric/cosmic-proto';
 */

const trace = makeTracer('StakingAccountHolder');

const { Fail } = assert;
/**
 * @typedef {object} StakingAccountNotification
 * @property {ChainAddress} chainAddress
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
  delegate: M.callWhen(M.string(), AmountShape).returns(M.record()),
  withdrawReward: M.callWhen(M.string()).returns(M.array()),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Staking Account holder status', M.any()],
};

// UNTIL https://github.com/cosmology-tech/telescope/issues/605
/**
 * @param {Any} x
 * @returns {AnyJson}
 */
const toAnyJSON = x => /** @type {AnyJson} */ (Any.toJSON(x));

/**
 * @template T
 * @param {string} ackStr
 * @param {(p: {typeUrl: string, value: Uint8Array}) => T} fromProtoMsg
 */
export const tryDecodeResponse = (ackStr, fromProtoMsg) => {
  try {
    const any = Any.decode(decodeBase64(ackStr));
    const protoMsg = Any.decode(any.value);

    const msg = fromProtoMsg(protoMsg);
    return msg;
  } catch (cause) {
    throw assert.error(`bad response: ${ackStr}`, undefined, { cause });
  }
};

/** @type {(c: { denom: string, amount: string }) => ChainAmount} */
const toChainAmount = c => ({ denom: c.denom, value: BigInt(c.amount) });

/**
 * @param {Baggage} baggage
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 */
export const prepareStakingAccountKit = (baggage, makeRecorderKit, zcf) => {
  const makeStakingAccountKit = prepareExoClassKit(
    baggage,
    'Staking Account Holder',
    {
      helper: UnguardedHelperI,
      holder: HolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: M.call(M.string(), AmountShape).returns(M.promise()),
        WithdrawReward: M.call(M.string()).returns(M.promise()),
        CloseAccount: M.call().returns(M.promise()),
        TransferAccount: M.call().returns(M.promise()),
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
      },
      invitationMakers: {
        /**
         *
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} amount
         */
        Delegate(validatorAddress, amount) {
          trace('Delegate', validatorAddress, amount);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.delegate(validatorAddress, amount);
          }, 'Delegate');
        },
        /** @param {string} validatorAddress */
        WithdrawReward(validatorAddress) {
          trace('WithdrawReward', validatorAddress);

          return zcf.makeInvitation(async seat => {
            seat.exit();
            return this.facets.holder.withdrawReward(validatorAddress);
          }, 'WithdrawReward');
        },
        CloseAccount() {
          throw Error('not yet implemented');
        },
        /**
         * Starting a transfer revokes the account holder. The associated updater
         * will get a special notification that the account is being transferred.
         */
        TransferAccount() {
          throw Error('not yet implemented');
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
        // TODO move this beneath the Orchestration abstraction,
        // to the OrchestrationAccount provided by makeAccount()
        /**
         * _Assumes users has already sent funds to their ICA, until #9193
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        async delegate(validatorAddress, ertpAmount) {
          trace('delegate', validatorAddress, ertpAmount);

          // FIXME get values from proposal or args
          // FIXME brand handling and amount scaling
          trace('TODO: handle brand', ertpAmount);
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'uatom',
          };

          const account = this.facets.helper.owned();
          const delegatorAddress = this.state.chainAddress.address;

          const result = await E(account).executeEncodedTx([
            toAnyJSON(
              MsgDelegate.toProtoMsg({
                delegatorAddress,
                validatorAddress,
                amount,
              }),
            ),
          ]);

          if (!result) throw Fail`Failed to delegate.`;
          return tryDecodeResponse(result, MsgDelegateResponse.fromProtoMsg);
        },

        /**
         * @param {string} validatorAddress
         * @returns {Promise<ChainAmount[]>}
         */
        async withdrawReward(validatorAddress) {
          const { chainAddress } = this.state;
          assert.typeof(validatorAddress, 'string');
          const msg = MsgWithdrawDelegatorReward.toProtoMsg({
            delegatorAddress: chainAddress.address,
            validatorAddress,
          });
          const account = this.facets.helper.owned();
          const result = await E(account).executeEncodedTx([toAnyJSON(msg)]);
          const { amount: coins } = tryDecodeResponse(
            result,
            MsgWithdrawDelegatorRewardResponse.fromProtoMsg,
          );
          return harden(coins.map(toChainAmount));
        },
      },
    },
  );
  return makeStakingAccountKit;
};
/** @typedef {ReturnType<ReturnType<typeof prepareStakingAccountKit>>} StakingAccountKit */
