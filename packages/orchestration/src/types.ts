// Ambients
import '@agoric/zoe/exported.js';

import { MsgTransferResponse } from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
import type { Amount, Brand, Payment } from '@agoric/ertp/exported.js';
import type { Timestamp } from '@agoric/time';
import type { IBCConnectionID } from '@agoric/vats';
import type { LocalChainAccount } from '@agoric/vats/src/localchain.js';
import type { EthChainInfo } from './ethereum-api.js';
import type { ICQConnection } from './exos/icqConnectionKit.js';
import type {
  CosmosChainInfo,
  Proto3JSONMsg,
  StakingAccountQueries,
  StakingAccountActions,
  IcaAccount,
  LiquidStakingMethods,
} from './cosmos-api.js';

export type * from './cosmos-api.js';
export type * from './ethereum-api.js';
export type * from './exos/chainAccountKit.js';
export type * from './exos/icqConnectionKit.js';
export type * from './service.js';
export type * from './vat-orchestration.js';

/**
 * static declaration of known chain types will allow type support for
 * additional chain-specific operations like `liquidStake`
 */
export type KnownChains = {
  stride: {
    info: CosmosChainInfo;
    methods: LiquidStakingMethods;
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

/** An address on some blockchain, e.g., cosmos, eth, etc. */
export type ChainAddress = {
  /** e.g. 1 for Ethereum, agoric-3 for Agoric, cosmoshub-4 for Cosmos */
  chainId: string;
  address: string;
  // TODO what's the right way to scope the address? it's not chainId
  addressEncoding: 'bech32' | 'ethereum';
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
  /** Send queries to ibc chains unknown to KnownChains */
  provideICQConnection: (
    controllerConnectionId: IBCConnectionID,
  ) => ICQConnection;

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
 * An object that supports high-level operations for an account on a remote chain.
 */
export interface BaseOrchestrationAccount
  extends StakingAccountQueries,
    StakingAccountActions {
  /** @returns the underlying low-level operation object. */
  getChainAcccount: () => Promise<IcaAccount>;

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
   * Transfer amount to another account on the same chain. The promise settles when the transfer is complete.
   * @param toAccount - the account to send the amount to. MUST be on the same chain
   * @param amount - the amount to send
   * @returns void
   */
  send: (toAccount: ChainAddress, amount: AmountArg) => Promise<void>;

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
  ) => Promise<MsgTransferResponse>;

  /**
   * Transfer an amount to another account in multiple steps. The promise settles when
   * the entire path of the transfer is complete.
   * @param amount - the amount to transfer
   * @param msg - the transfer message, including follow-up steps
   * @returns void
   */
  transferSteps: (
    amount: AmountArg,
    msg: TransferMsg,
  ) => Promise<MsgTransferResponse>;
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

/**
 * @param pool - Required. Pool number
 * @example
 * await icaNoble.transferSteps(usdcAmt,
 *  osmosisSwap(tiaBrand, { pool: 1224, slippage: 0.05 }, icaCel.getAddress()));
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

export type AfterAction = { destChain: string; destAddress: ChainAddress };
export type SwapExact = { amountIn: Amount; amountOut: Amount };
export type SwapMaxSlippage = {
  amountIn: Amount;
  brandOut: Brand;
  slippage: number;
};
