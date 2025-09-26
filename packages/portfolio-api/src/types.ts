import type { NatAmount } from '@agoric/ertp';
import type { SupportedChain } from './constants.js';
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

export type FlowSteps = {
  how: string;
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
}[];

export type FlowKey = `flow${number}`;
