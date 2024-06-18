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
  ChainAmountShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';
import { maxClockSkew } from '../utils/cosmos.js';
import { dateInSeconds, makeTimestampHelper } from '../utils/time.js';

/**
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {AmountArg, ChainAddress, DenomAmount, IBCMsgTransferOptions, CosmosChainInfo, ChainInfo, Chain, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Zone} from '@agoric/zone';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService, TimerBrand, TimestampRecord} from '@agoric/time';
 * @import {PromiseVow, VowTools} from '@agoric/vow';
 * @import {TypedJson} from '@agoric/cosmic-proto';
 * @import {ChainHub} from '../utils/chainHub.js';
 */

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
  deposit: M.callWhen(PaymentShape).optional(AmountShape).returns(AmountShape),
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
 * @param {Remote<TimerService>} timerService
 * @param {VowTools} vowTools
 * @param {ChainHub} chainHub
 */
export const prepareLocalChainAccountKit = (
  zone,
  makeRecorderKit,
  zcf,
  timerService,
  { watch, when, allVows },
  chainHub,
) => {
  const timestampHelper = makeTimestampHelper(timerService);
  // TODO: rename to makeLocalOrchestrationAccount or the like to distinguish from lca
  /** Make an object wrapping an LCA with Zoe interfaces. */
  const makeLocalChainAccountKit = zone.exoClassKit(
    'LCA Kit',
    {
      holder: HolderI,
      undelegateWatcher: M.interface('undelegateWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())) // XXX consider specifying `completionTime`
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(M.promise()),
      }),
      getChainInfoWatcher: M.interface('getChainInfoWatcher', {
        onFulfilled: M.call(M.record()) // agoric chain info
          .optional({ destination: ChainAddressShape }) // empty context
          .returns(M.promise()), // transfer channel
      }),
      getTimeoutTimestampWatcher: M.interface('getTimeoutTimestampWatcher', {
        onFulfilled: M.call(M.bigint())
          .optional(IBCTransferOptionsShape)
          .returns(M.bigint()),
      }),
      transferWatcher: M.interface('transferWatcher', {
        onFulfilled: M.call(M.any())
          .optional({
            destination: ChainAddressShape,
            opts: M.or(M.undefined(), IBCTransferOptionsShape),
            amount: ChainAmountShape,
          })
          .returns(M.promise()),
      }),
      extractFirstResultWatcher: M.interface('extractFirstResultWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record()))
          .optional(M.arrayOf(M.undefined()))
          .returns(M.record()),
      }),
      returnVoidWatcher: M.interface('extractFirstResultWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record()))
          .optional(M.arrayOf(M.undefined()))
          .returns(M.undefined()),
      }),
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
      undelegateWatcher: {
        /**
         * @param {[
         *   TypedJson<'/cosmos.staking.v1beta1.MsgUndelegateResponse'>,
         * ]} response
         */
        onFulfilled(response) {
          const { completionTime } = response[0];
          return E(timerService).wakeAt(
            // TODO clean up date handling once we have real data
            dateInSeconds(new Date(completionTime)) + maxClockSkew,
          );
        },
      },
      getChainInfoWatcher: {
        /**
         * @param {ChainInfo} agoricChainInfo
         * @param {{ destination: ChainAddress }} ctx
         */
        onFulfilled(agoricChainInfo, { destination }) {
          return chainHub.getConnectionInfo(
            agoricChainInfo.chainId,
            destination.chainId,
          );
        },
      },
      getTimeoutTimestampWatcher: {
        /**
         * @param {bigint} timeoutTimestamp
         * @param {{ opts: IBCMsgTransferOptions }} ctx
         */
        onFulfilled(timeoutTimestamp, { opts }) {
          // FIXME: do not call `getTimeoutTimestampNS` if `opts.timeoutTimestamp` or `opts.timeoutHeight` is provided
          return (
            opts?.timeoutTimestamp ??
            (opts?.timeoutHeight ? 0n : timeoutTimestamp)
          );
        },
      },
      transferWatcher: {
        /**
         * @param {[
         *   { transferChannel: IBCConnectionInfo['transferChannel'] },
         *   bigint,
         * ]} params
         * @param {{
         *   destination: ChainAddress;
         *   opts: IBCMsgTransferOptions;
         *   amount: DenomAmount;
         * }} ctx
         */
        onFulfilled(
          [{ transferChannel }, timeoutTimestamp],
          { opts, amount, destination },
        ) {
          return E(this.state.account).executeTx([
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
        },
      },
      /**
       * takes an array of results (from `executeEncodedTx`) and returns the
       * first result
       */
      extractFirstResultWatcher: {
        /**
         * @param {Record<unknown, unknown>[]} results
         */
        onFulfilled(results) {
          results.length === 1 ||
            Fail`expected exactly one result; got ${results}`;
          return results[0];
        },
      },
      /**
       * takes an array of results (from `executeEncodedTx`) and returns void
       * since we are not interested in the result
       */
      returnVoidWatcher: {
        /**
         * @param {Record<unknown, unknown>[]} results
         */
        onFulfilled(results) {
          results.length === 1 ||
            Fail`expected exactly one result; got ${results}`;
          trace('Result', results[0]);
          return undefined;
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

          return when(
            watch(
              E(lca).executeTx([
                typedJson('/cosmos.staking.v1beta1.MsgDelegate', {
                  amount,
                  validatorAddress,
                  delegatorAddress: this.state.address,
                }),
              ]),
              this.facets.extractFirstResultWatcher,
            ),
          );
        },
        /**
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         * @returns {PromiseVow<void | TimestampRecord>}
         */
        async undelegate(validatorAddress, ertpAmount) {
          // TODO #9211 lookup denom from brand
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'ubld',
          };
          const { account: lca } = this.state;
          return when(
            watch(
              E(lca).executeTx([
                typedJson('/cosmos.staking.v1beta1.MsgUndelegate', {
                  amount,
                  validatorAddress,
                  delegatorAddress: this.state.address,
                }),
              ]),
              // @ts-expect-error  Type 'JsonSafe<MsgUndelegateResponse & { '@type': "/cosmos.staking.v1beta1.MsgUndelegateResponse"; }>' is not assignable to type 'MsgUndelegateResponse'.
              this.facets.undelegateWatcher,
            ),
          );
        },
        /**
         * Starting a transfer revokes the account holder. The associated
         * updater will get a special notification that the account is being
         * transferred.
         */
        /** @type {LocalChainAccount['deposit']} */
        async deposit(payment, optAmountShape) {
          return when(
            watch(E(this.state.account).deposit(payment, optAmountShape)),
          );
        },
        /** @type {LocalChainAccount['withdraw']} */
        async withdraw(amount) {
          return when(watch(E(this.state.account).withdraw(amount)));
        },
        /** @type {LocalChainAccount['executeTx']} */
        async executeTx(messages) {
          return when(watch(E(this.state.account).executeTx(messages)));
        },
        /** @returns {ChainAddress['address']} */
        getAddress() {
          return NonNullish(this.state.address, 'Chain address not available.');
        },
        /**
         * @param {AmountArg} amount an ERTP {@link Amount} or a
         *   {@link DenomAmount}
         * @param {ChainAddress} destination
         * @param {IBCMsgTransferOptions} [opts] if either timeoutHeight or
         *   timeoutTimestamp are not supplied, a default timeoutTimestamp will
         *   be set for 5 minutes in the future
         * @returns {Promise<void>}
         */
        async transfer(amount, destination, opts) {
          trace('Transferring funds from LCA over IBC');
          // TODO #9211 lookup denom from brand
          if ('brand' in amount) throw Fail`ERTP Amounts not yet supported`;

          const connectionInfoV = watch(
            chainHub.getChainInfo('agoric'),
            this.facets.getChainInfoWatcher,
            { destination },
          );

          // set a `timeoutTimestamp` if caller does not supply either `timeoutHeight` or `timeoutTimestamp`
          // TODO #9324 what's a reasonable default? currently 5 minutes
          // FIXME: do not call `getTimeoutTimestampNS` if `opts.timeoutTimestamp` or `opts.timeoutHeight` is provided
          const timeoutTimestampV = watch(
            timestampHelper.getTimeoutTimestampNS(),
            this.facets.getTimeoutTimestampWatcher,
            { opts },
          );

          const transferV = watch(
            allVows([connectionInfoV, timeoutTimestampV]),
            this.facets.transferWatcher,
            { opts, amount, destination },
          );
          return when(watch(transferV, this.facets.returnVoidWatcher));
        },
      },
    },
  );
  return makeLocalChainAccountKit;
};
/** @typedef {ReturnType<ReturnType<typeof prepareLocalChainAccountKit>>} LocalChainAccountKit */
