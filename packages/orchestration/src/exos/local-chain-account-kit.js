/** @file Use-object for the owner of a localchain account */
import { NonNullish } from '@agoric/assert';
import { typedJson } from '@agoric/cosmic-proto/vatsafe';
import { AmountShape, PaymentShape } from '@agoric/ertp';
import { makeTracer } from '@agoric/internal';
import { UnguardedHelperI } from '@agoric/internal/src/typeGuards.js';
import { M, prepareExoClassKit } from '@agoric/vat-data';
import { TopicsRecordShape } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import {
  AmountArgShape,
  ChainAddressShape,
  IBCTransferOptionsShape,
} from '../typeGuards.js';
import { makeTimestampHelper } from '../utils/time.js';

/**
 * @import {LocalChainAccount} from '@agoric/vats/src/localchain.js';
 * @import {AmountArg, ChainAddress, DenomAmount, IBCMsgTransferOptions, CosmosChainInfo} from '@agoric/orchestration';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js'.
 * @import {Baggage} from '@agoric/vat-data';
 * @import {TimerService, TimerBrand} from '@agoric/time';
 * @import {TimestampHelper} from '../utils/time.js';
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
 *   account: LocalChainAccount | null;
 *   address: ChainAddress['address'];
 * }} State
 */

const HolderI = M.interface('holder', {
  getPublicTopics: M.call().returns(TopicsRecordShape),
  makeDelegateInvitation: M.call(M.string(), AmountShape).returns(M.promise()),
  makeCloseAccountInvitation: M.call().returns(M.promise()),
  makeTransferAccountInvitation: M.call().returns(M.promise()),
  deposit: M.callWhen(PaymentShape).optional(M.pattern()).returns(AmountShape),
  withdraw: M.callWhen(AmountShape).returns(PaymentShape),
  transfer: M.call(AmountArgShape, ChainAddressShape)
    .optional(IBCTransferOptionsShape)
    .returns(M.promise()),
  getAddress: M.call().returns(M.string()),
});

/** @type {{ [name: string]: [description: string, valueShape: Pattern] }} */
const PUBLIC_TOPICS = {
  account: ['Account holder status', M.any()],
};

/**
 * @param {Baggage} baggage
 * @param {MakeRecorderKit} makeRecorderKit
 * @param {ZCF} zcf
 * @param {TimerService} timerService
 * @param {TimerBrand} timerBrand
 * @param {AgoricChainInfo} agoricChainInfo
 */
export const prepareLocalChainAccountKit = (
  baggage,
  makeRecorderKit,
  zcf,
  timerService,
  timerBrand,
  agoricChainInfo,
) => {
  const timestampHelper = makeTimestampHelper(timerService, timerBrand);
  const makeAccountHolderKit = prepareExoClassKit(
    baggage,
    'Account Holder',
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
        async makeDelegateInvitation(validatorAddress, ertpAmount) {
          trace('makeDelegateInvitation', validatorAddress, ertpAmount);

          // TODO #9211 lookup denom from brand
          const amount = {
            amount: String(ertpAmount.value),
            denom: 'ubld',
          };

          return zcf.makeInvitation(async seat => {
            // TODO should it allow delegating more BLD?
            seat.exit();
            const lca = this.facets.helper.owned();
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
        /** @type {LocalChainAccount['deposit']} */
        async deposit(payment, optAmountShape) {
          return E(this.facets.helper.owned()).deposit(payment, optAmountShape);
        },
        /** @type {LocalChainAccount['withdraw']} */
        async withdraw(amount) {
          return E(this.facets.helper.owned()).withdraw(amount);
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

          const [result] = await E(this.facets.helper.owned()).executeTx([
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
  return makeAccountHolderKit;
};
/** @typedef {ReturnType<ReturnType<typeof prepareLocalChainAccountKit>>} LocalChainAccountKit */
