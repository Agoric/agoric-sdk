import type { AnyJson, TypedJson } from '@agoric/cosmic-proto';
import type {
  Delegation,
  Redelegation,
  UnbondingDelegation,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';
import type { TxBody } from '@agoric/cosmic-proto/cosmos/tx/v1beta1/tx.js';
import type { MsgTransfer } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type {
  State as IBCChannelState,
  Order,
} from '@agoric/cosmic-proto/ibc/core/channel/v1/channel.js';
import type { State as IBCConnectionState } from '@agoric/cosmic-proto/ibc/core/connection/v1/connection.js';
import type { Brand, Purse, Payment, Amount } from '@agoric/ertp/src/types.js';
import type { Port } from '@agoric/network';
import type { IBCChannelID, IBCConnectionID } from '@agoric/vats';
import type {
  LocalIbcAddress,
  RemoteIbcAddress,
} from '@agoric/vats/tools/ibc-utils.js';
import type { AmountArg, ChainAddress, DenomAmount } from './types.js';

/** An address for a validator on some blockchain, e.g., cosmos, eth, etc. */
export type CosmosValidatorAddress = ChainAddress & {
  // infix for Validator Operator https://docs.cosmos.network/main/learn/beginner/accounts#addresses
  value: `${string}valoper${string}`;
  encoding: 'bech32';
};

/** Represents an IBC Connection between two chains, which can contain multiple Channels. */
export type IBCConnectionInfo = {
  id: IBCConnectionID; // e.g. connection-0
  client_id: string; // '07-tendermint-0'
  state: IBCConnectionState;
  counterparty: {
    client_id: string;
    connection_id: IBCConnectionID;
    prefix: {
      key_prefix: string;
    };
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
};

/**
 * Info for a Cosmos-based chain.
 */
export type CosmosChainInfo = Readonly<{
  chainId: string;

  connections?: Record<string, IBCConnectionInfo>; // chainId or wellKnownName
  // UNTIL https://github.com/Agoric/agoric-sdk/issues/9326
  icqEnabled?: boolean;

  /**
   * cf https://github.com/cosmos/chain-registry/blob/master/chain.schema.json#L117
   */
  stakingTokens?: Readonly<Array<{ denom: string }>>;
}>;

export interface StakingAccountQueries {
  /**
   * @returns all active delegations from the account to any validator (or [] if none)
   */
  getDelegations: () => Promise<Delegation[]>;

  /**
   * @returns the active delegation from the account to a specific validator. Return an
   * empty Delegation if there is no delegation.
   */
  getDelegation: (validator: CosmosValidatorAddress) => Promise<Delegation>;

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

  getRedelegations: () => Promise<Redelegation[]>;

  getRedelegation: (
    srcValidator: CosmosValidatorAddress,
    dstValidator?: CosmosValidatorAddress,
  ) => Promise<Redelegation>;

  /**
   * Get the pending rewards for the account.
   * @returns the amounts of the account's rewards pending from all validators
   */
  getRewards: () => Promise<DenomAmount[]>;

  /**
   * Get the rewards pending with a specific validator.
   * @param validator - the validator address to query for
   * @returns the amount of the account's rewards pending from a specific validator
   */
  getReward: (validator: CosmosValidatorAddress) => Promise<DenomAmount[]>;
}
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
    delegations: Omit<Delegation, 'delegatorAddress'>[],
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
 * Low level object that supports queries and operations for an account on a remote chain.
 */
export interface IcaAccount {
  /**
   * @returns the address of the account on the remote chain
   */
  getAddress: () => ChainAddress;

  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @returns acknowledgement string
   */
  executeTx: (msgs: TypedJson[]) => Promise<string>;
  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @param [opts] - optional parameters for the Tx, like `timeoutHeight` and `memo`
   * @returns acknowledgement string
   */
  executeEncodedTx: (
    msgs: AnyJson[],
    opts?: Partial<Omit<TxBody, 'messages'>>,
  ) => Promise<string>;
  /** get Purse for a brand to .withdraw() a Payment from the account */
  getPurse: (brand: Brand) => Promise<Purse>;
  /**
   * Close the remote account
   */
  close: () => Promise<void>;
  /** @returns the address of the remote channel */
  getRemoteAddress: () => RemoteIbcAddress;
  /** @returns the address of the local channel */
  getLocalAddress: () => LocalIbcAddress;
  /** @returns the port the ICA channel is bound to */
  getPort: () => Port;
}

export type LiquidStakingMethods = {
  liquidStake: (amount: AmountArg) => Promise<void>;
};

export type LocalAccountMethods = {
  /** deposit payment (from zoe, for example) to the account */
  deposit: (payment: Payment<'nat'>) => Promise<void>;
  /** withdraw a Payment from the account */
  withdraw: (amount: Amount<'nat'>) => Promise<Payment<'nat'>>;
};

export type IBCMsgTransferOptions = {
  timeoutHeight?: MsgTransfer['timeoutHeight'];
  timeoutTimestamp?: MsgTransfer['timeoutTimestamp'];
  memo?: string;
};

export type CosmosChainAccountMethods<CCI extends CosmosChainInfo> =
  (CCI extends {
    icaEnabled: true;
  }
    ? IcaAccount
    : {}) &
    CCI extends {
    stakingTokens: {};
  }
    ? StakingAccountActions
    : {};
