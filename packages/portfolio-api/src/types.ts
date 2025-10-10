import type { NatAmount } from '@agoric/ertp';
import {
  type AccountId,
  type Bech32Address,
  type CosmosChainAddress,
} from '@agoric/orchestration';
import type { SupportedChain, YieldProtocol } from './constants.js';
import type { InstrumentId } from './instruments.js';

export type SeatKeyword = 'Cash' | 'Deposit';

export type AssetPlaceRef =
  | `<${SeatKeyword}>`
  | '+agoric' // deposit LCA
  | `@${SupportedChain}`
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
  | { type: 'withdraw'; amount: NatAmount }
  | { type: 'deposit'; amount: NatAmount }
  | { type: 'rebalance' }; // aka simpleRebalance

export type FlowStatus =
  | { state: 'run'; step: number; how: string }
  | { state: 'undo'; step: number; how: string }
  | { state: 'done' }
  | { state: 'fail'; step: number; how: string; error: string; where?: string };

export type FlowStep = {
  how: string;
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
};

export type PortfolioKey = `portfolio${number}`;
export type FlowKey = `flow${number}`;

export type StatusFor = {
  contract: {
    contractAccount: CosmosChainAddress['value'];
  };
  portfolios: {
    addPortfolio: PortfolioKey;
  };
  portfolio: {
    positionKeys: InstrumentId[];
    accountIdByChain: Partial<Record<SupportedChain, AccountId>>;
    accountsPending?: SupportedChain[];
    depositAddress?: Bech32Address;
    targetAllocation?: TargetAllocation;
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
    netTransfers: NatAmount;
    totalIn: NatAmount;
    totalOut: NatAmount;
  };
  flow: FlowStatus;
  flowSteps: FlowStep[];
};
