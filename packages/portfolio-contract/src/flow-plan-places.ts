/**
 * @file Check that a plan's deposit and withdrawal places fit its flow.
 * @see {@link vetFlowPlanPlaces}
 */
import type { FlowDetail, FundsFlowPlan } from '@agoric/portfolio-api';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';
import { Fail, q } from '@endo/errors';
import {
  getChainNameOfPlaceRef,
  getDepositChainOfPlaceRef,
  getKeywordOfPlaceRef,
  getWithdrawChainOfPlaceRef,
  type MovementDesc,
} from './type-guards-steps.ts';
import { PoolPlaces, type PoolKey } from './type-guards.ts';

export type FlowPlanContext = {
  flowType: FlowDetail['type'];
  /** Whether the portfolio was opened from EVM (has a `sourceAccountId`) */
  isEvmPortfolio: boolean;
  /** EVM chain of the owner's deposit, for EVM deposit flows */
  fromChain?: string;
  /** EVM chain of the owner's withdrawal, for EVM withdraw flows */
  toChain?: string;
};

const checkSeatPlace = (
  { flowType, isEvmPortfolio }: FlowPlanContext,
  keyword: 'Cash' | 'Deposit',
  ref: string,
) => {
  !isEvmPortfolio || Fail`EVM portfolio has no seat for ${q(ref)}`;
  const expected = keyword === 'Cash' ? 'withdraw' : 'deposit';
  flowType === expected || Fail`${q(ref)} not allowed in ${q(flowType)} flow`;
};

const checkEvmOwnerPlace = (
  { flowType, isEvmPortfolio }: FlowPlanContext,
  expected: 'withdraw' | 'deposit',
  chain: AxelarChain,
  flowChain: string | undefined,
  ref: string,
) => {
  isEvmPortfolio || Fail`portfolio has no EVM owner for ${q(ref)}`;
  flowType === expected || Fail`${q(ref)} not allowed in ${q(flowType)} flow`;
  chain === flowChain ||
    Fail`${q(ref)} does not match flow chain ${q(flowChain)}`;
};

/**
 * Reject a step between an instrument and an account on another chain.
 *
 * A portfolio holds an instrument only through its account on the
 * instrument's chain. Execution of a step between an instrument and an
 * account uses the account's chain, but bookkeeping and mandate checks use
 * the instrument. A mismatch would therefore act on a different instrument
 * than the one vetted and recorded: `@Base -> Aave_Arbitrum` would supply to
 * Aave on Base while recording an `Aave_Arbitrum` position.
 *
 * Steps that don't pair an instrument with an account are left to other
 * checks.
 */
export const vetInstrumentAccountChain = ({
  src,
  dest,
}: Pick<MovementDesc, 'src' | 'dest'>): void => {
  for (const [instrument, account] of [
    [src, dest],
    [dest, src],
  ]) {
    if (!Object.hasOwn(PoolPlaces, instrument)) continue;
    const accountChain = getChainNameOfPlaceRef(account);
    if (!accountChain) continue;
    const { chainName } = PoolPlaces[instrument as PoolKey];
    chainName === accountChain ||
      Fail`pool ${q(instrument)} lives on ${q(chainName)}, not ${q(accountChain)}`;
  }
};
harden(vetInstrumentAccountChain);

/**
 * Reject plans whose deposit or withdrawal places don't fit the flow.
 *
 * Seat places (`<Deposit>`, `<Cash>`) and EVM owner places (`+Chain`,
 * `-Chain`) move funds into or out of a portfolio. They're only meaningful in
 * the deposit or withdraw flow that the owner requested, and only for the
 * kind of portfolio that has such a place: an EVM-originated portfolio has no
 * user seat, and a Zoe-offer portfolio has no EVM owner address.
 *
 * - `<Deposit>` (src) only in deposit flows, `<Cash>` (dest) only in withdraw
 *   flows, and only for portfolios with a user seat (not EVM-originated).
 * - `+Chain` (src) only in deposit flows from that chain, `-Chain` (dest) only
 *   in withdraw flows to that chain, and only for EVM-originated portfolios.
 * - `+agoric` is the portfolio's own deposit account, not an owner place;
 *   funds only enter it via `<Deposit>` (or external transfers), so it is
 *   unrestricted here. Revisit with #12309.
 * - A step between an instrument and an account stays on the instrument's
 *   chain ({@link vetInstrumentAccountChain}).
 *
 * TODO(#11782): this checks places only; other plan semantics remain unvetted.
 */
export const vetFlowPlanPlaces = (
  context: FlowPlanContext,
  planOrSteps: FundsFlowPlan | MovementDesc[],
): void => {
  const steps = Array.isArray(planOrSteps) ? planOrSteps : planOrSteps.flow;
  for (const { src, dest } of steps) {
    vetInstrumentAccountChain({ src, dest });
    const srcKeyword = getKeywordOfPlaceRef(src);
    if (srcKeyword) {
      srcKeyword === 'Deposit' || Fail`${q(src)} cannot be a source`;
      checkSeatPlace(context, srcKeyword, src);
    }
    const destKeyword = getKeywordOfPlaceRef(dest);
    if (destKeyword) {
      destKeyword === 'Cash' || Fail`${q(dest)} cannot be a destination`;
      checkSeatPlace(context, destKeyword, dest);
    }

    const depositChain = getDepositChainOfPlaceRef(src);
    if (depositChain) {
      checkEvmOwnerPlace(
        context,
        'deposit',
        depositChain,
        context.fromChain,
        src,
      );
    }
    const withdrawChain = getWithdrawChainOfPlaceRef(dest);
    if (withdrawChain) {
      checkEvmOwnerPlace(
        context,
        'withdraw',
        withdrawChain,
        context.toChain,
        dest,
      );
    }
  }
};
harden(vetFlowPlanPlaces);
