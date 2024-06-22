/** @file Use-object for the owner of a localchain account */
import { typedJson } from '@agoric/cosmic-proto/vatsafe';
import { AmountShape, PaymentShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { M } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { V } from '@agoric/vow/vat.js';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import {
  ChainAddressShape,
  ChainAmountShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';
import { maxClockSkew } from '../utils/cosmos.js';
import { orchestrationAccountMethods } from '../utils/orchestrationAccount.js';
import { dateInSeconds, makeTimestampHelper } from '../utils/time.js';

/**
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {AmountArg, ChainAddress, DenomAmount, IBCMsgTransferOptions, OrchestrationAccount, ChainInfo, IBCConnectionInfo} from '@agoric/orchestration';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Zone} from '@agoric/zone';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService, TimerBrand, TimestampRecord} from '@agoric/time';
 * @import {PromiseVow, VowTools} from '@agoric/vow';
 * @import {TypedJson} from '@agoric/cosmic-proto';
 * @import {ChainHub} from './chain-hub.js';
 */

const trace = makeTracer('LOA');

const { Fail } = assert;
/**
 * @typedef {object} LocalChainAccountNotification
 * @property {string} address
 */

/**
 * @typedef {{
 *   topicKit: RecorderKit<LocalChainAccountNotification>;
 *   account: LocalChainAccount;
 *   address: ChainAddress;
 * }} State
 */

const HolderI = M.interface('holder', {
  ...orchestrationAccountMethods,
  getPublicTopics: M.call().returns(TopicsRecordShape),
  delegate: M.call(M.string(), AmountShape).returns(M.promise()),
  undelegate: M.call(M.string(), AmountShape).returns(M.promise()),
  withdraw: M.callWhen(AmountShape).returns(PaymentShape),
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
export const prepareLocalOrchestrationAccountKit = (
  zone,
  makeRecorderKit,
  zcf,
  timerService,
  { watch, when, allVows },
  chainHub,
) => {
  const timestampHelper = makeTimestampHelper(timerService);

  /** Make an object wrapping an LCA with Zoe interfaces. */
  const makeLocalOrchestrationAccountKit = zone.exoClassKit(
    'Local Orchestration Account Kit',
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
          .returns(VowShape), // transfer channel
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
      returnVoidWatcher: M.interface('returnVoidWatcher', {
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
     * @param {ChainAddress} initState.address
     * @param {Remote<StorageNode>} initState.storageNode
     * @returns {State}
     */
    ({ account, address, storageNode }) => {
      // must be the fully synchronous maker because the kit is held in durable state
      // @ts-expect-error XXX Patterns
      const topicKit = makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1]);

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
              sender: this.state.address.address,
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
        /** @type {OrchestrationAccount<any>['getBalance']} */
        async getBalance(denomArg) {
          // FIXME look up real values
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/9211
          const [brand, denom] =
            typeof denomArg === 'string'
              ? [/** @type {any} */ (null), denomArg]
              : [denomArg, 'FIXME'];

          const natAmount = await V.when(
            E(this.state.account).getBalance(brand),
          );
          return harden({ denom, value: natAmount.value });
        },
        getBalances() {
          throw new Error('not yet implemented');
        },

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

          const results = E(lca).executeTx([
            typedJson('/cosmos.staking.v1beta1.MsgDelegate', {
              amount,
              validatorAddress,
              delegatorAddress: this.state.address.address,
            }),
          ]);

          return when(watch(results, this.facets.extractFirstResultWatcher));
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
          const results = E(lca).executeTx([
            typedJson('/cosmos.staking.v1beta1.MsgUndelegate', {
              amount,
              validatorAddress,
              delegatorAddress: this.state.address.address,
            }),
          ]);
          // @ts-expect-error  Type 'JsonSafe<MsgUndelegateResponse & { '@type': "/cosmos.staking.v1beta1.MsgUndelegateResponse"; }>' is not assignable to type 'MsgUndelegateResponse'.
          return when(watch(results, this.facets.undelegateWatcher));
        },
        /**
         * Starting a transfer revokes the account holder. The associated
         * updater will get a special notification that the account is being
         * transferred.
         */
        /** @type {OrchestrationAccount<any>['deposit']} */
        async deposit(payment) {
          return when(
            watch(
              E(this.state.account)
                .deposit(payment)
                .then(() => {}),
            ),
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
        /** @returns {ChainAddress} */
        getAddress() {
          return this.state.address;
        },
        async send(toAccount, amount) {
          // FIXME implement
          console.log('send got', toAccount, amount);
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
        /** @type {OrchestrationAccount<any>['transferSteps']} */
        transferSteps(amount, msg) {
          console.log('transferSteps got', amount, msg);
          return Promise.resolve();
        },
      },
    },
  );
  return makeLocalOrchestrationAccountKit;
};
/** @typedef {ReturnType<typeof prepareLocalOrchestrationAccountKit>} MakeLocalOrchestrationAccountKit */
/** @typedef {ReturnType<MakeLocalOrchestrationAccountKit>} LocalOrchestrationAccountKit */
