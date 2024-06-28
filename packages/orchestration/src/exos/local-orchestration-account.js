/** @file Use-object for the owner of a localchain account */
import { typedJson } from '@agoric/cosmic-proto/vatsafe';
import { AmountShape, PaymentShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { Shape as NetworkShape } from '@agoric/network';
import { M } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import {
  ChainAddressShape,
  ChainAmountShape,
  DenomAmountShape,
  DenomShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';
import { maxClockSkew } from '../utils/cosmos.js';
import { orchestrationAccountMethods } from '../utils/orchestrationAccount.js';
import { dateInSeconds, makeTimestampHelper } from '../utils/time.js';

/**
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {AmountArg, ChainAddress, DenomAmount, IBCMsgTransferOptions, OrchestrationAccount, ChainInfo, IBCConnectionInfo, PromiseToVow} from '@agoric/orchestration';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Zone} from '@agoric/zone';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService, TimerBrand, TimestampRecord} from '@agoric/time';
 * @import {PromiseVow, Vow, VowTools} from '@agoric/vow';
 * @import {TypedJson, JsonSafe} from '@agoric/cosmic-proto';
 * @import {ChainHub} from './chain-hub.js';
 */

const trace = makeTracer('LOA');

const { Fail } = assert;
const { Vow$ } = NetworkShape; // TODO #9611

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
  delegate: M.call(M.string(), AmountShape).returns(VowShape),
  undelegate: M.call(M.string(), AmountShape).returns(VowShape),
  withdraw: M.call(AmountShape).returns(Vow$(PaymentShape)),
  executeTx: M.call(M.arrayOf(M.record())).returns(Vow$(M.record())),
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
  { watch, allVows, asVow },
  chainHub,
) => {
  const timestampHelper = makeTimestampHelper(timerService);

  /** Make an object wrapping an LCA with Zoe interfaces. */
  const makeLocalOrchestrationAccountKit = zone.exoClassKit(
    'Local Orchestration Account Kit',
    {
      holder: HolderI,
      undelegateWatcher: M.interface('undelegateWatcher', {
        onFulfilled: M.call([M.splitRecord({ completionTime: M.string() })])
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(VowShape),
      }),
      getChainInfoWatcher: M.interface('getChainInfoWatcher', {
        onFulfilled: M.call(M.record()) // agoric chain info
          .optional(ChainAddressShape)
          .returns(Vow$(M.record())), // connection info
      }),
      transferWatcher: M.interface('transferWatcher', {
        onFulfilled: M.call([M.record(), M.nat()])
          .optional({
            destination: ChainAddressShape,
            opts: M.or(M.undefined(), IBCTransferOptionsShape),
            amount: ChainAmountShape,
          })
          .returns(Vow$(M.record())),
      }),
      extractFirstResultWatcher: M.interface('extractFirstResultWatcher', {
        onFulfilled: M.call([M.record()])
          .optional(M.arrayOf(M.undefined()))
          .returns(M.any()),
      }),
      returnVoidWatcher: M.interface('returnVoidWatcher', {
        onFulfilled: M.call(M.any())
          .optional(M.arrayOf(M.undefined()))
          .returns(M.undefined()),
      }),
      getBalanceWatcher: M.interface('getBalanceWatcher', {
        onFulfilled: M.call(AmountShape)
          .optional(DenomShape)
          .returns(DenomAmountShape),
      }),
      invitationMakers: M.interface('invitationMakers', {
        Delegate: M.call(M.string(), AmountShape).returns(M.promise()),
        Undelegate: M.call(M.string(), AmountShape).returns(M.promise()),
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
        Delegate(validatorAddress, ertpAmount) {
          trace('Delegate', validatorAddress, ertpAmount);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(
              this.facets.holder.delegate(validatorAddress, ertpAmount),
            );
          }, 'Delegate');
        },
        /**
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         */
        Undelegate(validatorAddress, ertpAmount) {
          trace('Undelegate', validatorAddress, ertpAmount);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(
              this.facets.holder.undelegate(validatorAddress, ertpAmount),
            );
          }, 'Undelegate');
        },
        CloseAccount() {
          throw Error('not yet implemented');
        },
      },
      undelegateWatcher: {
        /**
         * @param {[
         *   JsonSafe<
         *     TypedJson<'/cosmos.staking.v1beta1.MsgUndelegateResponse'>
         *   >,
         * ]} response
         */
        onFulfilled(response) {
          const { completionTime } = response[0];
          return watch(
            E(timerService).wakeAt(
              // TODO clean up date handling once we have real data
              dateInSeconds(new Date(completionTime)) + maxClockSkew,
            ),
          );
        },
      },
      getChainInfoWatcher: {
        /**
         * @param {ChainInfo} agoricChainInfo
         * @param {ChainAddress} destination
         */
        onFulfilled(agoricChainInfo, destination) {
          return chainHub.getConnectionInfo(
            agoricChainInfo.chainId,
            destination.chainId,
          );
        },
      },
      transferWatcher: {
        /**
         * @param {[
         *   { transferChannel: IBCConnectionInfo['transferChannel'] },
         *   bigint,
         * ]} results
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
          return watch(
            E(this.state.account).executeTx([
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
            ]),
          );
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
         * @param {unknown} _result
         */
        onFulfilled(_result) {
          return undefined;
        },
      },
      /**
       * handles a request for balance from a bank purse and returns the balance
       * as a Chain Amount
       */
      getBalanceWatcher: {
        /**
         * @param {Amount<'nat'>} natAmount
         * @param {DenomAmount['denom']} denom
         * @returns {DenomAmount}
         */
        onFulfilled(natAmount, denom) {
          return harden({ denom, value: natAmount.value });
        },
      },
      holder: {
        /**
         * TODO: balance lookups for non-vbank assets
         *
         * @type {PromiseToVow<OrchestrationAccount<any>['getBalance']>}
         */
        getBalance(denomArg) {
          // FIXME look up real values
          // UNTIL https://github.com/Agoric/agoric-sdk/issues/9211
          const [brand, denom] =
            typeof denomArg === 'string'
              ? [/** @type {any} */ (null), denomArg]
              : [denomArg, 'FIXME'];

          return watch(
            E(this.state.account).getBalance(brand),
            this.facets.getBalanceWatcher,
            denom,
          );
        },
        getBalances() {
          // TODO https://github.com/Agoric/agoric-sdk/issues/9610
          return asVow(() => Fail`not yet implemented`);
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
        delegate(validatorAddress, ertpAmount) {
          // TODO #9211 lookup denom from brand
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'ubld',
          };
          const { account: lca } = this.state;

          return watch(
            E(lca).executeTx([
              typedJson('/cosmos.staking.v1beta1.MsgDelegate', {
                amount,
                validatorAddress,
                delegatorAddress: this.state.address.address,
              }),
            ]),
            this.facets.extractFirstResultWatcher,
          );
        },
        /**
         * @param {string} validatorAddress
         * @param {Amount<'nat'>} ertpAmount
         * @returns {Vow<void | TimestampRecord>}
         */
        undelegate(validatorAddress, ertpAmount) {
          // TODO #9211 lookup denom from brand
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'ubld',
          };
          const { account: lca } = this.state;
          return watch(
            E(lca).executeTx([
              typedJson('/cosmos.staking.v1beta1.MsgUndelegate', {
                amount,
                validatorAddress,
                delegatorAddress: this.state.address.address,
              }),
            ]),
            this.facets.undelegateWatcher,
          );
        },
        /**
         * Starting a transfer revokes the account holder. The associated
         * updater will get a special notification that the account is being
         * transferred.
         */
        /** @type {PromiseToVow<OrchestrationAccount<any>['deposit']>} */
        deposit(payment) {
          return watch(
            E(this.state.account).deposit(payment),
            this.facets.returnVoidWatcher,
          );
        },
        /** @type {PromiseToVow<LocalChainAccount['withdraw']>} */
        withdraw(amount) {
          return watch(E(this.state.account).withdraw(amount));
        },
        /** @type {PromiseToVow<LocalChainAccount['executeTx']>} */
        executeTx(messages) {
          return watch(E(this.state.account).executeTx(messages));
        },
        /** @type {OrchestrationAccount<any>['getAddress']} */
        getAddress() {
          return this.state.address;
        },
        send(toAccount, amount) {
          return asVow(() => {
            // FIXME implement
            console.log('send got', toAccount, amount);
            throw Fail`send not yet implemented`;
          });
        },
        /**
         * @param {AmountArg} amount an ERTP {@link Amount} or a
         *   {@link DenomAmount}
         * @param {ChainAddress} destination
         * @param {IBCMsgTransferOptions} [opts] if either timeoutHeight or
         *   timeoutTimestamp are not supplied, a default timeoutTimestamp will
         *   be set for 5 minutes in the future
         * @returns {Vow<void>}
         */
        transfer(amount, destination, opts) {
          return asVow(() => {
            trace('Transferring funds from LCA over IBC');
            // TODO #9211 lookup denom from brand
            if ('brand' in amount) throw Fail`ERTP Amounts not yet supported`;

            const connectionInfoV = watch(
              chainHub.getChainInfo('agoric'),
              this.facets.getChainInfoWatcher,
              destination,
            );

            // set a `timeoutTimestamp` if caller does not supply either `timeoutHeight` or `timeoutTimestamp`
            // TODO #9324 what's a reasonable default? currently 5 minutes
            const timeoutTimestampVowOrValue =
              opts?.timeoutTimestamp ??
              (opts?.timeoutHeight
                ? 0n
                : E(timestampHelper).getTimeoutTimestampNS());

            const transferV = watch(
              allVows([connectionInfoV, timeoutTimestampVowOrValue]),
              this.facets.transferWatcher,
              { opts, amount, destination },
            );
            return watch(transferV, this.facets.returnVoidWatcher);
          });
        },
        /** @type {PromiseToVow<OrchestrationAccount<any>['transferSteps']>} */
        transferSteps(amount, msg) {
          return asVow(() => {
            console.log('transferSteps got', amount, msg);
            throw Fail`not yet implemented`;
          });
        },
      },
    },
  );
  return makeLocalOrchestrationAccountKit;
};
/** @typedef {ReturnType<typeof prepareLocalOrchestrationAccountKit>} MakeLocalOrchestrationAccountKit */
/** @typedef {ReturnType<MakeLocalOrchestrationAccountKit>} LocalOrchestrationAccountKit */
