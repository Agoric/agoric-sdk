/**
 * @file offerArgs types / shapes - temporarily separate from type-guards.ts
 */
import { assert } from '@endo/errors';
import type { Brand } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import { AnyNatAmountShape } from '@agoric/orchestration';
import {
  WithdrawParamsShape,
  type AssetPlaceRef,
  type FundsFlowPlan,
  type FundsFlowPlanExt,
  type MovementDesc,
  type MovementDescExt,
} from '@agoric/portfolio-api';
import {
  AxelarChain,
  SupportedChain,
} from '@agoric/portfolio-api/src/constants.js';
import { M } from '@endo/patterns';
import {
  makeNatAmountShape,
  PoolPlaces,
  TargetAllocationShape,
  type TargetAllocation,
} from './type-guards.ts';

const { keys, values } = Object;

export type SeatKeyword = 'Cash' | 'Deposit';
export const seatKeywords: SeatKeyword[] = ['Cash', 'Deposit'];
harden(seatKeywords);

export const MAX_PLAN_STEPS = 30;

const AssetPlaceRefShape = M.or(
  ...seatKeywords.map(kw => `<${kw}>`),
  '+agoric',
  ...values(AxelarChain).map(c => `+${c}`),
  ...values(AxelarChain).map(c => `-${c}`),
  ...values(SupportedChain).map(c => `@${c}`),
  ...keys(PoolPlaces),
);

// XXX NEEDSTEST: check that all SupportedChains match; no `@`s etc.
export const accountRefPattern = /^@(?<chain>\w+)$/;

/**
 * Pattern to match WithdrawToChainRef like `-Arbitrum`.
 * Used to identify EVM chains that are destinations for withdrawals.
 */
export const withdrawRefPattern = /^-(?<chain>\w+)$/;

/**
 * Pattern to match DepositFromChainRef like `+Arbitrum`.
 * Used to identify EVM chains that are sources for deposits.
 * Note: `+agoric` is a special case (LocalChainAccountRef).
 */
export const depositRefPattern = /^\+(?<chain>\w+)$/;

/**
 * Extract the chain name from a DepositFromChainRef like `+Arbitrum`.
 * Returns undefined if the ref is not a deposit source or is `+agoric`.
 */
export const getDepositChainOfPlaceRef = (
  ref: AssetPlaceRef,
): AxelarChain | undefined => {
  if (ref === '+agoric') return undefined;
  const m = ref.match(depositRefPattern);
  const chain = m?.groups?.chain;
  if (!chain) return undefined;
  // validation of external data is done by AssetPlaceRefShape
  // any bad ref that reaches here is a bug
  assert(keys(AxelarChain).includes(chain), `bad ref: ${ref}`);
  return chain as AxelarChain;
};

/**
 * Extract the chain name from a WithdrawToChainRef like `-Arbitrum`.
 * Returns undefined if the ref is not a withdraw destination.
 */
export const getWithdrawChainOfPlaceRef = (
  ref: AssetPlaceRef,
): AxelarChain | undefined => {
  const m = ref.match(withdrawRefPattern);
  const chain = m?.groups?.chain;
  if (!chain) return undefined;
  // validation of external data is done by AssetPlaceRefShape
  // any bad ref that reaches here is a bug
  assert(keys(AxelarChain).includes(chain), `bad ref: ${ref}`);
  return chain as AxelarChain;
};

// XXX Possible to consolidate with {@link chainOf}?
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

/**
 * Offers no longer carry a plan (`flow`): steps come only from the planner or
 * from a delegated agent.
 *
 * Flows still accept this property only so that activations started before
 * the change replay the same way.
 */
export type LegacyOfferPlan = {
  /** @deprecated offers can no longer supply a plan */
  flow?: MovementDesc[];
};

export type OfferArgsFor = {
  deposit: Record<string, never>;
  openPortfolio: { targetAllocation?: TargetAllocation };
  rebalance: { targetAllocation?: TargetAllocation };
  transferOwnershipToEVM: {
    /** the EVM account designated as the new owner */
    evmAddress: `0x${string}`;
    /**
     * Last time the transfer can be accepted: an absolute time in seconds
     * since the Unix epoch, as measured by Agoric chain time. Must be at most
     * `MAX_YMAX_DEADLINE_OFFSET_SECONDS` into the future.
     */
    deadlineTimestampSeconds: bigint;
  };
};

/**
 * Build shapes that depend on runtime-supplied remotables such as the USDC
 * brand.
 *
 * The historical name is now a misnomer: the returned collection includes
 * reusable movement and plan shapes as well as offer-argument shapes.
 */
export const makeOfferArgsShapes = (usdcBrand: Brand<'nat'>) => {
  const amountShape = makeNatAmountShape(usdcBrand);
  const places = harden({ src: AssetPlaceRefShape, dest: AssetPlaceRefShape });
  const optionalFields = harden({
    withdraw: WithdrawParamsShape,
    fee: AnyNatAmountShape,
    detail: M.recordOf(M.string(), M.nat()),
    swap: M.splitRecord(
      {
        provider: '1inch',
        tokenIn: M.string(),
        amountIn: M.nat(),
        flags: M.nat(),
        executor: M.string(),
        srcReceiver: M.string(),
        data: M.string(),
      },
      {
        tokenOut: M.string(),
      },
    ),
    claimRewards: M.splitRecord(
      {
        tokens: M.arrayOf(M.string()),
        minAmounts: M.arrayOf(M.nat()),
      },
      {
        morpho: M.splitRecord({
          proofs: M.arrayOf(M.arrayOf(M.string())),
        }),
      },
    ),
  });
  // Structural compatibility does not establish support for a future place.
  // Known amounts and withdrawal parameters use the same checks as movements.
  const movementDescShapeExt: TypedPattern<MovementDescExt> = M.splitRecord(
    { src: M.string(), dest: M.string(), amount: amountShape },
    optionalFields,
    M.record(),
  );
  // Reuse the extensible structure while admitting only supported places.
  // Additional movement fields remain accepted at existing offer boundaries.
  const movementDescShape = M.and(
    M.splitRecord(places, {}, M.record()),
    movementDescShapeExt,
  );
  const flowShape = M.arrayOf(movementDescShape, {
    arrayLengthLimit: MAX_PLAN_STEPS,
  });
  const orderShape: TypedPattern<FundsFlowPlan['order']> = M.arrayOf(
    [
      M.number(),
      M.arrayOf(M.number(), { arrayLengthLimit: MAX_PLAN_STEPS - 1 }),
    ],
    { arrayLengthLimit: MAX_PLAN_STEPS },
  );
  const planShapeExt: TypedPattern<FundsFlowPlanExt> = M.splitRecord(
    {
      flow: M.arrayOf(movementDescShapeExt, {
        arrayLengthLimit: MAX_PLAN_STEPS,
      }),
    },
    { order: orderShape },
    M.record(),
  );

  return {
    // Offers must not carry a plan (`flow`); see LegacyOfferPlan. These are
    // closed records, so an offer that still includes one is rejected.
    deposit: M.splitRecord({}, {}, {}) as TypedPattern<OfferArgsFor['deposit']>,
    openPortfolio: M.splitRecord(
      {},
      {
        destinationEVMChain: M.or(...keys(AxelarChain)),
        targetAllocation: TargetAllocationShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['openPortfolio']>,
    rebalance: M.splitRecord(
      {},
      {
        targetAllocation: TargetAllocationShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['rebalance']>,
    transferOwnershipToEVM: M.splitRecord(
      { evmAddress: M.string(), deadlineTimestampSeconds: M.nat() },
      {},
      {},
    ) as TypedPattern<OfferArgsFor['transferOwnershipToEVM']>,
    plan: M.and(
      planShapeExt,
      // Restrict places and top-level fields without widening plan admission.
      M.splitRecord({ flow: flowShape }, { order: orderShape }, {}),
    ) as TypedPattern<FundsFlowPlan>,
    movementDescShape: movementDescShape as TypedPattern<MovementDesc>,
    movementDescShapeExt,
    planShapeExt,
  };
};
harden(makeOfferArgsShapes);

export type { AssetPlaceRef, MovementDesc };
