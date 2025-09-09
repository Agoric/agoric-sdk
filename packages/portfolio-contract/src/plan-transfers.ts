/* eslint-disable jsdoc/require-returns-type */

import { AmountMath } from '@agoric/ertp';
import type { Amount, Brand, NatAmount, NatValue } from '@agoric/ertp';
import type { TargetAllocation } from '@aglocal/portfolio-contract/src/type-guards.js';
import type { PoolKey } from '@aglocal/portfolio-contract/src/type-guards';
import { PoolPlaces } from '@aglocal/portfolio-contract/src/type-guards.js';
import type { MovementDesc } from './type-guards-steps.ts';
import { NonNullish } from '@agoric/internal';
import type {
  YieldProtocol,
  AxelarChain,
} from '@agoric/portfolio-api/src/constants.js';
import { throwRedacted as Fail } from '@endo/errors';
import { objectMap } from '@endo/patterns';
/**
 * Plan deposit transfers based on the target allocation and current balances.
 *
 * @param deposit - The amount to be deposited.
 * @param currentBalances - Current balances for each position.
 * @param targetAllocation - Target allocation percentages for each position.
 * @returns Planned transfers for each position.
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
 * Plan a transfer from the (implicit) @noble hub out to a destination pool.
 * Assumes assets already at @noble unless a preface path is supplied.
 */
export const planTransfer = (
  dest: PoolKey,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
  preface: MovementDesc[] = [],
): MovementDesc[] => {
  const { protocol: p, chainName: evm } = PoolPlaces[dest];
  const steps: MovementDesc[] = [];
  switch (p) {
    case 'USDN': {
      const detail = { usdnOut: ((amount.value || 0n) * 99n) / 100n };
      // TODO: fetch current exchange rate instead of 99%
      steps.push({ src: '@noble', dest: 'USDNVault', amount, detail });
      break;
    }
    case 'Aave':
    case 'Compound':
      // XXX optimize: combine noble->evm steps
      steps.push({
        src: '@noble',
        dest: `@${evm}`,
        amount,
        // TODO: Rather than hard-code, derive from Axelar `estimateGasFee`.
        // https://docs.axelar.dev/dev/axelarjs-sdk/axelar-query-api#estimategasfee
        fee: AmountMath.make(feeBrand, 15_000_000n),
      });
      console.warn('TODO: fees');
      steps.push({
        src: `@${evm}`,
        dest: `${p}_${evm}`,
        amount,
        fee: AmountMath.make(feeBrand, 15_000_000n), // KLUDGE.
      });
      break;
    default:
      throw Error('unreachable');
  }
  return harden([...preface, ...steps]);
};

/**
 * Construct a path moving assets from one pool to another via the @noble hub.
 * If src === dest returns an empty array.
 */
export const planTransferPath = (
  src: PoolKey,
  dest: PoolKey,
  amount: NatAmount,
): MovementDesc[] => {
  // if the assets are already there, an empty path is in order
  if (src === dest) {
    return harden([]);
  }

  // kludge: get a separte brand
  const feeBrand = AmountMath.getBrand(amount);
  const tail = planTransfer(dest, amount, feeBrand);
  const { protocol: p, chainName: evm } = PoolPlaces[src];
  const steps: MovementDesc[] = [];
  switch (p) {
    case 'USDN':
      steps.push({ src: 'USDNVault', dest: '@noble', amount });
      break;
    case 'Aave':
    case 'Compound':
      steps.push({ src: `${p}_${evm}`, dest: `@${evm}`, amount });
      steps.push({ src: `@${evm}`, dest: '@noble', amount });
      break;
    default:
      throw Error('unreachable');
  }
  return harden([...steps, ...tail]);
};

/**
 * Build deposit (give) and movement steps to achieve goal amounts per protocol.
 * Aggregates deposit at @noble then fan-outs to chain-specific pools.
 */
export const makePortfolioSteps = <
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
    detail = 'USDN' in goal
      ? { usdnOut: ((goal.USDN?.value || 0n) * 99n) / 100n }
      : undefined,
  } = opts;

  const steps: MovementDesc[] = [];
  const values = Object.values(goal) as NatAmount[];
  const deposit = values.reduce((acc, v) => AmountMath.add(acc, v));
  const feeValues = Object.values(fees) as {
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
  steps.push({ src: '<Deposit>', dest: '@agoric', amount: deposit });
  steps.push({ src: '@agoric', dest: '@noble', amount: deposit });
  for (const [proto, amount] of Object.entries(goal) as [
    YieldProtocol,
    NatAmount,
  ][]) {
    switch (proto) {
      case 'USDN':
        steps.push({ src: '@noble', dest: 'USDNVault', amount, detail });
        break;
      case 'Aave':
      case 'Compound':
        steps.push({
          src: '@noble',
          dest: `@${evm}`,
          amount,
          fee: fees[proto].Account,
        });
        steps.push({
          src: `@${evm}`,
          dest: `${proto}_${evm}`,
          amount,
          fee: fees[proto].Call,
        });
        break;
      default:
        throw Error('unreachable');
    }
  }
  return harden({ give, steps });
};
