/** @file Use-object for the owner of a staking account */
import { toRequestQueryJson, CodecHelper } from '@agoric/cosmic-proto';
import {
  MsgDepositForBurn as MsgDepositForBurnType,
  MsgDepositForBurnWithCaller as MsgDepositForBurnWithCallerType,
} from '@agoric/cosmic-proto/circle/cctp/v1/tx.js';
import {
  QueryAllBalancesRequest as QueryAllBalancesRequestType,
  QueryAllBalancesResponse as QueryAllBalancesResponseType,
  QueryBalanceRequest as QueryBalanceRequestType,
  QueryBalanceResponse as QueryBalanceResponseType,
} from '@agoric/cosmic-proto/cosmos/bank/v1beta1/query.js';
import { MsgSend as MsgSendType } from '@agoric/cosmic-proto/cosmos/bank/v1beta1/tx.js';
import {
  QueryDelegationRewardsRequest as QueryDelegationRewardsRequestType,
  QueryDelegationRewardsResponse as QueryDelegationRewardsResponseType,
  QueryDelegationTotalRewardsRequest as QueryDelegationTotalRewardsRequestType,
  QueryDelegationTotalRewardsResponse as QueryDelegationTotalRewardsResponseType,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/query.js';
import {
  MsgWithdrawDelegatorReward as MsgWithdrawDelegatorRewardType,
  MsgWithdrawDelegatorRewardResponse as MsgWithdrawDelegatorRewardResponseType,
} from '@agoric/cosmic-proto/cosmos/distribution/v1beta1/tx.js';
import {
  QueryDelegationRequest as QueryDelegationRequestType,
  QueryDelegationResponse as QueryDelegationResponseType,
  QueryDelegatorDelegationsRequest as QueryDelegatorDelegationsRequestType,
  QueryDelegatorDelegationsResponse as QueryDelegatorDelegationsResponseType,
  QueryDelegatorUnbondingDelegationsRequest as QueryDelegatorUnbondingDelegationsRequestType,
  QueryDelegatorUnbondingDelegationsResponse as QueryDelegatorUnbondingDelegationsResponseType,
  QueryRedelegationsRequest as QueryRedelegationsRequestType,
  QueryRedelegationsResponse as QueryRedelegationsResponseType,
  QueryUnbondingDelegationRequest as QueryUnbondingDelegationRequestType,
  QueryUnbondingDelegationResponse as QueryUnbondingDelegationResponseType,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/query.js';
import {
  MsgBeginRedelegate as MsgBeginRedelegateType,
  MsgDelegate as MsgDelegateType,
  MsgUndelegate as MsgUndelegateType,
  MsgUndelegateResponse as MsgUndelegateResponseType,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import { Any as AnyType } from '@agoric/cosmic-proto/google/protobuf/any.js';
import {
  MsgTransferResponse as MsgTransferResponseType,
  MsgTransfer as MsgTransferType,
} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import { makeTracer } from '@agoric/internal';
import { Shape as NetworkShape } from '@agoric/network';
import { decodeIbcEndpoint } from '@agoric/vats/tools/ibc-utils.js';
import { M } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { decodeBase64 } from '@endo/base64';
import { Fail, makeError, q } from '@endo/errors';
import { E } from '@endo/far';
import {
  AmountArgShape,
  CosmosChainAddressShape,
  DelegationShape,
  DenomAmountShape,
  IBCTransferOptionsShape,
  Proto3Shape,
  ExecuteICATxOptsShape,
} from '../typeGuards.js';
import { coerceCoin, coerceDenom } from '../utils/amounts.js';
import {
  maxClockSkew,
  toCosmosDelegationResponse,
  toCosmosValidatorAddress,
  toDenomAmount,
  toTruncatedDenomAmount,
  tryDecodeResponse,
  tryDecodeResponses,
} from '../utils/cosmos.js';
import {
  orchestrationAccountMethods,
  pickData,
} from '../utils/orchestrationAccount.js';
import { makeTimestampHelper } from '../utils/time.js';
import { accountIdTo32Bytes, parseAccountId } from '../utils/address.js';

const MsgDepositForBurn = CodecHelper(MsgDepositForBurnType);
const MsgDepositForBurnWithCaller = CodecHelper(
  MsgDepositForBurnWithCallerType,
);
const QueryAllBalancesRequest = CodecHelper(QueryAllBalancesRequestType);
const QueryAllBalancesResponse = CodecHelper(QueryAllBalancesResponseType);
const QueryBalanceRequest = CodecHelper(QueryBalanceRequestType);
const QueryBalanceResponse = CodecHelper(QueryBalanceResponseType);
const MsgSend = CodecHelper(MsgSendType);
const QueryDelegationRewardsRequest = CodecHelper(
  QueryDelegationRewardsRequestType,
);
const QueryDelegationRewardsResponse = CodecHelper(
  QueryDelegationRewardsResponseType,
);
const QueryDelegationTotalRewardsRequest = CodecHelper(
  QueryDelegationTotalRewardsRequestType,
);
const QueryDelegationTotalRewardsResponse = CodecHelper(
  QueryDelegationTotalRewardsResponseType,
);
const MsgWithdrawDelegatorReward = CodecHelper(MsgWithdrawDelegatorRewardType);
const MsgWithdrawDelegatorRewardResponse = CodecHelper(
  MsgWithdrawDelegatorRewardResponseType,
);
const QueryDelegationRequest = CodecHelper(QueryDelegationRequestType);
const QueryDelegationResponse = CodecHelper(QueryDelegationResponseType);
const QueryDelegatorDelegationsRequest = CodecHelper(
  QueryDelegatorDelegationsRequestType,
);
const QueryDelegatorDelegationsResponse = CodecHelper(
  QueryDelegatorDelegationsResponseType,
);
const QueryDelegatorUnbondingDelegationsRequest = CodecHelper(
  QueryDelegatorUnbondingDelegationsRequestType,
);
const QueryDelegatorUnbondingDelegationsResponse = CodecHelper(
  QueryDelegatorUnbondingDelegationsResponseType,
);
const QueryRedelegationsRequest = CodecHelper(QueryRedelegationsRequestType);
const QueryRedelegationsResponse = CodecHelper(QueryRedelegationsResponseType);
const QueryUnbondingDelegationRequest = CodecHelper(
  QueryUnbondingDelegationRequestType,
);
const QueryUnbondingDelegationResponse = CodecHelper(
  QueryUnbondingDelegationResponseType,
);
const MsgBeginRedelegate = CodecHelper(MsgBeginRedelegateType);
const MsgDelegate = CodecHelper(MsgDelegateType);
const MsgUndelegate = CodecHelper(MsgUndelegateType);
const MsgUndelegateResponse = CodecHelper(MsgUndelegateResponseType);
const Any = CodecHelper(AnyType);
const MsgTransfer = CodecHelper(MsgTransferType);
const MsgTransferResponse = CodecHelper(MsgTransferResponseType);

/**
 * @import {HostInterface, HostOf} from '@agoric/async-flow';
 * @import {AmountArg, IcaAccount, CosmosChainAddress, CosmosValidatorAddress, ICQConnection, StakingAccountActions, StakingAccountQueries, NobleMethods, OrchestrationAccountCommon, CosmosRewardsResponse, IBCConnectionInfo, IBCMsgTransferOptions, ChainHub, CosmosDelegationResponse, CaipChainId, AccountIdArg, ChainInfo, MetaTrafficEntry, ResultMeta} from '../types.js';
 * @import {ContractMeta, Invitation, OfferHandler, ZCF, ZCFSeat} from '@agoric/zoe';
 * @import {RecorderKit, MakeRecorderKit} from '@agoric/zoe/src/contractSupport/recorder.js';
 * @import {Coin} from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
 * @import {Remote} from '@agoric/internal';
 * @import {DelegationResponse} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
 * @import {InvitationMakers} from '@agoric/smart-wallet/src/types.js';
 * @import {TimerService} from '@agoric/time';
 * @import {Vow, VowTools, PromiseVow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 * @import {ResponseQuery} from '@agoric/cosmic-proto/tendermint/abci/types.js';
 * @import {AnyJson, JsonSafe} from '@agoric/cosmic-proto';
 * @import {TxBody} from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
 * @import {Matcher} from '@endo/patterns';
 * @import {LocalIbcAddress, RemoteIbcAddress} from '@agoric/vats/tools/ibc-utils.js';
 * @import {SendOptions} from '@agoric/network';
 */

const trace = makeTracer('CosmosOrchAccount');

const { Vow$ } = NetworkShape; // TODO #9611

const EVow$ = shape => M.or(Vow$(shape), M.promise(/* shape */));

/**
 * @typedef {object} CosmosOrchestrationAccountNotification
 * @property {CosmosChainAddress} chainAddress
 */

/**
 * Decodes the reply from the result of an InterChainQuery.
 *
 * @template R - response type returned by `codec.decode()`
 * @param {{
 *   typeUrl: string;
 *   decode(input: Uint8Array, length?: number): R;
 * }} codec
 * @param {JsonSafe<ResponseQuery>} result
 * @returns {R} returned by `codec.decode(...)`
 */
const decodeIcqResult = (codec, result) => {
  try {
    // We prefer the key over the value, for backwards compatibility.
    const bytes = decodeBase64(result.key || result.value);
    return codec.decode(bytes);
  } catch (cause) {
    throw makeError(
      `Failed to parse ${codec.typeUrl} from result ${q(result)}`,
      undefined,
      { cause },
    );
  }
};

/**
 * @private
 * @typedef {{
 *   account: IcaAccount;
 *   chainAddress: CosmosChainAddress;
 *   icqConnection: ICQConnection | undefined;
 *   localAddress: LocalIbcAddress;
 *   remoteAddress: RemoteIbcAddress;
 *   timer: Remote<TimerService>;
 *   topicKit: RecorderKit<CosmosOrchestrationAccountNotification> | undefined;
 * }} State
 *   Internal to the IcaAccountHolder exo
 */

/**
 * @typedef {{
 *   localAddress: LocalIbcAddress;
 *   remoteAddress: RemoteIbcAddress;
 * }} CosmosOrchestrationAccountStorageState
 */

/** @see {StakingAccountActions} */
const stakingAccountActionsMethods = {
  delegate: M.call(CosmosChainAddressShape, AmountArgShape).returns(VowShape),
  redelegate: M.call(
    CosmosChainAddressShape,
    CosmosChainAddressShape,
    AmountArgShape,
  ).returns(VowShape),
  undelegate: M.call(M.arrayOf(DelegationShape)).returns(VowShape),
  withdrawReward: M.call(CosmosChainAddressShape).returns(
    Vow$(M.arrayOf(DenomAmountShape)),
  ),
  withdrawRewards: M.call().returns(Vow$(M.arrayOf(DenomAmountShape))),
};

/** @see {StakingAccountQueries} */
const stakingAccountQueriesMethods = {
  getDelegation: M.call(CosmosChainAddressShape).returns(VowShape),
  getDelegations: M.call().returns(VowShape),
  getUnbondingDelegation: M.call(CosmosChainAddressShape).returns(VowShape),
  getUnbondingDelegations: M.call().returns(VowShape),
  getRedelegations: M.call().returns(VowShape),
  getReward: M.call(CosmosChainAddressShape).returns(VowShape),
  getRewards: M.call().returns(VowShape),
};

/** @see {NobleMethods} */
const nobleMethods = {
  depositForBurn: M.call(M.string(), AmountArgShape)
    .optional(M.string())
    .returns(VowShape),
  depositForBurnWithMeta: M.call(M.string(), AmountArgShape)
    .optional(M.string())
    .returns(EVow$({ result: EVow$(M.any()), meta: M.record({}) })),
};

/** @see {OrchestrationAccountCommon} */
export const IcaAccountHolderI = M.interface('IcaAccountHolder', {
  ...nobleMethods,
  ...orchestrationAccountMethods,
  ...stakingAccountActionsMethods,
  ...stakingAccountQueriesMethods,
  deactivate: M.call().returns(VowShape),
  reactivate: M.call().returns(VowShape),
  executeEncodedTx: M.call(M.arrayOf(Proto3Shape))
    .optional(ExecuteICATxOptsShape)
    .returns(VowShape),
  executeEncodedTxWithMeta: M.call(M.arrayOf(Proto3Shape))
    .optional(ExecuteICATxOptsShape)
    .returns(EVow$({ result: EVow$(M.any()), meta: M.record({}) })),
});

/** @type {{ [name: string]: [description: string, valueShape: Matcher] }} */
const PUBLIC_TOPICS = {
  account: ['Staking Account holder status', M.any()],
};

export const CosmosOrchestrationInvitationMakersI = M.interface(
  'invitationMakers',
  {
    Delegate: M.call(CosmosChainAddressShape, AmountArgShape).returns(
      M.promise(),
    ),
    Redelegate: M.call(
      CosmosChainAddressShape,
      CosmosChainAddressShape,
      AmountArgShape,
    ).returns(M.promise()),
    WithdrawReward: M.call(CosmosChainAddressShape).returns(M.promise()),
    Undelegate: M.call(M.arrayOf(DelegationShape)).returns(M.promise()),
    DeactivateAccount: M.call().returns(M.promise()),
    ReactivateAccount: M.call().returns(M.promise()),
    TransferAccount: M.call().returns(M.promise()),
    Send: M.call().returns(M.promise()),
    SendAll: M.call().returns(M.promise()),
    Transfer: M.call().returns(M.promise()),
  },
);
harden(CosmosOrchestrationInvitationMakersI);

/**
 * @param {Zone} zone
 * @param {object} powers
 * @param {ChainHub} powers.chainHub
 * @param {MakeRecorderKit} powers.makeRecorderKit
 * @param {Remote<TimerService>} powers.timerService
 * @param {VowTools} powers.vowTools
 * @param {ZCF} powers.zcf
 */
export const prepareCosmosOrchestrationAccountKit = (
  zone,
  {
    chainHub,
    makeRecorderKit,
    timerService,
    vowTools: { watch, asVow, when, allVows },
    zcf,
  },
) => {
  const timestampHelper = makeTimestampHelper(timerService);
  const makeCosmosOrchestrationAccountKit = zone.exoClassKit(
    'Cosmos Orchestration Account Holder',
    {
      helper: M.interface('helper', {
        owned: M.call().returns(M.remotable()),
        getUpdater: M.call().returns(M.remotable()),
        amountToCoin: M.call(AmountArgShape).returns(M.record()),
      }),
      attachTxMetaWatcher: M.interface('attachTxMetaWatcher', {
        onFulfilled: M.call(
          M.arrayOf(M.any()),
          EVow$(M.splitRecord({ result: EVow$(M.any()), meta: M.record() })),
          M.string(),
        ).returns(EVow$(M.any())),
      }),
      pickDataWatcher: pickData.shape,
      returnVoidWatcher: M.interface('returnVoidWatcher', {
        onFulfilled: M.call(M.any())
          .optional(M.arrayOf(M.undefined()))
          .returns(M.undefined()),
      }),
      balanceQueryWatcher: M.interface('balanceQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record()))
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(M.or(M.record(), M.undefined())),
      }),
      allBalancesQueryWatcher: M.interface('allBalancesQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(
          M.arrayOf(M.record()),
        ),
      }),
      undelegateWatcher: M.interface('undelegateWatcher', {
        onFulfilled: M.call(M.string())
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(Vow$(M.promise())),
      }),
      withdrawRewardWatcher: M.interface('withdrawRewardWatcher', {
        onFulfilled: M.call(M.string())
          .optional(M.arrayOf(M.undefined())) // empty context
          .returns(M.arrayOf(DenomAmountShape)),
      }),
      transferWatcher: M.interface('transferWatcher', {
        onFulfilled: M.call(M.nat())
          .optional({
            destination: CosmosChainAddressShape,
            opts: M.or(M.undefined(), IBCTransferOptionsShape),
            token: {
              denom: M.string(),
              amount: M.string(),
            },
          })
          .returns(Vow$(M.any())),
      }),
      transferWithMetaWatcher: M.interface('transferWithMetaWatcher', {
        onFulfilled: M.call([M.record(), M.nat()])
          .optional({
            destination: CosmosChainAddressShape,
            opts: M.or(M.undefined(), IBCTransferOptionsShape),
            token: {
              denom: M.string(),
              amount: M.string(),
            },
          })
          .returns(Vow$({ result: Vow$(M.any()), meta: M.record() })),
      }),
      parseTransferWatcher: M.interface('parseTransferWatcher', {
        onFulfilled: M.call([M.string(), M.record()], M.record()).returns(
          Vow$(M.record()),
        ),
      }),
      updateMetaTrafficWatcher: M.interface('updateMetaTrafficWatcher', {
        onFulfilled: M.call(M.record(), M.record())
          .optional(M.remotable('nextWatcher'))
          .returns(Vow$(M.record())),
      }),
      fillSequenceWatcher: M.interface('fillSequenceWatcher', {
        onFulfilled: M.call(M.string(), M.record()).returns(Vow$(M.record())),
      }),
      delegationQueryWatcher: M.interface('delegationQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(M.record()),
      }),
      delegationsQueryWatcher: M.interface('delegationsQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(
          M.arrayOf(M.record()),
        ),
      }),
      unbondingDelegationQueryWatcher: M.interface(
        'unbondingDelegationQueryWatcher',
        {
          onFulfilled: M.call(M.arrayOf(M.record())).returns(M.record()),
        },
      ),
      unbondingDelegationsQueryWatcher: M.interface(
        'unbondingDelegationsQueryWatcher',
        {
          onFulfilled: M.call(M.arrayOf(M.record())).returns(
            M.arrayOf(M.record()),
          ),
        },
      ),
      redelegationQueryWatcher: M.interface('redelegationQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(
          M.arrayOf(M.record()),
        ),
      }),
      redelegationsQueryWatcher: M.interface('redelegationsQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(
          M.arrayOf(M.record()),
        ),
      }),
      rewardQueryWatcher: M.interface('rewardQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(
          M.arrayOf(M.record()),
        ),
      }),
      rewardsQueryWatcher: M.interface('rewardsQueryWatcher', {
        onFulfilled: M.call(M.arrayOf(M.record())).returns(M.record()),
      }),
      holder: IcaAccountHolderI,
      invitationMakers: CosmosOrchestrationInvitationMakersI,
    },
    /**
     * @param {object} info
     * @param {CosmosChainAddress} info.chainAddress
     * @param {LocalIbcAddress} info.localAddress
     * @param {RemoteIbcAddress} info.remoteAddress
     * @param {object} io
     * @param {IcaAccount} io.account
     * @param {Remote<StorageNode>} [io.storageNode]
     * @param {ICQConnection} [io.icqConnection]
     * @param {Remote<TimerService>} io.timer
     * @returns {State}
     */
    ({ chainAddress, localAddress, remoteAddress }, io) => {
      trace('cosmos orch acct init', {
        chainAddress,
        localAddress,
        remoteAddress,
      });
      const { storageNode } = io;
      // must be the fully synchronous maker because the kit is held in durable state
      const topicKit = storageNode
        ? makeRecorderKit(storageNode, PUBLIC_TOPICS.account[1])
        : undefined;
      // TODO determine what goes in vstorage https://github.com/Agoric/agoric-sdk/issues/9066
      // XXX consider parsing local/remoteAddr to portId, channelId, counterpartyPortId, counterpartyChannelId, connectionId, counterpartyConnectionId
      // FIXME these values will not update if IcaAccount gets new values after reopening.
      // consider having IcaAccount responsible for the owning the writer. It might choose to share it with COA.
      if (topicKit) {
        void E(topicKit.recorder).write(
          /** @type {CosmosOrchestrationAccountStorageState} */ ({
            localAddress,
            remoteAddress,
          }),
        );
      }
      const { account, icqConnection, timer } = io;
      return {
        account,
        chainAddress,
        icqConnection,
        localAddress,
        remoteAddress,
        timer,
        topicKit,
      };
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
          if (!this.state.topicKit) throw Fail`no topicKit`;
          return this.state.topicKit.recorder;
        },
        /**
         * @param {AmountArg} amount
         * @returns {Coin}
         */
        amountToCoin(amount) {
          !('brand' in amount) ||
            Fail`'amountToCoin' not working for ${q(amount.brand)} until #10449; use 'DenomAmount' for now`;
          return coerceCoin(chainHub, amount);
        },
      },
      attachTxMetaWatcher: {
        /**
         * TODO(#1994): Subsume with IcaAccount.executeEncodedTxWithMeta().
         *
         * @param {[
         *   agoric: ChainInfo<'cosmos'>,
         *   la: LocalIbcAddress,
         *   counterparty: CaipChainId,
         *   ra: RemoteIbcAddress,
         * ]} param0
         * @param {{ result: Vow<any>; meta: Record<string, any> }} param1
         * @param {string} protocol
         */
        onFulfilled(
          [agoric, la, counterparty, ra],
          { result, meta: origMeta },
          protocol,
        ) {
          const cp = counterparty.split(':', 2);
          const lad = decodeIbcEndpoint(la);
          const rad = decodeIbcEndpoint(ra);

          const meta = {
            ...origMeta,
            traffic: [
              ...(origMeta.traffic || []),
              /** @type {MetaTrafficEntry} */ ({
                op: 'ICA',
                srcChainId: `${agoric.namespace}:${agoric.reference}`,
                src: [protocol, lad.portID, lad.channelID],
                dstChainId: `${cp[0]}:${cp[1]}`,
                dst: [protocol, rad.portID, rad.channelID],
                // TODO(#11994): Need to expose from Network API `conn.sendWithMeta(...)`
                seq: { status: 'unknown' },
              }),
            ],
          };
          return harden({ result, meta });
        },
      },
      pickDataWatcher: pickData.watcher,
      balanceQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { balance } = decodeIcqResult(QueryBalanceResponse, result);
          if (!balance) throw Fail`Result lacked balance key: ${result}`;
          return harden(toDenomAmount(balance));
        },
      },
      delegationQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         * @returns {CosmosDelegationResponse}
         */
        onFulfilled([result]) {
          const { delegationResponse } = decodeIcqResult(
            QueryDelegationResponse,
            result,
          );
          if (!delegationResponse)
            throw Fail`Result lacked delegationResponse key: ${result}`;
          const { chainAddress } = this.state;
          return harden(
            toCosmosDelegationResponse(chainAddress, delegationResponse),
          );
        },
      },
      delegationsQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         * @returns {CosmosDelegationResponse[]}
         */
        onFulfilled([result]) {
          const { delegationResponses } = decodeIcqResult(
            QueryDelegatorDelegationsResponse,
            result,
          );
          if (!delegationResponses)
            throw Fail`Result lacked delegationResponses key: ${result}`;
          const { chainAddress } = this.state;
          return harden(
            delegationResponses.map(r =>
              toCosmosDelegationResponse(chainAddress, r),
            ),
          );
        },
      },
      unbondingDelegationQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { unbond } = decodeIcqResult(
            QueryUnbondingDelegationResponse,
            result,
          );
          if (!unbond) throw Fail`Result lacked unbond key: ${result}`;
          return harden(unbond);
        },
      },
      unbondingDelegationsQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { unbondingResponses } = decodeIcqResult(
            QueryDelegatorUnbondingDelegationsResponse,
            result,
          );
          if (!unbondingResponses)
            throw Fail`Result lacked unbondingResponses key: ${result}`;
          return harden(unbondingResponses);
        },
      },
      redelegationQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { redelegationResponses } = decodeIcqResult(
            QueryRedelegationsResponse,
            result,
          );
          if (!redelegationResponses)
            throw Fail`Result lacked redelegationResponses key: ${result}`;
          return harden(redelegationResponses);
        },
      },
      redelegationsQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { redelegationResponses } = decodeIcqResult(
            QueryRedelegationsResponse,
            result,
          );
          if (!redelegationResponses)
            throw Fail`Result lacked redelegationResponses key: ${result}`;
          return harden(redelegationResponses);
        },
      },
      rewardQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { rewards } = decodeIcqResult(
            QueryDelegationRewardsResponse,
            result,
          );
          if (!rewards) throw Fail`Result lacked rewards key: ${result}`;
          return harden(rewards.map(toTruncatedDenomAmount));
        },
      },
      rewardsQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         * @returns {CosmosRewardsResponse}
         */
        onFulfilled([result]) {
          const { rewards, total } = decodeIcqResult(
            QueryDelegationTotalRewardsResponse,
            result,
          );
          if (!rewards || !total)
            throw Fail`Result lacked rewards or total key: ${result}`;
          const { chainAddress } = this.state;
          return harden({
            rewards: rewards.map(reward => ({
              validator: toCosmosValidatorAddress(reward, chainAddress.chainId),
              reward: reward.reward.map(toTruncatedDenomAmount),
            })),
            total: total.map(toTruncatedDenomAmount),
          });
        },
      },
      allBalancesQueryWatcher: {
        /**
         * @param {JsonSafe<ResponseQuery>[]} results
         */
        onFulfilled([result]) {
          const { balances } = decodeIcqResult(
            QueryAllBalancesResponse,
            result,
          );
          if (!balances) throw Fail`Result lacked balances key: ${q(result)}`;
          return harden(balances.map(coin => toDenomAmount(coin)));
        },
      },
      undelegateWatcher: {
        /**
         * @param {string} result
         */
        onFulfilled(result) {
          const response = tryDecodeResponse(result, MsgUndelegateResponse);
          trace('undelegate response', response);
          const { completionTime } = response;
          completionTime || Fail`No completion time result ${result}`;
          return watch(
            // ignore nanoseconds and just use seconds from Timestamp
            E(this.state.timer).wakeAt(completionTime.seconds + maxClockSkew),
          );
        },
      },
      /**
       * takes an array of results (from `executeEncodedTx`) and returns void
       * since we are not interested in the result
       */
      returnVoidWatcher: {
        /** @param {string | Record<string, unknown>} result */
        onFulfilled(result) {
          trace('Result', result);
          return undefined;
        },
      },
      withdrawRewardWatcher: {
        /** @param {string} result */
        onFulfilled(result) {
          const response = tryDecodeResponse(
            result,
            MsgWithdrawDelegatorRewardResponse,
          );
          trace('withdrawReward response', response);
          const { amount: coins } = response;
          return harden(coins.map(toDenomAmount));
        },
      },
      transferWatcher: {
        onFulfilled(...args) {
          throw Fail`obsolete transferWatcher(${args}); please retry`;
        },
      },
      transferWithMetaWatcher: {
        /**
         * @param {[
         *   { transferChannel: IBCConnectionInfo['transferChannel'] },
         *   bigint,
         * ]} results
         * @param {{
         *   destination: CosmosChainAddress;
         *   opts?: IBCMsgTransferOptions;
         *   token: Coin;
         * }} ctx
         */
        onFulfilled(
          [{ transferChannel }, timeoutTimestamp],
          { opts, token, destination },
        ) {
          const { chainAddress } = this.state;
          const resultMeta = this.facets.holder.executeEncodedTxWithMeta([
            Any.toJSON(
              MsgTransfer.toProtoMsg({
                sourcePort: transferChannel.portId,
                sourceChannel: transferChannel.channelId,
                token,
                sender: this.state.chainAddress.value,
                receiver: destination.value,
                timeoutHeight: opts?.timeoutHeight,
                timeoutTimestamp,
                memo: opts?.memo,
              }),
            ),
          ]);
          const transferTraffic = /** @type {MetaTrafficEntry} */ ({
            op: 'transfer',
            srcChainId: `cosmos:${chainAddress.chainId}`,
            src: ['ibc', transferChannel.portId, transferChannel.channelId],
            dstChainId: `cosmos:${destination.chainId}`,
            dst: [
              'ibc',
              transferChannel.counterPartyPortId,
              transferChannel.counterPartyChannelId,
            ],
            seq: { status: 'pending' }, // filled in by fillSequenceWatcher.onFulfilled below
          });
          return watch(
            resultMeta,
            this.facets.updateMetaTrafficWatcher,
            transferTraffic,
          );
        },
      },
      parseTransferWatcher: {
        onFulfilled(_1, _2) {
          throw Fail`obsolete parseTransferWatcher(${_1}, ${_2}); please retry`;
        },
      },
      updateMetaTrafficWatcher: {
        /**
         * @param {ResultMeta<any>} param0
         * @param {MetaTrafficEntry} traffic
         * @returns {ResultMeta<{ followTraffic: MetaTrafficEntry }>}
         */
        onFulfilled({ result, meta }, traffic) {
          trace('updateMetaTrafficWatcher', {
            result,
            meta,
            traffic,
          });
          const newMeta = {
            ...meta,
            traffic: [...(meta.traffic || []), traffic],
          };
          const newResult = watch(
            result,
            this.facets.fillSequenceWatcher,
            newMeta,
          );
          return harden({ result: newResult, meta: newMeta });
        },
      },
      fillSequenceWatcher: {
        /**
         * @param {string} sequenceResp
         * @param {Record<string, any>} meta
         */
        onFulfilled(sequenceResp, meta) {
          trace('fillSequenceWatcher', {
            submitted: sequenceResp,
            meta,
          });

          const [{ sequence }] = tryDecodeResponses(sequenceResp, [
            MsgTransferResponse,
          ]);
          const lastMetaTraffic = meta.traffic?.at(-1);
          lastMetaTraffic ||
            Fail`expected meta.traffic to have at least one entry: ${q(meta)}`;
          const baseSequence = lastMetaTraffic?.seq;
          baseSequence?.status === 'pending' ||
            Fail`expected traffic?.seq ${baseSequence} to be pending`;
          sequence != null ||
            Fail`expected sequenceResp.sequence ${sequence} to be non-nullish`;

          const newTransferTraffic = { ...lastMetaTraffic, seq: sequence };
          /** @type {Record<string, any>} */
          const newMeta = {
            ...meta,
            traffic: [
              ...(meta.traffic ? meta.traffic.slice(0, -1) : []),
              newTransferTraffic,
            ],
          };
          // Result is not known to this account.  Ask the caller to follow the
          // traffic.
          const nextMeta = harden({
            result: { followTraffic: newTransferTraffic },
            meta: newMeta,
          });
          return nextMeta;
        },
      },
      invitationMakers: {
        /**
         * @param {CosmosValidatorAddress} validator
         * @param {AmountArg} amount
         */
        Delegate(validator, amount) {
          trace('Delegate', validator, amount);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.delegate(validator, amount));
          }, 'Delegate');
        },
        /**
         * @param {CosmosValidatorAddress} srcValidator
         * @param {CosmosValidatorAddress} dstValidator
         * @param {AmountArg} amount
         */
        Redelegate(srcValidator, dstValidator, amount) {
          trace('Redelegate', srcValidator, dstValidator, amount);

          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(
              this.facets.holder.redelegate(srcValidator, dstValidator, amount),
            );
          }, 'Redelegate');
        },
        /** @param {CosmosValidatorAddress} validator */
        WithdrawReward(validator) {
          trace('WithdrawReward', validator);
          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.withdrawReward(validator));
          }, 'WithdrawReward');
        },
        /**
         * @param {{
         *   amount: AmountArg;
         *   validator: CosmosValidatorAddress;
         * }[]} delegations
         */
        Undelegate(delegations) {
          trace('Undelegate', delegations);
          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.undelegate(delegations));
          }, 'Undelegate');
        },
        DeactivateAccount() {
          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.deactivate());
          }, 'DeactivateAccount');
        },
        ReactivateAccount() {
          return zcf.makeInvitation(seat => {
            seat.exit();
            return watch(this.facets.holder.reactivate());
          }, 'ReactivateAccount');
        },
        Send() {
          /**
           * @type {OfferHandler<
           *   Vow<void>,
           *   { toAccount: AccountIdArg; amount: AmountArg }
           * >}
           */
          const offerHandler = (seat, { toAccount, amount }) => {
            seat.exit();
            return watch(this.facets.holder.send(toAccount, amount));
          };
          return zcf.makeInvitation(offerHandler, 'Send');
        },
        SendAll() {
          /**
           * @type {OfferHandler<
           *   Vow<void>,
           *   { toAccount: CosmosChainAddress; amounts: AmountArg[] }
           * >}
           */
          const offerHandler = (seat, { toAccount, amounts }) => {
            seat.exit();
            return watch(this.facets.holder.sendAll(toAccount, amounts));
          };
          return zcf.makeInvitation(offerHandler, 'SendAll');
        },
        /**
         * Starting a transfer revokes the account holder. The associated
         * updater will get a special notification that the account is being
         * transferred.
         */
        TransferAccount() {
          throw Error('not yet implemented');
        },
        Transfer() {
          /**
           * @type {OfferHandler<
           *   Vow<any>,
           *   {
           *     amount: AmountArg;
           *     destination: AccountIdArg;
           *     opts?: IBCMsgTransferOptions;
           *   }
           * >}
           */
          const offerHandler = (seat, { amount, destination, opts }) => {
            seat.exit();
            return watch(
              this.facets.holder.transfer(destination, amount, opts),
            );
          };
          return zcf.makeInvitation(offerHandler, 'Transfer');
        },
      },
      holder: {
        /** @type {HostOf<OrchestrationAccountCommon['asContinuingOffer']>} */
        asContinuingOffer() {
          // @ts-expect-error XXX invitationMakers
          // getPublicTopics resolves promptly (same run), so we don't need a watcher
          // eslint-disable-next-line no-restricted-syntax
          return asVow(async () => {
            await null;
            const { holder, invitationMakers: im } = this.facets;
            // XXX cast to a type that has string index signature
            const invitationMakers = /** @type {InvitationMakers} */ (
              /** @type {unknown} */ (im)
            );

            return harden({
              // getPublicTopics returns a vow, for membrane compatibility.
              // it's safe to unwrap to a promise and get the result as we
              // expect this complete in the same run
              publicSubscribers: await when(holder.getPublicTopics()),
              invitationMakers,
            });
          });
        },
        /** @type {HostOf<OrchestrationAccountCommon['getPublicTopics']>} */
        getPublicTopics() {
          // getStoragePath resolves promptly (same run), so we don't need a watcher
          // eslint-disable-next-line no-restricted-syntax
          return asVow(async () => {
            await null;
            const { topicKit } = this.state;
            if (!topicKit) throw Fail`No topicKit; storageNode not provided`;
            return harden({
              account: {
                description: PUBLIC_TOPICS.account[0],
                subscriber: topicKit.subscriber,
                storagePath: await topicKit.recorder.getStoragePath(),
              },
            });
          });
        },

        /** @type {HostOf<OrchestrationAccountCommon['getAddress']>} */
        getAddress() {
          return this.state.chainAddress;
        },
        /** @type {HostOf<StakingAccountActions['delegate']>} */
        delegate(validator, amount) {
          return asVow(() => {
            trace('delegate', validator, amount);
            const { helper } = this.facets;
            const { chainAddress } = this.state;

            const amountAsCoin = helper.amountToCoin(amount);

            return watch(
              E(helper.owned()).executeEncodedTx([
                Any.toJSON(
                  MsgDelegate.toProtoMsg({
                    delegatorAddress: chainAddress.value,
                    validatorAddress: validator.value,
                    amount: amountAsCoin,
                  }),
                ),
              ]),
              this.facets.returnVoidWatcher,
            );
          });
        },

        /** @type {HostOf<StakingAccountActions['redelegate']>} */
        redelegate(srcValidator, dstValidator, amount) {
          return asVow(() => {
            trace('redelegate', srcValidator, dstValidator, amount);
            const { helper } = this.facets;
            const { chainAddress } = this.state;

            const results = E(helper.owned()).executeEncodedTx([
              Any.toJSON(
                MsgBeginRedelegate.toProtoMsg({
                  delegatorAddress: chainAddress.value,
                  validatorSrcAddress: srcValidator.value,
                  validatorDstAddress: dstValidator.value,
                  amount: helper.amountToCoin(amount),
                }),
              ),
            ]);

            return watch(
              results,
              // NOTE: response, including completionTime, is currently discarded.
              this.facets.returnVoidWatcher,
            );
          });
        },
        /** @type {HostOf<StakingAccountActions['withdrawReward']>} */
        withdrawReward(validator) {
          return asVow(() => {
            trace('withdrawReward', validator);
            const { helper } = this.facets;
            const { chainAddress } = this.state;
            const msg = MsgWithdrawDelegatorReward.toProtoMsg({
              delegatorAddress: chainAddress.value,
              validatorAddress: validator.value,
            });
            const account = helper.owned();

            const results = E(account).executeEncodedTx([Any.toJSON(msg)]);
            return watch(results, this.facets.withdrawRewardWatcher);
          });
        },
        /** @type {HostOf<OrchestrationAccountCommon['getBalance']>} */
        getBalance(denom) {
          return asVow(() => {
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryBalanceRequest.toProtoMsg({
                  address: chainAddress.value,
                  denom: coerceDenom(chainHub, denom),
                }),
              ),
            ]);
            return watch(results, this.facets.balanceQueryWatcher);
          });
        },

        /** @type {HostOf<OrchestrationAccountCommon['getBalances']>} */
        getBalances() {
          return asVow(() => {
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryAllBalancesRequest.toProtoMsg({
                  address: chainAddress.value,
                }),
              ),
            ]);
            return watch(results, this.facets.allBalancesQueryWatcher);
          });
        },

        /** @type {HostOf<OrchestrationAccountCommon['send']>} */
        send(toAccount, amount) {
          return asVow(() => {
            trace('send', toAccount, amount);
            const cosmosDest = chainHub.coerceCosmosAddress(toAccount);
            const { chainAddress } = this.state;
            cosmosDest.chainId === chainAddress.chainId ||
              Fail`bank/send cannot send to a different chain ${q(cosmosDest.chainId)}`;
            const { helper } = this.facets;
            return watch(
              E(helper.owned()).executeEncodedTx([
                Any.toJSON(
                  MsgSend.toProtoMsg({
                    fromAddress: chainAddress.value,
                    toAddress: cosmosDest.value,
                    amount: [helper.amountToCoin(amount)],
                  }),
                ),
              ]),
              this.facets.returnVoidWatcher,
            );
          });
        },

        /** @type {HostOf<OrchestrationAccountCommon['sendAll']>} */
        sendAll(toAccount, amounts) {
          return asVow(() => {
            trace('sendAll', toAccount, amounts);
            const { helper } = this.facets;
            const { chainAddress } = this.state;
            return watch(
              E(helper.owned()).executeEncodedTx([
                Any.toJSON(
                  MsgSend.toProtoMsg({
                    fromAddress: chainAddress.value,
                    toAddress: toAccount.value,
                    amount: amounts.map(x => helper.amountToCoin(x)),
                  }),
                ),
              ]),
              this.facets.returnVoidWatcher,
            );
          });
        },

        /** @type {HostOf<OrchestrationAccountCommon['transfer']>} */
        transfer(destination, amount, opts) {
          const resultMeta = this.facets.holder.transferWithMeta(
            destination,
            amount,
            opts,
          );
          return watch(resultMeta, this.facets.pickDataWatcher, 'result');
        },
        /** @type {HostOf<OrchestrationAccountCommon['transferWithMeta']>} */
        transferWithMeta(destination, amount, opts) {
          trace('transferWithMeta', destination, amount, opts);
          return asVow(() => {
            const cosmosDest = chainHub.coerceCosmosAddress(destination);
            const { helper } = this.facets;
            const token = helper.amountToCoin(amount);

            const connectionInfoV = watch(
              chainHub.getConnectionInfo(this.state.chainAddress, cosmosDest),
            );

            return watch(
              allVows([
                connectionInfoV,
                timestampHelper.vowOrValueFromOpts(opts),
              ]),
              this.facets.transferWithMetaWatcher,
              { opts, token, destination: cosmosDest },
            );
          });
        },

        /** @type {HostOf<OrchestrationAccountCommon['transferSteps']>} */
        transferSteps(amount, msg) {
          console.log('transferSteps got', amount, msg);
          return asVow(() => Fail`not yet implemented`);
        },

        /** @type {HostOf<StakingAccountActions['withdrawRewards']>} */
        withdrawRewards() {
          return asVow(() => Fail`Not Implemented. Try using withdrawReward.`);
        },

        /** @type {HostOf<StakingAccountActions['undelegate']>} */
        undelegate(delegations) {
          return asVow(() => {
            trace('undelegate', delegations);
            const { helper } = this.facets;
            const { chainAddress } = this.state;

            delegations.every(d =>
              d.delegator ? d.delegator.value === chainAddress.value : true,
            ) || Fail`Some delegation record is for another delegator`;

            const undelegateV = watch(
              E(helper.owned()).executeEncodedTx(
                delegations.map(({ validator, amount }) =>
                  Any.toJSON(
                    MsgUndelegate.toProtoMsg({
                      delegatorAddress: chainAddress.value,
                      validatorAddress: validator.value,
                      amount: coerceCoin(chainHub, amount),
                    }),
                  ),
                ),
              ),
              this.facets.undelegateWatcher,
            );
            return watch(undelegateV, this.facets.returnVoidWatcher);
          });
        },
        /** @type {HostOf<IcaAccount['deactivate']>} */
        deactivate() {
          return asVow(() => watch(E(this.facets.helper.owned()).deactivate()));
        },
        /** @type {HostOf<IcaAccount['reactivate']>} */
        reactivate() {
          return asVow(() => watch(E(this.facets.helper.owned()).reactivate()));
        },
        /** @type {HostOf<StakingAccountQueries['getDelegation']>} */
        getDelegation(validator) {
          // @ts-expect-error XXX string template with generics
          return asVow(() => {
            trace('getDelegation', validator);
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryDelegationRequest.toProtoMsg({
                  delegatorAddr: chainAddress.value,
                  validatorAddr: validator.value,
                }),
              ),
            ]);
            return watch(results, this.facets.delegationQueryWatcher);
          });
        },
        /** @type {HostOf<StakingAccountQueries['getDelegations']>} */
        getDelegations() {
          // @ts-expect-error XXX string template with generics
          return asVow(() => {
            trace('getDelegations');
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryDelegatorDelegationsRequest.toProtoMsg({
                  delegatorAddr: chainAddress.value,
                }),
              ),
            ]);
            return watch(results, this.facets.delegationsQueryWatcher);
          });
        },
        /** @type {HostOf<StakingAccountQueries['getUnbondingDelegation']>} */
        getUnbondingDelegation(validator) {
          return asVow(() => {
            trace('getUnbondingDelegation', validator);
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryUnbondingDelegationRequest.toProtoMsg({
                  delegatorAddr: chainAddress.value,
                  validatorAddr: validator.value,
                }),
              ),
            ]);
            return watch(results, this.facets.unbondingDelegationQueryWatcher);
          });
        },
        /** @type {HostOf<StakingAccountQueries['getUnbondingDelegations']>} */
        getUnbondingDelegations() {
          return asVow(() => {
            trace('getUnbondingDelegations');
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryDelegatorUnbondingDelegationsRequest.toProtoMsg({
                  delegatorAddr: chainAddress.value,
                }),
              ),
            ]);
            return watch(results, this.facets.unbondingDelegationsQueryWatcher);
          });
        },
        /** @type {HostOf<StakingAccountQueries['getRedelegations']>} */
        getRedelegations() {
          return asVow(() => {
            trace('getRedelegations');
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryRedelegationsRequest.toProtoMsg({
                  delegatorAddr: chainAddress.value,
                  // These are optional but the protobufs require values to be set
                  dstValidatorAddr: '',
                  srcValidatorAddr: '',
                }),
              ),
            ]);
            return watch(results, this.facets.redelegationsQueryWatcher);
          });
        },
        /** @type {HostOf<StakingAccountQueries['getReward']>} */
        getReward(validator) {
          return asVow(() => {
            trace('getReward', validator);
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryDelegationRewardsRequest.toProtoMsg({
                  delegatorAddress: chainAddress.value,
                  validatorAddress: validator.value,
                }),
              ),
            ]);
            return watch(results, this.facets.rewardQueryWatcher);
          });
        },
        /** @type {HostOf<StakingAccountQueries['getRewards']>} */
        getRewards() {
          // @ts-expect-error XXX string template with generics
          return asVow(() => {
            trace('getRewards');
            const { chainAddress, icqConnection } = this.state;
            if (!icqConnection) {
              throw Fail`Queries not available for chain ${q(chainAddress.chainId)}`;
            }
            const results = E(icqConnection).query([
              toRequestQueryJson(
                QueryDelegationTotalRewardsRequest.toProtoMsg({
                  delegatorAddress: chainAddress.value,
                }),
              ),
            ]);
            return watch(results, this.facets.rewardsQueryWatcher);
          });
        },
        /** @type {HostOf<IcaAccount['executeEncodedTx']>} */
        executeEncodedTx(msgs, opts) {
          return asVow(() =>
            watch(E(this.facets.helper.owned()).executeEncodedTx(msgs, opts)),
          );
        },
        // TODO(#11944): When IcaAccount is upgraded to provide this method directly, use it.
        // /** @type {HostOf<IcaAccount['executeEncodedTxWithMeta']>} */
        // executeEncodedTxWithMeta(msgs, opts = {}) {
        //   return asVow(() =>
        //     E(this.facets.helper.owned()).executeEncodedTxWithMeta(msgs, opts),
        //   );
        // },
        /**
         * Submit a transaction on behalf of the remote account for execution on
         * the remote chain.
         *
         * Set `relativeTimeoutNs` to provide a timeout for the IBC packet.
         *
         * `TxBody` fields like `timeoutHeight` and `memo` can be set, but these
         * typically do not affect IBC app protocols like PFM, ICA.
         *
         * @param {AnyJson[]} msgs
         * @param {Partial<Omit<TxBody, 'messages'>> & {
         *   sendOpts?: SendOptions;
         * }} [opts]
         * @returns {Vow<{ result: Vow<string>; meta: Record<string, any> }>}
         *   .result is a vow for a base64 encoded bytes string. Can be decoded
         *   using `tryDecodeResponses`.
         * @throws {Error} if packet fails to send or an error is returned
         */
        executeEncodedTxWithMeta(msgs, opts = {}) {
          return asVow(() => {
            const { chainAddress } = this.state;
            const { helper } = this.facets;
            const acct = helper.owned();
            const result = watch(E(acct).executeEncodedTx(msgs, opts));

            const agoric = chainHub.getChainInfo('agoric');
            const la = E(acct).getLocalAddress();
            const counterparty = `cosmos:${chainAddress.chainId}`;
            const ra = E(acct).getRemoteAddress();

            return watch(
              allVows([agoric, la, counterparty, ra]),
              this.facets.attachTxMetaWatcher,
              { result, meta: {} },
              'ibc',
            );
          });
        },
        /**
         * @type {HostOf<NobleMethods['depositForBurn']>}
         */
        depositForBurn(destination, amount, caller) {
          return watch(
            E(this.facets.holder).depositForBurnWithMeta(
              destination,
              amount,
              caller,
            ),
            this.facets.pickDataWatcher,
            'result',
          );
        },
        /**
         * @type {HostOf<NobleMethods['depositForBurnWithMeta']>}
         */
        depositForBurnWithMeta(destination, amount, caller) {
          // @ts-expect-error HostOf typing doesn't recurse here
          return asVow(() => {
            trace('depositForBurnWithMeta', { destination, amount });
            const { helper } = this.facets;
            const { chainAddress } = this.state;

            const destParts = parseAccountId(destination);
            /** @type {CaipChainId} */
            const chainId = `${destParts.namespace}:${destParts.reference}`;

            const { cctpDestinationDomain } =
              chainHub.getChainInfoByChainId(chainId);
            if (typeof cctpDestinationDomain !== 'number') {
              throw Fail`${q(chainId)} does not have "cctpDestinationDomain" set in ChainInfo`;
            }

            /** @type {MsgDepositForBurnType} */
            const depositForBurn = {
              amount: helper.amountToCoin(amount)?.amount,
              from: chainAddress.value,
              destinationDomain: cctpDestinationDomain,
              mintRecipient: accountIdTo32Bytes(destination),
              // safe to hardcode since `uusdc` is the only asset supported by CCTP
              burnToken: 'uusdc',
            };

            const destinationCaller = (() => {
              if (!caller) return undefined;
              const callerParts = parseAccountId(caller);
              callerParts.namespace === destParts.namespace ||
                Fail`caller ${q(caller)} must be in same namespace as destination ${q(destination)}`;
              return accountIdTo32Bytes(caller);
            })();

            return this.facets.holder.executeEncodedTxWithMeta([
              Any.toJSON(
                destinationCaller
                  ? MsgDepositForBurnWithCaller.toProtoMsg({
                      ...depositForBurn,
                      destinationCaller,
                    })
                  : MsgDepositForBurn.toProtoMsg(depositForBurn),
              ),
            ]);
          });
        },
      },
    },
  );

  return makeCosmosOrchestrationAccountKit;
};

/**
 * @typedef {ReturnType<
 *   ReturnType<typeof prepareCosmosOrchestrationAccountKit>
 * >} CosmosOrchestrationAccountKit
 */

/**
 * @param {Zone} zone
 * @param {object} powers
 * @param {ChainHub} powers.chainHub
 * @param {MakeRecorderKit} powers.makeRecorderKit
 * @param {Remote<TimerService>} powers.timerService
 * @param {VowTools} powers.vowTools
 * @param {ZCF} powers.zcf
 * @returns {(
 *   ...args: Parameters<
 *     ReturnType<typeof prepareCosmosOrchestrationAccountKit>
 *   >
 * ) => CosmosOrchestrationAccountKit['holder']}
 */
export const prepareCosmosOrchestrationAccount = (
  zone,
  { chainHub, makeRecorderKit, timerService, vowTools, zcf },
) => {
  const makeKit = prepareCosmosOrchestrationAccountKit(zone, {
    chainHub,
    makeRecorderKit,
    timerService,
    vowTools,
    zcf,
  });
  return (...args) => makeKit(...args).holder;
};
/** @typedef {CosmosOrchestrationAccountKit['holder']} CosmosOrchestrationAccount */
