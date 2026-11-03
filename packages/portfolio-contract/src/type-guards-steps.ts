/**
 * @file offerArgs types / shapes - temporarily separate from type-guards.ts
 */
import { assert } from '@endo/errors';
import type { Brand } from '@agoric/ertp';
import type { TypedPattern } from '@agoric/internal';
import { AnyNatAmountShape } from '@agoric/orchestration';
import type {
  AssetPlaceRef,
  FundsFlowPlan,
  FundsFlowPlanExt,
  MovementDesc,
  MovementDescExt,
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

export type OfferArgsFor = {
  deposit: { flow?: MovementDesc[] };
  openPortfolio: { flow?: MovementDesc[]; targetAllocation?: TargetAllocation };
  rebalance: { flow?: MovementDesc[]; targetAllocation?: TargetAllocation };
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
  // Exclude the competing field by name while retaining unknown extensions.
  // This avoids whole-record M.or/absence checks on numeric movement traffic.
  const movementDescShape: TypedPattern<MovementDesc> = M.splitRecord(
    { ...places, amount: amountShape },
    optionalFields,
    M.recordOf(M.neq('op'), M.any()),
  );
  const withdrawAllMovementDescShape: TypedPattern<
    MovementDesc<'withdrawAll'>
  > = M.splitRecord(
    { ...places, op: 'withdrawAll' },
    optionalFields,
    M.recordOf(M.neq('amount'), M.any()),
  );
  // Structural input only: both fields, neither field, and future operations
  // remain representable until a decoder checks their semantics.
  const movementDescShapeExt: TypedPattern<MovementDescExt> = M.splitRecord(
    { src: M.string(), dest: M.string() },
    { ...optionalFields, amount: amountShape, op: M.string() },
    M.record(),
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
    deposit: M.splitRecord(
      {},
      {
        flow: flowShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['deposit']>,
    openPortfolio: M.splitRecord(
      {},
      {
        flow: flowShape,
        destinationEVMChain: M.or(...keys(AxelarChain)),
        targetAllocation: TargetAllocationShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['openPortfolio']>,
    rebalance: M.splitRecord(
      {},
      {
        flow: flowShape,
        targetAllocation: TargetAllocationShape,
      },
      {},
    ) as TypedPattern<OfferArgsFor['rebalance']>,
    transferOwnershipToEVM: M.splitRecord(
      { evmAddress: M.string(), deadlineTimestampSeconds: M.nat() },
      {},
      {},
    ) as TypedPattern<OfferArgsFor['transferOwnershipToEVM']>,
    // TODO(AGO-1614): Admit withdrawAll through operation-aware validation once
    // execution receives verified shares and supports full-exit operations.
    // This public execution boundary remains numeric-only until then.
    plan: M.splitRecord(
      { flow: flowShape },
      { order: orderShape },
      {},
    ) as TypedPattern<FundsFlowPlan>,
    movementDescShape,
    withdrawAllMovementDescShape,
    movementDescShapeExt,
    planShapeExt,
  };
};
harden(makeOfferArgsShapes);

export type { AssetPlaceRef, MovementDesc };
