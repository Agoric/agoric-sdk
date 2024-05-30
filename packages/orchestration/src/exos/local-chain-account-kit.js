/** @file Use-object for the owner of a localchain account */
import { NonNullish } from '@agoric/assert';
import { typedJson } from '@agoric/cosmic-proto/vatsafe';
import { AmountShape, PaymentShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { M } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import {
  AmountArgShape,
  ChainAddressShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';
import { maxClockSkew } from '../utils/cosmos.js';
import { dateInSeconds, makeTimestampHelper } from '../utils/time.js';

/**
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {AmountArg, ChainAddress, DenomAmount, IBCMsgTransferOptions, CosmosChainInfo} from '@agoric/orchestration';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Zone} from '@agoric/zone';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 */

// partial until #8879
/** @typedef {Pick<CosmosChainInfo, 'connections'>} AgoricChainInfo */

const trace = makeTracer('LCAH');

const { Fail } = assert;
/**
 * @typedef {object} LocalChainAccountNotification
 * @property {string} address
 */

/**
 * @typedef {{
 *   topicKit: RecorderKit<LocalChainAccountNotification>;
 *   account: LocalChainAccount;
 *   address: ChainAddress['address'];
 * }} State
 */

const HolderI = M.interface('holder', {
  getPublicTopics: M.call().returns(TopicsRecordShape),
  delegate: M.call(M.string(), AmountShape).returns(M.promise()),
  undelegate: M.call(M.string(), AmountShape).returns(M.promise()),
  deposit: M.callWhen(PaymentShape).returns(AmountShape),
  withdraw: M.callWhen(AmountShape).returns(PaymentShape),
  transfer: M.call(AmountArgShape, ChainAddressShape)
    .optional(IBCTransferOptionsShape)
    .returns(M.promise()),
  getAddress: M.call().returns(M.string()),
  executeTx: M.callWhen(M.arrayOf(M.record())).returns(M.arrayOf(M.record())),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Account holder status', M.any()],
};

/**
 * @param {Zone} zone
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 * @param {TimerService} timerService
 * @param {TimerBrand} timerBrand
 * @param {AgoricChainInfo} agoricChainInfo
 */
export const prepareLocalChainAccountKit = (
  zone,
  makeRecorderKit,
  zcf,
  timerService,
  timerBrand,
  agoricChainInfo,
) => {
  const timestampHelper = makeTimestampHelper(timerService, timerBrand);
  /**
   * Make an object wrapping an LCA with Zoe interfaces.
   */
  const makeLocalChainAccountKit = zone.exoClassKit(
    'LCA Kit',
    {
      holder: HolderI,
      invitationMakers: M.interface('invitationMakers', {
        Delegate: M.callWhen(M.string(), AmountShape).returns(InvitationShape),
        Undelegate: M.callWhen(M.string(), AmountShape).returns(
          InvitationShape,
        ),
        CloseAccount: M.call().returns(M.promise()),
      }),
    },
    /**
     * @param {object} initState
     * @param {LocalChainAccount} initState.account
     * @param {ChainAddress['address']} initState.address
     * @param {StorageNode} initState.storageNode
     * @returns {State}
     */
    ({ account, address, storageNode }) => {
      // must be the fully synchronous maker because the kit is held in durable state
      // @ts-expect-error XXX Patterns
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);

      // #9162 use ChainAddress object instead of `address` string
      return { account, address, topicKit };
    },
    {
      invitationMakers: {
        /**
         *
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        async Delegate(validatorAddress, ertpAmount) {
          trace('Delegate', validatorAddress, ertpAmount);

          return zcf.makeInvitation(async seat => {
            // TODO should it allow delegating more BLD?
            seat.exit();
            return this.facets.holder.delegate(validatorAddress, ertpAmount);
          }, 'Delegate');
        },

        /**
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        async Undelegate(validatorAddress, ertpAmount) {
          trace('Undelegate', validatorAddress, ertpAmount);

          return zcf.makeInvitation(async seat => {
            // TODO should it allow delegating more BLD?
            seat.exit();
            return this.facets.holder.undelegate(validatorAddress, ertpAmount);
          }, 'Undelegate');
        },
        CloseAccount() {
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
        /**
         *
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        async delegate(validatorAddress, ertpAmount) {
          // TODO #9211 lookup denom from brand
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'ubld',
          };
          const { account: lca } = this.state;
          trace('lca', lca);
          const delegatorAddress = await E(lca).getAddress();
          trace('delegatorAddress', delegatorAddress);
          const [result] = await E(lca).executeTx([
            typedJson('/cosmos.staking.v1beta1.MsgDelegate', {
              amount,
              validatorAddress,
              delegatorAddress,
            }),
          ]);
          trace('got result', result);
          return result;
        },
        /**
         *
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         * @returns {Promise<void>}
         */
        async undelegate(validatorAddress, ertpAmount) {
          // TODO #9211 lookup denom from brand
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'ubld',
          };
          const { account: lca } = this.state;
          trace('lca', lca);
          const delegatorAddress = await E(lca).getAddress();
          trace('delegatorAddress', delegatorAddress);
          const [response] = await E(lca).executeTx([
            typedJson('/cosmos.staking.v1beta1.MsgUndelegate', {
              amount,
              validatorAddress,
              delegatorAddress,
            }),
          ]);
          trace('undelegate response', response);
          const { completionTime } = response;

          await E(timerService).wakeAt(
            // TODO clean up date handling once we have real data
            dateInSeconds(new Date(completionTime)) + maxClockSkew,
          );
        },
        /**
         * Starting a transfer revokes the account holder. The associated updater
         * will get a special notification that the account is being transferred.
         */
        /** @type {LocalChainAccount['deposit']} */
        async deposit(payment, optAmountShape) {
          return E(this.state.account).deposit(payment, optAmountShape);
        },
        /** @type {LocalChainAccount['withdraw']} */
        async withdraw(amount) {
          return E(this.state.account).withdraw(amount);
        },
        /** @type {LocalChainAccount['executeTx']} */
        async executeTx(messages) {
          // @ts-expect-error subtype
          return E(this.state.account).executeTx(messages);
        },
        /**
         * @returns {ChainAddress['address']}
         */
        getAddress() {
          return NonNullish(this.state.address, 'Chain address not available.');
        },
        /**
         * @param {AmountArg} amount an ERTP {@link Amount} or a {@link DenomAmount}
         * @param {ChainAddress} destination
         * @param {IBCMsgTransferOptions} [opts] if either timeoutHeight or timeoutTimestamp are not supplied, a default timeoutTimestamp will be set for 5 minutes in the future
         * @returns {Promise<void>}
         */
        async transfer(amount, destination, opts) {
          trace('Transferring funds from LCA over IBC');
          // TODO #9211 lookup denom from brand
          if ('brand' in amount) throw Fail`ERTP Amounts not yet supported`;

          // TODO #8879 chainInfo and #9063 well-known chains
          const { transferChannel } = agoricChainInfo.connections.get(
            destination.chainId,
          );

          await null;
          // set a `timeoutTimestamp` if caller does not supply either `timeoutHeight` or `timeoutTimestamp`
          // TODO #9324 what's a reasonable default? currently 5 minutes
          const timeoutTimestamp =
            opts?.timeoutTimestamp ??
            (opts?.timeoutHeight
              ? 0n
              : await timestampHelper.getTimeoutTimestampNS());

          const [result] = await E(this.state.account).executeTx([
            typedJson('/ibc.applications.transfer.v1.MsgTransfer', {
              sourcePort: transferChannel.portId,
              sourceChannel: transferChannel.channelId,
              token: {
                amount: String(amount.value),
                denom: amount.denom,
              },
              sender: this.state.address,
              receiver: destination.address,
              timeoutHeight: opts?.timeoutHeight ?? {
                revisionHeight: 0n,
                revisionNumber: 0n,
              },
              timeoutTimestamp,
              memo: opts?.memo ?? '',
            }),
          ]);
          trace('MsgTransfer result', result);
        },
      },
    },
  );
  return makeLocalChainAccountKit;
};
/** @typedef {ReturnType<ReturnType<typeof prepareLocalChainAccountKit>>} LocalChainAccountKit */
