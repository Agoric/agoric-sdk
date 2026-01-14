/* eslint-disable @typescript-eslint/no-unused-vars -- doesn't see type usage in JSDoc */
import type { NatAmount } from '@agoric/ertp';
import {
  type AccountId,
  type Bech32Address,
  type CosmosChainAddress,
  type TrafficEntry,
} from '@agoric/orchestration';
import type {
  ContinuingInvitationSpec,
  ContractInvitationSpec,
} from '@agoric/smart-wallet/src/invitations.js';
import type {
  AxelarChain,
  SupportedChain,
  YieldProtocol,
} from './constants.js';
import type { InstrumentId } from './instruments.js';
import type { PublishedTx } from './resolver.js';

/**
 * Feature flags to handle contract upgrade flow compatibility.
 */
export type FlowFeatures = {
  /** Control `ProgressTracker` support. */
  useProgressTracker?: boolean;
};

/**
 * Configuration options for flows.
 */
export type FlowConfig = {
  features?: FlowFeatures;
};
export type SeatKeyword = 'Cash' | 'Deposit';

/**
 * Reference to a local chain accounts (LCA).
 * '+agoric' is published as `depositAddress`
 */
export type LocalChainAccountRef = '+agoric';

/**
 * Identifies the blockchain hosting an address external to ymax from which
 * funds for a deposit must be supplied.
 */
export type DepositFromChainRef = `+${AxelarChain}`;

/**
 * Identifies the blockchain hosting an address external to ymax to which
 * withdrawn funds will be sent.
 */
export type WithdrawToChainRef = `-${AxelarChain}`;

export type InterChainAccountRef = `@${SupportedChain}`;

/**
 * An AssetPlaceRef describes a place where funds can be, either an
 * {@link InstrumentId} (starting with an ASCII letter), a {@link SeatKeyword}
 * wrapped in `<...>` angle brackets, or a value consisting of a
 * single-character punctuator followed by a SupportedChain (that character
 * being `@` for {@link InterChainAccountRef}, `+` for
 * {@link LocalChainAccountRef} and {@link DepositFromChainRef}, and `-` for
 * {@link WithdrawToChainRef}).
 */
export type AssetPlaceRef =
  | `<${SeatKeyword}>`
  | LocalChainAccountRef
  | DepositFromChainRef
  | WithdrawToChainRef
  | InterChainAccountRef
  | InstrumentId;

type Empty = Record<never, NatAmount>;

/**
 * Proposal shapes for portfolio operations.
 *
 * **openPortfolio**: Create portfolio with initial funding across protocols
 * **rebalance**: Add funds (give) or withdraw funds (want) from protocols
 */
export type ProposalType = {
  openPortfolio: {
    give: {
      /** required iff the contract was started with an Access issuer */
      Access?: NatAmount;
      Deposit?: NatAmount;
    };
    want?: Empty;
  };
  rebalance:
    | { give: { Deposit?: NatAmount }; want: Empty }
    | { want: { Cash: NatAmount }; give: Empty };
  withdraw: { want: { Cash: NatAmount }; give: Empty };
  deposit: { give: { Deposit: NatAmount }; want: Empty };
};

/**
 * Target allocation mapping from PoolKey to numerator (typically in basis points).
 * Denominator is implicitly the sum of all numerators.
 */
export type TargetAllocation = Partial<Record<InstrumentId, bigint>>;

export type FlowDetail =
  | { type: 'withdraw'; amount: NatAmount; toChain?: SupportedChain }
  | { type: 'deposit'; amount: NatAmount; fromChain?: SupportedChain }
  | { type: 'rebalance' }; // aka simpleRebalance

/** linked list of concurrent failures, including dependencies */
export type FlowErrors = {
  step: number;
  how: string;
  error: string;
  next?: FlowErrors;
};

export type FlowStatus =
  | {
      state: 'run';
      /** minimum currently running step */
      step: number;
      how: string;
      /** currently running steps, when executing concurrently */
      steps?: number[];
    }
  /** @deprecated - contract no longer does automatic recovery */
  | { state: 'undo'; step: number; how: string }
  | { state: 'done' }
  | ({ state: 'fail' } & FlowErrors);

export type MovementDesc = {
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  /** for example: GMP fee */
  fee?: NatAmount;
  /** for example: { usdnOut: 98n } */
  detail?: Record<string, bigint>;
  claim?: boolean;
};

export type FlowStep = {
  /** Human readable description of how the step accomplishes the transfer from `src` to `dest` */
  // Distinct from `Way.how` in the contract
  how: string;
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  phases?: Record<string, any>;
  // XXX all parts: fee etc.
};

export type FundsFlowPlan = {
  flow: MovementDesc[];
  /** default to full order */
  order?: [target: number, prereqs: number[]][];
};

export type TrafficReport = {
  traffic: TrafficEntry[];
};

export type PortfolioKey = `portfolio${number}`;
export type FlowKey = `flow${number}`;

export type StatusFor = {
  contract: {
    contractAccount: CosmosChainAddress['value'];
  };
  pendingTx: PublishedTx;
  portfolios: {
    addPortfolio: PortfolioKey;
  };
  portfolio: {
    positionKeys: InstrumentId[];
    accountIdByChain: Partial<Record<SupportedChain, AccountId>>;
    accountsPending?: SupportedChain[];
    depositAddress?: Bech32Address;
    /** Noble Forwarding Address (NFA) registered by the contract for the `@agoric` address */
    nobleForwardingAddress?: Bech32Address;
    targetAllocation?: TargetAllocation;
    /** CAIP-10 account ID of the authenticated EVM account that opened this portfolio */
    sourceAccountId?: AccountId;
    /** incremented by the contract every time the user sends a transaction that the planner should respond to */
    policyVersion: number;
    /** the count of acknowledged submissions [from the planner] associated with the current policyVersion */
    rebalanceCount: number;
    /** @deprecated in favor of flowsRunning */
    flowCount: number;
    flowsRunning?: Record<FlowKey, FlowDetail>;
  };
  position: {
    protocol: YieldProtocol;
    accountId: AccountId;
    totalIn: NatAmount;
    totalOut: NatAmount;
  };
  flow: FlowStatus & FlowDetail;
  flowSteps: FlowStep[];
  flowOrder: FundsFlowPlan['order'];
};

/**
 * Names suitable for use as `publicInvitationMaker` in {@link ContractInvitationSpec}.
 */
export type PortfolioPublicInvitationMaker = 'makeOpenPortfolioInvitation';

/**
 * Names suitable for use as `invitationMakerName` in {@link ContinuingInvitationSpec}.
 *
 * These continuing invitation makers are returned from portfolio creation and enable
 * ongoing operations like rebalancing between yield protocols.
 */
export type PortfolioContinuingInvitationMaker =
  | 'Deposit'
  | 'Withdraw'
  | 'Rebalance'
  | 'SimpleRebalance';
