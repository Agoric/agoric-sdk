import type {
  Amount,
  Brand,
  Payment,
  Purse,
  RemotableBrand,
} from '@agoric/ertp/exported.js';
import type { Timestamp } from '@agoric/time';
import type { Invitation } from '@agoric/zoe/exported.js';
import type { Any } from '@agoric/cosmic-proto/google/protobuf/any';
import type { AnyJson } from '@agoric/cosmic-proto';
import type {
  MsgCancelUnbondingDelegation,
  MsgUndelegateResponse,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/tx.js';
import type {
  Delegation,
  Redelegation,
  UnbondingDelegation,
} from '@agoric/cosmic-proto/cosmos/staking/v1beta1/staking.js';

/**
 * static declaration of known chain types will allow type support for
 * additional chain-specific operations like `liquidStake`
 */
export type KnownChains = {
  stride: {
    info: CosmosChainInfo;
    methods: {
      liquidStake: (amount: AmountArg) => Promise<void>;
    };
  };
  cosmos: { info: CosmosChainInfo; methods: {} };
  agoric: {
    info: Omit<CosmosChainInfo, 'ibcConnectionInfo'>;
    methods: {
      // TODO reference type from #8624 `packages/vats/src/localchain.js`
      /**
       * Register a hook to intercept an incoming IBC Transfer and handle it.
       * Calling without arguments will unregister the hook.
       */
      interceptTransfer: (tap?: {
        upcall: (args: any) => Promise<any>;
      }) => Promise<void>;
    };
  };
  celestia: { info: CosmosChainInfo; methods: {} };
  osmosis: { info: CosmosChainInfo; methods: {} };
};

/** A helper type for type extensions. */
export type TypeUrl = string;

/**
 * A denom that designates a token type on some blockchain.
 *
 * Multiple denoms may designate the same underlying base denom (e.g., `uist`,
 * `uatom`) on different Chains or on the same Chain via different paths. On
 * Cosmos chains, all but the base denom are IBC style denoms, but that may vary
 * across other chains. All the denoms that designate the same underlying base
 * denom form an equivalence class, along with the unique Brand on the local
 * Chain. Some operations accept any member of the equivalence class to
 * effectively designate the corresponding token type on the target chain.
 */
export type Denom = string; // ibc/... or uist

/**
 * In many cases, either a denom string or a local Brand can be used to
 * designate a remote token type.
 */
export type DenomArg = Brand | Denom;

export type Proto3JSONMsg = {
  '@type': TypeUrl;
  value: Record<string, unknown>;
};
/** An address on some blockchain, e.g., cosmos, eth, etc. */
export type ChainAddress = {
  /** e.g. 1 for Ethereum, agoric-3 for Agoric, cosmoshub-4 for Cosmos */
  chainId: string;
  address: string;
  // TODO what's the right way to scope the address? it's not chainId
  addressEncoding: 'bech32' | 'ethereum';
};

/** An address for a validator on some blockchain, e.g., cosmos, eth, etc. */
export type CosmosValidatorAddress = ChainAddress & {
  // TODO document why this is the format
  address: `${string}valoper${string}`;
  addressEncoding: 'bech32';
};

/** Details for setup will be determined in the implementation. */
export interface OrchestrationGovernor {
  registerChain: (
    chainName: string,
    info: ChainInfo,
    methods?: Record<string, any>,
  ) => Promise<void>;
}

/** Description for an amount of some fungible currency */
export type ChainAmount = {
  denom: Denom;
  value: bigint; // Nat
};

/** Amounts can be provided as pure data using denoms or as native Amounts */
export type AmountArg = ChainAmount | Amount;

// chainName: managed like agoricNames. API consumers can make/provide their own
export interface Orchestrator {
  getChain: <C extends keyof KnownChains>(chainName: C) => Promise<Chain<C>>;

  makeLocalAccount: () => Promise<LocalChainAccount>;

  /**
   * For a denom, return information about a denom including the equivalent
   * local Brand, the Chain on which the denom is held, and the Chain that
   * issues the corresponding asset.
   * @param denom
   */
  getBrandInfo: <
    HoldingChain extends keyof KnownChains,
    IssuingChain extends keyof KnownChains,
  >(
    denom: Denom,
  ) => {
    /** The well-known Brand on Agoric for the direct asset */
    brand?: Brand;
    /** The Chain at which the argument `denom` exists (where the asset is currently held) */
    chain: Chain<HoldingChain>;
    /** The Chain that is the issuer of the underlying asset */
    base: Chain<IssuingChain>;
    /** the Denom for the underlying asset on its issuer chain */
    baseDenom: Denom;
  };
  /**
   * Convert an amount described in native data to a local, structured Amount.
   * @param amount - the described amount
   * @returns the Amount in local structuerd format
   */
  asAmount: (amount: ChainAmount) => Amount;
}

// orchestrate('LSTTia', { zcf }, async (orch, { zcf }, seat, offerArgs) => {...})
// export type OrchestrationHandlerMaker<Context> =
// TODO @turadg add typed so that the ctx object and args are consistently typed
export type OrchestrationHandlerMaker = <C extends object>(
  durableName: string,
  ctx: C,
  fn: (orc: Orchestrator, ctx2: C, ...args) => object,
) => (...args) => object;

/**
 * Info for an Ethereum-based chain.
 */
export type EthChainInfo = {
  chainId: string;
  allegedName: string;
};

/**
 * Info for a Cosmos-based chain.
 */
export type CosmosChainInfo = {
  chainId: string;
  ibcConnectionInfo: {
    id: string; // e.g. connection-0
    client_id: string; // '07-tendermint-0'
    state: 'OPEN' | 'TRYOPEN' | 'INIT' | 'CLOSED';
    counterparty: {
      client_id: string;
      connection_id: string;
      prefix: {
        key_prefix: string;
      };
    };
    versions: { identifier: string; features: string[] }[];
    delay_period: bigint;
  };
  icaEnabled: boolean;
  icqEnabled: boolean;
  pfmEnabled: boolean;
  ibcHooksEnabled: boolean;
  /**
   *
   */
  allowedMessages: TypeUrl[];
  allowedQueries: TypeUrl[];
};

export type ChainInfo = CosmosChainInfo | EthChainInfo;

// marker interface
interface QueryResult {}

/**
 * An object for access the core functions of a remote chain.
 *
 * Note that "remote" can mean the local chain; it's just that
 * accounts are treated as remote/arms length for consistency.
 */
export interface Chain<C extends keyof KnownChains> {
  getChainInfo: () => Promise<KnownChains[C]['info']>;

  // "makeAccount" suggests an operation within a vat
  /**
   * Creates a new account on the remote chain.
   * @returns an object that controls a new remote account on Chain
   */
  makeAccount: () => Promise<OrchestrationAccount<C>>;
  // FUTURE supply optional port object; also fetch port object

  /**
   * Low level operation to query external chain state (e.g., governance params)
   * @param queries
   * @returns
   *
   */
  query: (queries: Proto3JSONMsg[]) => Promise<Iterable<QueryResult>>;

  /**
   * Get the Denom on this Chain corresponding to the denom or Brand on
   * this or another Chain.
   * @param denom
   * @returns
   */
  getLocalDenom: (denom: DenomArg) => Promise<Denom>;
}

/**
 * Low level object that supports queries and operations for an account on a remote chain.
 */
export interface ChainAccount {
  /**
   * @returns the address of the account on the remote chain
   */
  getAddress: () => ChainAddress;
  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @returns acknowledgement string
   */
  executeTx: (msgs: Proto3JSONMsg[]) => Promise<string>;
  /**
   * Submit a transaction on behalf of the remote account for execution on the remote chain.
   * @param msgs - records for the transaction
   * @returns acknowledge string
   */
  executeEncodedTx: (msgs: AnyJson[]) => Promise<string>;
  /** deposit payment from zoe to the account*/
  deposit: (payment: Payment) => Promise<void>;
  /** get Purse for a brand to .withdraw() a Payment from the account */
  getPurse: (brand: Brand) => Promise<Purse>;
  /**
   * Close the remote account
   */
  close: () => Promise<void>;
  /* transfer account to new holder */
  prepareTransfer: () => Promise<Invitation>;
}

/**
 * An object that supports high-level operations for an account on a remote chain.
 */
export interface BaseOrchestrationAccount {
  /** @returns the underlying low-level operation object. */
  getChainAcccount: () => Promise<ChainAccount>;

  /**
   * @returns the address of the account on the remote chain
   */
  getAddress: () => ChainAddress;

  /** @returns an array of amounts for every balance in the account. */
  getBalances: () => Promise<ChainAmount[]>;

  /** @returns the balance of a specific denom for the account. */
  getBalance: (denom: DenomArg) => Promise<ChainAmount>;

  getDenomTrace: (
    denom: string,
  ) => Promise<{ path: string; base_denom: string }>;

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
  getRewards: () => Promise<ChainAmount[]>;

  /**
   * Get the rewards pending with a specific validator.
   * @param validator - the validator address to query for
   * @returns the amount of the account's rewards pending from a specific validator
   */
  getReward: (validator: CosmosValidatorAddress) => Promise<ChainAmount[]>;

  /**
   * Transfer amount to another account on the same chain. The promise settles when the transfer is complete.
   * @param toAccount - the account to send the amount to. MUST be on the same chain
   * @param amount - the amount to send
   * @returns void
   */
  send: (toAccount: ChainAddress, amount: AmountArg) => Promise<void>;

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
   * Settles when teh redelegation is established, not 21 days later.
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
   * @param {Delegation[]} delegations - the delegation to undelegate
   */
  undelegate: (delegations: Delegation[]) => Promise<void>;

  /**
   * Withdraw rewards from all validators. The promise settles when the rewards are withdrawn.
   * @returns The total amounts of rewards withdrawn
   */
  withdrawRewards: () => Promise<ChainAmount[]>;

  /**
   * Withdraw rewards from a specific validator. The promise settles when the rewards are withdrawn.
   * @param validator - the validator to withdraw rewards from
   * @returns
   */
  withdrawReward: (validator: CosmosValidatorAddress) => Promise<ChainAmount[]>;

  /**
   * Transfer an amount to another account, typically on another chain.
   * The promise settles when the transfer is complete.
   * @param amount - the amount to transfer.
   * @param destination - the account to transfer the amount to.
   * @param memo - an optional memo to include with the transfer, which could drive custom PFM behavior
   * @returns void
   *
   * TODO document the mapping from the address to the destination chain.
   */
  transfer: (
    amount: AmountArg,
    destination: ChainAddress,
    memo?: string,
  ) => Promise<void>;

  /**
   * Transfer an amount to another account in multiple steps. The promise settles when
   * the entire path of the transfer is complete.
   * @param amount - the amount to transfer
   * @param msg - the transfer message, including follow-up steps
   * @returns void
   */
  transferSteps: (amount: AmountArg, msg: TransferMsg) => Promise<void>;
  /**
   * deposit payment from zoe to the account. For remote accounts,
   * an IBC Transfer will be executed to transfer funds there.
   */
  deposit: (payment: Payment) => Promise<void>;
}

export type OrchestrationAccount<C extends keyof KnownChains> =
  BaseOrchestrationAccount & KnownChains[C]['methods'];

/**
 * Internal structure for TransferMsgs.
 *
 * NOTE Expected to change, so consider an opaque structure.
 */
export type TransferMsg = {
  toAccount: ChainAddress;
  timeout?: Timestamp;
  next?: TransferMsg;
  data?: object;
};

// Example
// await icaNoble.transferSteps(usdcAmt,
//   osmosisSwap(tiaBrand, { pool: 1224, slippage: 0.05 }, icaCel.getChainAddress()));

/**
 * @param pool - Required. Pool number
 */
export type OsmoSwapOptions = {
  pool: string;
  slippage?: Number;
};

/**
 * Make a TransferMsg for a swap operation.
 * @param denom - the currency to swap to
 * @param options
 * @param slippage - the maximum acceptable slippage
 */
export type OsmoSwapFn = (
  denom: DenomArg,
  options: Partial<OsmoSwapOptions>,
  next: TransferMsg | ChainAddress,
) => TransferMsg;

type AfterAction = { destChain: string; destAddress: ChainAddress };
type SwapExact = { amountIn: Amount; amountOut: Amount };
type SwapMaxSlippage = { amountIn: Amount; brandOut: Brand; slippage: number };
