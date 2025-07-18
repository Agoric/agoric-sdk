/* eslint-disable @typescript-eslint/no-unused-vars -- fails to notice the @see uses */
import type { AnyJson, JsonSafe, TypedJson } from '@agoric/cosmic-proto';
import type { Coin } from '@agoric/cosmic-proto/cosmos/base/v1beta1/coin.js';
import type {
  RedelegationResponse,
  UnbondingDelegation,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
import type { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import type { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type { FungibleTokenPacketData } from '@agoric/cosmic-proto/ibc/applications/transfer/v2/packet.js';
import type {
  State as IBCChannelState,
  Order,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import type { State as IBCConnectionState } from '@agoric/cosmic-proto/ibc/core/connection/v1/connection.js';
import type {
  RequestQuery,
  ResponseQuery,
} from '@agoric/cosmic-proto/tendermint/abci/types.js';
import type { Amount, Payment } from '@agoric/ertp/src/types.js';
import type { Port, SendOptions } from '@agoric/network';
import type { TimerService } from '@agoric/time';
import type {
  IBCChannelID,
  IBCConnectionID,
  IBCPortID,
  VTransferIBCEvent,
} from '@agoric/vats';
import type {
  TargetApp,
  TargetRegistration,
} from '@agoric/vats/src/bridge-target.js';
import type {
  LocalIbcAddress,
  RemoteIbcAddress,
} from '@agoric/vats/tools/ibc-utils.js';
import { PFM_RECEIVER } from './exos/chain-hub.js';
import type {
  AccountId,
  AmountArg,
  BaseChainInfo,
  CosmosChainAddress,
  Denom,
  DenomAmount,
} from './types.js';

/**
 * @example
 *
 *    agoric1megzytg65cyrgzs6fvzxgrcqvwwl7ugpt62346
 *    cosmosvaloper1npm9gvss52mlmk
 */
export type Bech32Address = `${string}1${string}`;

/** An address for a validator on some blockchain, e.g., cosmos, eth, etc. */
export type CosmosValidatorAddress = CosmosChainAddress & {
  // infix for Validator Operator https://docs.cosmos.network/main/learn/beginner/accounts#addresses
  value: `${string}valoper${string}`;
  encoding: 'bech32';
};

/** Represents an IBC Connection between two chains, which can contain multiple Channels. */
export interface IBCConnectionInfo {
  id: IBCConnectionID; // e.g. connection-0
  client_id: string; // '07-tendermint-0'
  state: IBCConnectionState;
  counterparty: {
    client_id: string;
    connection_id: IBCConnectionID;
  };
  transferChannel: {
    portId: string;
    channelId: IBCChannelID;
    counterPartyPortId: string;
    counterPartyChannelId: IBCChannelID;
    ordering: Order;
    state: IBCChannelState;
    version: string; // e.eg. 'ics20-1'
  };
}

/**
 * https://github.com/cosmos/chain-registry/blob/master/assetlist.schema.json
 */
export interface CosmosAssetInfo extends Record<string, unknown> {
  base: Denom;
  name: string;
  display: string;
  symbol: string;
  denom_units: Array<{ denom: Denom; exponent: number }>;
  traces?: Array<{
    type: 'ibc';
    counterparty: {
      chain_name: string;
      base_denom: Denom;
      channel_id: IBCChannelID;
    };
    chain: {
      channel_id: IBCChannelID;
      path: string;
    };
  }>;
}

/**
 * Info for a Cosmos-based chain.
 */
export interface CosmosChainInfo extends BaseChainInfo {
  /** can be used to lookup chainInfo (chainId) from an address value */
  bech32Prefix: string;
  /** Cosmos chain ID. The CAIP-2 fields (namespace, reference) are on {@link BaseChainInfo}. */
  chainId: string;
  /**  IBC connections between this chain and others, keyed by chainId */
  connections?: Record<string, IBCConnectionInfo>;
  /** indicates the host chain supports Interchain Accounts (ICS-27). Not currently used at runtime - only for types */
  icaEnabled?: boolean;
  /**
   * indicates the host chain support the async-icq IBC Application protocol. Used at runtime to permit `Chain.query()` operations.
   *
   * in the future (@see https://github.com/Agoric/agoric-sdk/issues/9326), querying will be supported by the ICA protocol natively and this will likely deprecate
   */
  icqEnabled?: boolean;
  namespace: 'cosmos';
  /**
   * Note: developers must provide this value themselves for `.transfer` to work
   * as expected. Please see examples for details.
   */
  pfmEnabled?: boolean;
  /**
   * cf https://github.com/cosmos/chain-registry/blob/master/chain.schema.json#L117
   */
  stakingTokens?: Readonly<Array<{ denom: string }>>;
}

// #region Orchestration views on Cosmos response types
// Naming scheme: Cosmos for the chain system, Rewards b/c getRewards function,
// and Response because it's the return value.

/** @see {QueryDelegationTotalRewardsResponse} */
export interface CosmosRewardsResponse {
  rewards: { validator: CosmosValidatorAddress; reward: DenomAmount[] }[];
  total: DenomAmount[];
}

/** @see {DelegationResponse} */
export interface CosmosDelegationResponse {
  delegator: CosmosChainAddress;
  validator: CosmosValidatorAddress;
  amount: DenomAmount;
}
// #endregion

/**
 * Queries for the staking properties of an account.
 *
 * @see {@link https://docs.cosmos.network/main/build/modules/staking#messages x/staking messages}
 * {@link https://cosmos.github.io/cosmjs/latest/stargate/interfaces/StakingExtension.html StakingExtension} in cosmjs
 */
export interface StakingAccountQueries {
  /**
   * @returns all active delegations from the account to any validator (or [] if none)
   */
  getDelegations: () => Promise<CosmosDelegationResponse[]>;

  /**
   * @returns the active delegation from the account to a specific validator. Return an
   * empty Delegation if there is no delegation.
   */
  getDelegation: (
    validator: CosmosValidatorAddress,
  ) => Promise<CosmosDelegationResponse>;

  /**
   * @returns the unbonding delegations from the account to any validator (or [] if none)
   */
  getUnbondingDelegations: () => Promise<UnbondingDelegation[]>;

  /**
   * @returns the unbonding delegations from the account to a specific validator (or [] if none)
   */
  getUnbondingDelegation: (
    validator: CosmosValidatorAddress,
  ) => Promise<UnbondingDelegation>;

  getRedelegations: () => Promise<RedelegationResponse[]>;

  /**
   * Get the pending rewards for the account.
   * @returns the amounts of the account's rewards pending from all validators
   */
  getRewards: () => Promise<CosmosRewardsResponse>;

  /**
   * Get the rewards pending with a specific validator.
   * @param validator - the validator address to query for
   * @returns the amount of the account's rewards pending from a specific validator
   */
  getReward: (validator: CosmosValidatorAddress) => Promise<DenomAmount[]>;
}

/**
 * Transactions for doing staking operations on an individual account.
 *
 * @see {@link https://docs.cosmos.network/main/build/modules/staking#messages x/staking messages} and
 * {@link https://cosmos.github.io/cosmjs/latest/stargate/interfaces/StakingExtension.html StakingExtension} in cosmjs
 */
export interface StakingAccountActions {
  /**
   * Delegate an amount to a validator. The promise settles when the delegation is complete.
   * @param validator - the validator to delegate to
   * @param amount  - the amount to delegate
   * @returns void
   */
  delegate: (
    validator: CosmosValidatorAddress,
    amount: AmountArg,
  ) => Promise<void>;

  /**
   * Redelegate from one delegator to another.
   * Settles when the redelegation is established, not 21 days later.
   * @param srcValidator - the current validator for the delegation.
   * @param dstValidator - the validator that will receive the delegation.
   * @param amount - how much to redelegate.
   * @returns
   */
  redelegate: (
    srcValidator: CosmosValidatorAddress,
    dstValidator: CosmosValidatorAddress,
    amount: AmountArg,
  ) => Promise<void>;

  /**
   * Undelegate multiple delegations (concurrently). To delegate independently, pass an array with one item.
   * Resolves when the undelegation is complete and the tokens are no longer bonded. Note it may take weeks.
   * The unbonding time is padded by 10 minutes to account for clock skew.
   * @param delegations - the delegation to undelegate
   */
  undelegate: (
    delegations: {
      amount: AmountArg;
      delegator?: CosmosChainAddress;
      validator: CosmosValidatorAddress;
    }[],
  ) => Promise<void>;

  /**
   * Withdraw rewards from all validators. The promise settles when the rewards are withdrawn.
   * @returns The total amounts of rewards withdrawn
   */
  withdrawRewards: () => Promise<DenomAmount[]>;

  /**
   * Withdraw rewards from a specific validator. The promise settles when the rewards are withdrawn.
   * @param validator - the validator to withdraw rewards from
   * @returns
   */
  withdrawReward: (validator: CosmosValidatorAddress) => Promise<DenomAmount[]>;
}

/**
 * Low level methods from IcaAccount that we pass through to CosmosOrchestrationAccount
 */

export interface IcaAccountMethods {
  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @param [opts] - optional parameters for the Tx. use `opts.sendOpts.relativeTimeoutNs` to specify a timeout for the ICA tx packet
   * @returns acknowledgement string
   */
  executeEncodedTx: (
    msgs: AnyJson[],
    opts?: Partial<Omit<TxBody, 'messages'>> & { sendOpts?: SendOptions },
  ) => Promise<string>;
  /**
   * Deactivates the ICA account by closing the ICA channel. The `Port` is
   * persisted so holders can always call `.reactivate()` to re-establish a new
   * channel with the same chain address.
   * CAVEAT: Does not retrieve assets so they may be lost if left.
   * @throws {Error} if connection is not available or already deactivated
   */
  deactivate: () => Promise<void>;
  /**
   * Reactivates the ICA account by re-establishing a new channel with the
   * original Port and requested address.
   * If a channel is closed for an unexpected reason, such as a packet timeout,
   * an automatic attempt to re will be made and the holder should not need
   * to call `.reactivate()`.
   * @throws {Error} if connection is currently active
   */
  reactivate: () => Promise<void>;
}

/**
 * Low level object that supports queries and operations for an account on a remote chain.
 */
export interface IcaAccount extends IcaAccountMethods {
  /**
   * @returns the address of the account on the remote chain
   */
  getAddress: () => CosmosChainAddress;

  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @returns acknowledgement string
   */
  executeTx: (msgs: TypedJson[]) => Promise<string>;
  /** @returns the address of the remote channel */
  getRemoteAddress: () => RemoteIbcAddress;
  /** @returns the address of the local channel */
  getLocalAddress: () => LocalIbcAddress;
  /** @returns the port the ICA channel is bound to */
  getPort: () => Port;
}

/** Methods on chains that support Liquid Staking */
export interface LiquidStakingMethods {
  liquidStake: (amount: AmountArg) => Promise<void>;
}

/**
 * Noble is the gateway to transferring USDC among Cosmos chains. We can
 * transfer funds from any cosmos account using depositForBurn().
 */
export interface NobleMethods {
  /** burn USDC on Noble and mint on a destination chain via CCTP */
  depositForBurn: (
    mintRecipient: AccountId,
    amount: AmountArg,
    /** if specified, only this account can call MsgReceive on the destination chain */
    caller?: AccountId,
  ) => Promise<void>;
}

// TODO support StakingAccountQueries
/** Methods supported only on Agoric chain accounts */
export interface LocalAccountMethods extends StakingAccountActions {
  /** deposit payment (from zoe, for example) to the account */
  deposit: (payment: Payment<'nat'>) => Promise<Amount<'nat'>>;
  /** withdraw a Payment from the account */
  withdraw: (amount: Amount<'nat'>) => Promise<Payment<'nat'>>;
  /**
   * Register a handler that receives an event each time ICS-20 transfers are
   * sent or received by the underlying account.
   *
   * Handler includes {@link VTransferIBCEvent} and
   * {@link FungibleTokenPacketData} that can be used for application logic.
   *
   * Each account may be associated with at most one handler at a given time.
   *
   * Does not grant the handler the ability to intercept a transfer. For a
   * blocking handler, aka 'IBC Hooks', leverage `registerActiveTap` from
   * `transferMiddleware` directly.
   *
   * @param tap
   */
  monitorTransfers: (tap: TargetApp) => Promise<TargetRegistration>;
  /**
   * Parse an incoming transfer message and return its details.
   */
  parseInboundTransfer: (packet: Record<string, any>) => Promise<{
    amount: DenomAmount;
    fromAccount: string;
    toAccount: string;
    extra: Record<string, any>;
  }>;
}

/**
 * Options for {@link OrchestrationAccountI} `transfer` method.
 *
 * If specifying a custom timeout, use one of `timeoutHeight`, `timeoutTimestamp`, or `timeoutRelativeSeconds`.
 *
 * @see {@link https://github.com/cosmos/ibc/tree/master/spec/app/ics-020-fungible-token-transfer#data-structures ICS 20 Data Structures}
 */
export type IBCMsgTransferOptions = {
  timeoutHeight?: MsgTransfer['timeoutHeight'];
  timeoutTimestamp?: MsgTransfer['timeoutTimestamp'];
  /** converted using {@link TimerService} to a `timeoutTimestamp` value `timeoutRelativeSeconds` in the future */
  timeoutRelativeSeconds?: bigint;
  memo?: string;
  forwardOpts?: {
    /** The recipient address for the intermediate transfer. Defaults to 'pfm' unless specified */
    intermediateRecipient?: CosmosChainAddress;
    timeout?: ForwardInfo['forward']['timeout'];
    retries?: ForwardInfo['forward']['retries'];
  };
};

/**
 * Cosmos-specific methods to extend `OrchestrationAccountI`, parameterized
 * by `CosmosChainInfo`.
 *
 * In particular, if the chain info includes a staking token, {@link StakingAccountActions}
 * are available.
 *
 * @see {OrchestrationAccountI}
 */
export type CosmosChainAccountMethods<CCI extends { chainId: string }> =
  IcaAccountMethods &
    (CCI extends {
      stakingTokens: object;
    }
      ? StakingAccountActions & StakingAccountQueries
      : object);

export type ICQQueryFunction = (
  msgs: JsonSafe<RequestQuery>[],
) => Promise<JsonSafe<ResponseQuery>[]>;

/**
 * Message structure for PFM memo
 *
 * @see {@link https://github.com/cosmos/chain-registry/blob/58b603bbe01f70e911e3ad2bdb6b90c4ca665735/_memo_keys/ICS20_memo_keys.json#L38-L60}
 */
export interface ForwardInfo {
  forward: {
    receiver: CosmosChainAddress['value'];
    port: IBCPortID;
    channel: IBCChannelID;
    /** e.g. '10m' */
    timeout: GoDuration;
    /** default is 3? */
    retries: number;
    next?: {
      forward: ForwardInfo;
    };
  };
}

/**
 * Object used to help build MsgTransfer parameters for IBC transfers.
 *
 * If `forwardInfo` is present:
 * - it must be stringified and provided as the `memo` field value for
 * use with `MsgTransfer`.
 * - `receiver` will be set to `"pfm"` - purposely invalid bech32. see {@link https://github.com/cosmos/ibc-apps/blob/26f3ad8f58e4ffc7769c6766cb42b954181dc100/middleware/packet-forward-middleware/README.md#minimal-example---chain-forward-a-b-c}
 */
export type TransferRoute = {
  /** typically, `transfer` */
  sourcePort: string;
  sourceChannel: IBCChannelID;
  token: Coin;
} & (
  | {
      receiver: typeof PFM_RECEIVER | CosmosChainAddress['value'];
      /** contains PFM forwarding info */
      forwardInfo: ForwardInfo;
    }
  | {
      receiver: string;
      forwardInfo?: never;
    }
);

/** Single units allowed in Go time duration strings */
type GoDurationUnit = 'h' | 'm' | 's' | 'ms' | 'us' | 'ns';

/**
 * Type for a time duration string in Go (cosmos-sdk). For example, "1h", "3m".
 *
 * Note: this does not support composite values like "1h30m", "1m30s",
 * which are allowed in Go.
 *
 * @see https://pkg.go.dev/time#ParseDuration
 */
export type GoDuration = `${number}${GoDurationUnit}`;
