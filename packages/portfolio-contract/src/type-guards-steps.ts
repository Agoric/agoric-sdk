/**
 * @file offerArgs types / shapes - temporarily separate from type-guards.ts
 */
import type { Brand, NatAmount, NatValue } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import { AnyNatAmountShape } from '@agoric/orchestration';
import { M } from '@endo/patterns';
import {
  AxelarChain,
  SupportedChain,
} from '@agoric/portfolio-api/src/constants.js';
import {
  makeNatAmountShape,
  PoolPlaces,
  TargetAllocationShape,
  type PoolKey,
  type TargetAllocation,
} from './type-guards.ts';

const { keys, values } = Object;

export type SeatKeyword = 'Cash' | 'Deposit';
export const seatKeywords: SeatKeyword[] = ['Cash', 'Deposit'];
harden(seatKeywords);

export type AssetPlaceRef =
  | `<${SeatKeyword}>`
  | '+agoric' // deposit LCA
  | `@${SupportedChain}`
  | PoolKey;
const AssetPlaceRefShape = M.or(
  ...seatKeywords.map(kw => `<${kw}>`),
  '+agoric',
  ...values(SupportedChain).map(c => `@${c}`),
  ...keys(PoolPlaces),
);

// XXX NEEDSTEST: check that all SupportedChains match; no `@`s etc.
export const accountRefPattern = /^@(?<chain>\w+)$/;

export const getChainNameOfPlaceRef = (
  ref: AssetPlaceRef,
): SupportedChain | undefined => {
  const m = ref.match(accountRefPattern);
  const chain = m?.groups?.chain;
  if (!chain) return undefined;
  // validation of external data is done by AssetPlaceRefShape
  // any bad ref that reaches here is a bug
  assert(keys(SupportedChain).includes(chain), `bad ref: ${ref}`);
  return chain as SupportedChain;
};

// XXX NEEDSTEST: check that all SupportedChains match; no `@`s etc.
export const seatRefPattern = /^<(?<keyword>\w+)>$/;

export const getKeywordOfPlaceRef = (
  ref: AssetPlaceRef,
): SeatKeyword | undefined => {
  const m = ref.match(seatRefPattern);
  const keyword = m?.groups?.keyword;
  if (!keyword) return undefined;
  // validation of external data is done by AssetPlaceRefShape
  // any bad ref that reaches here is a bug
  assert((seatKeywords as string[]).includes(keyword), `bad ref: ${ref}`);
  return keyword as SeatKeyword;
};

export type MovementDesc = {
  amount: NatAmount;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  /** for example: GMP fee */
  fee?: NatAmount;
  /** for example: { usdnOut: 98n } */
  detail?: Record<string, NatValue>;
  claim?: boolean;
};

// XXX strategy: AllocationStrategyInfo;
export type OfferArgsFor = {
  openPortfolio: { flow?: MovementDesc[]; targetAllocation?: TargetAllocation };
  rebalance: { flow?: MovementDesc[]; targetAllocation?: TargetAllocation };
};

export const makeOfferArgsShapes = (usdcBrand: Brand<'nat'>) => {
  const usdcAmountShape = makeNatAmountShape(usdcBrand, 1n);
  const movementDescShape = M.splitRecord(
    {
      amount: usdcAmountShape,
      src: AssetPlaceRefShape,
      dest: AssetPlaceRefShape,
    },
    {
      fee: AnyNatAmountShape,
      detail: M.recordOf(M.string(), M.nat()),
      claim: M.boolean(),
    },
    {},
  );

  return {
    openPortfolio: M.splitRecord(
      {},
      {
        flow: M.arrayOf(movementDescShape, { arrayLengthLimit: 12 }),
        destinationEVMChain: M.or(...keys(AxelarChain)),
        targetAllocation: TargetAllocationShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['openPortfolio']>,
    rebalance: M.splitRecord(
      {},
      {
        flow: M.arrayOf(movementDescShape),
        targetAllocation: TargetAllocationShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['rebalance']>,
    movementDescShape: movementDescShape as TypedPattern<MovementDesc>,
  };
};
harden(makeOfferArgsShapes);
