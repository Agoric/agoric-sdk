/** @file Use-object for the owner of a localchain account */
import { typedJson } from '@agoric/cosmic-proto/vatsafe';
import { AmountShape, PaymentShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { M } from '@agoric/vat-data';
import { V } from '@agoric/vow/vat.js';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { InvitationShape } from '@agoric/zoe/src/typeGuards.js';
import { E } from '@endo/far';
import { maxClockSkew } from '../utils/cosmos.js';
import { orchestrationAccountMethods } from '../utils/orchestrationAccount.js';
import { dateInSeconds, makeTimestampHelper } from '../utils/time.js';

/**
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {AmountArg, ChainAddress, DenomAmount, IBCMsgTransferOptions, OrchestrationAccount, OrchestrationAccountI} from '@agoric/orchestration';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Zone} from '@agoric/zone';
 * @import {Remote} from '@agoric/internal';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {ChainHub} from '../utils/chainHub.js';
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
 * @param {ChainHub} chainHub
 */
export const prepareLocalOrchestrationAccountKit = (
  zone,
  makeRecorderKit,
  zcf,
  timerService,
  chainHub,
) => {
  const timestampHelper = makeTimestampHelper(timerService);

  /** Make an object wrapping an LCA with Zoe interfaces. */
  const makeLocalOrchestrationAccountKit = zone.exoClassKit(
    'Local Orchestration Account Kit',
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
          trace('lca', lca);
          const delegatorAddress = await V(lca).getAddress();
          trace('delegatorAddress', delegatorAddress);
          const [result] = await V(lca).executeTx([
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
          const delegatorAddress = await V(lca).getAddress();
          trace('delegatorAddress', delegatorAddress);
          const [response] = await V(lca).executeTx([
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
         * Starting a transfer revokes the account holder. The associated
         * updater will get a special notification that the account is being
         * transferred.
         */
        /** @type {OrchestrationAccount<any>['deposit']} */
        async deposit(payment) {
          await V(this.state.account).deposit(payment);
        },
        /** @type {LocalChainAccount['withdraw']} */
        async withdraw(amount) {
          return V(this.state.account).withdraw(amount);
        },
        /** @type {LocalChainAccount['executeTx']} */
        async executeTx(messages) {
          // @ts-expect-error subtype
          return V(this.state.account).executeTx(messages);
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

          const agoricChainInfo = await chainHub.getChainInfo('agoric');
          const { transferChannel } = await chainHub.getConnectionInfo(
            agoricChainInfo,
            destination,
          );

          await null;
          // set a `timeoutTimestamp` if caller does not supply either `timeoutHeight` or `timeoutTimestamp`
          // TODO #9324 what's a reasonable default? currently 5 minutes
          const timeoutTimestamp =
            opts?.timeoutTimestamp ??
            (opts?.timeoutHeight
              ? 0n
              : await timestampHelper.getTimeoutTimestampNS());

          const [result] = await V(this.state.account).executeTx([
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
          trace('MsgTransfer result', result);
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
