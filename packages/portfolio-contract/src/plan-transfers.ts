/* eslint-disable jsdoc/require-returns-type */

import { AmountMath } from '@agoric/ertp';
import type { Amount, Brand, NatAmount, NatValue } from '@agoric/ertp';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import { NonNullish } from '@agoric/internal';
import type {
  YieldProtocol,
  AxelarChain,
} from '@agoric/portfolio-api/src/constants.js';
import { throwRedacted as Fail } from '@endo/errors';
import { objectMap } from '@endo/patterns';
import type { MovementDesc } from './type-guards-steps.ts';
import { planRebalanceFlow } from './plan-solve.js';
import { PROD_NETWORK } from './network/network.prod.js';
/**
 * Plan deposit transfers based on the target allocation and current balances.
 *
 * @param deposit - The amount to be deposited.
 * @param currentBalances - Current balances for each position.
 * @param targetAllocation - Target allocation percentages for each position.
 * @returns Planned transfers for each position.
 * @deprecated Use the solver in `makePortfolioSteps` instead.
 */
export function planDepositTransfers(
  deposit: Amount<'nat'>,
  currentBalances: Record<string, Amount<'nat'>>,
  targetAllocation: TargetAllocation,
): Record<string, Amount<'nat'>> {
  // Validate percentages sum to 100
  const totalPct = Object.values(targetAllocation).reduce((s, p) => s + p, 0n);
  if (totalPct !== 100n)
    throw Error('Target allocation percentages must sum to 100');

  const brand = deposit.brand;
  const make = (v: bigint) => AmountMath.make(brand, v);
  const dep = deposit.value;
  if (dep === 0n) return {};

  // Sum current balances (bigint)
  let currentTotal = 0n;
  for (const amt of Object.values(currentBalances)) currentTotal += amt.value;
  const totalAfter = currentTotal + dep;

  // Compute positive needs only (skip over-target)
  const needs: Record<string, bigint> = {};
  let sumNeeds = 0n;
  for (const [k, pct] of Object.entries(targetAllocation)) {
    const targetAbs = (totalAfter * pct) / 100n;
    const cur = currentBalances[k]?.value || 0n;
    if (cur >= targetAbs) continue;
    const need = targetAbs - cur;
    if (need > 0n) {
      needs[k] = need;
      sumNeeds += need;
    }
  }
  if (sumNeeds === 0n) return {};

  // If deposit covers all needs, allocate fully; otherwise scale proportionally
  const transfers: Record<string, Amount<'nat'>> = {};
  if (sumNeeds <= dep) {
    for (const [k, need] of Object.entries(needs)) transfers[k] = make(need);
    return transfers;
  }
  for (const [k, need] of Object.entries(needs)) {
    const scaled = (need * dep) / sumNeeds; // floor scaling
    if (scaled > 0n) transfers[k] = make(scaled);
  }
  return transfers;
}

/**
 * Build deposit (give) and movement steps to achieve goal amounts per protocol.
 * Aggregates deposit at @noble then fan-outs to chain-specific pools.
 */
export const makePortfolioSteps = async <
  G extends Partial<Record<YieldProtocol, NatAmount>>,
>(
  goal: G,
  opts: {
    evm?: AxelarChain;
    feeBrand?: Brand<'nat'>;
    fees?: Record<keyof G, { Account: NatAmount; Call: NatAmount }>;
    detail?: { usdnOut: NatValue };
  } = {},
) => {
  Object.values(goal).length > 0 || Fail`empty goal`;
  const { USDN: _ignored, ...evmGoal } = goal;
  const {
    evm = 'Arbitrum',
    feeBrand,
    fees = objectMap(evmGoal, _ => ({
      Account: AmountMath.make(NonNullish(feeBrand), 150n),
      Call: AmountMath.make(NonNullish(feeBrand), 100n),
    })),
  } = opts;

  // Compute total deposit and build current/target for the solver
  const values = Object.values(goal) as NatAmount[];
  const deposit = values.reduce((acc, v) => AmountMath.add(acc, v));
  const brand = deposit.brand;

  /** Map protocol goal -> concrete PoolKey target */
  const target: Partial<Record<string, NatAmount>> = {};
  for (const [proto, amount] of Object.entries(goal) as [
    YieldProtocol,
    NatAmount,
  ][]) {
    if (proto === 'USDN') {
      // eslint-disable-next-line dot-notation
      target['USDNVault'] = amount;
    } else {
      target[`${proto}_${evm}`] = amount;
    }
  }
  // Deposit seat must end empty
  target['<Deposit>'] = AmountMath.make(brand, 0n);

  const current: Partial<Record<string, NatAmount>> = {
    '<Deposit>': deposit,
  };

  // Run the solver to compute movement steps
  const { steps: raw } = await planRebalanceFlow({
    network: PROD_NETWORK,
    current: current as any,
    target: target as any,
    brand,
    mode: 'cheapest',
  });

  // Inject USDN detail and EVM fees to match existing behavior/tests
  const steps: MovementDesc[] = raw.map(s => ({ ...s }));

  // USDN detail: 99% min-out of requested USDN
  const usdnAmt = (goal as any).USDN as NatAmount | undefined;
  if (usdnAmt) {
    const usdnDetail = { usdnOut: ((usdnAmt.value || 0n) * 99n) / 100n } as {
      usdnOut: NatValue;
    };
    for (const s of steps) {
      if (s.src === '@noble' && s.dest === 'USDNVault') {
        (s as any).detail = usdnDetail;
      }
    }
  }

  // Add fees on noble->EVM (Account) and EVM->Pool (Call)
  const feeMap = fees as Record<
    string,
    { Account: NatAmount; Call: NatAmount }
  >;
  for (let i = 0; i < steps.length - 1; i += 1) {
    const a = steps[i];
    const b = steps[i + 1];
    if (
      a.src === '@noble' &&
      typeof a.dest === 'string' &&
      a.dest.startsWith('@')
    ) {
      const hub = a.dest; // e.g., '@Arbitrum'
      if (b.src === hub && typeof b.dest === 'string') {
        const m = /^(Aave|Compound)_(.+)$/.exec(b.dest);
        if (m) {
          const proto = m[1] as keyof typeof feeMap;
          const ff = feeMap[proto as string];
          if (ff) {
            (a as any).fee = ff.Account;
            (b as any).fee = ff.Call;
          }
        }
      }
    }
  }

  // Build give with optional aggregated GMP fees (if any)
  const feeValues = Object.values(feeMap ?? {}) as {
    Account: NatAmount;
    Call: NatAmount;
  }[];
  const gmpFee = feeValues.length
    ? feeValues
        .map(f => [f.Account, f.Call])
        .flat()
        .reduce((acc, v) => AmountMath.add(acc, v))
    : undefined;
  const give = {
    Deposit: deposit,
    ...(gmpFee ? { GmpFee: gmpFee } : {}),
  } as Record<string, Amount<'nat'>>;

  return harden({ give, steps });
};
