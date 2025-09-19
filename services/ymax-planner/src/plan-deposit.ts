import {
  PoolPlaces,
  type PoolKey,
  type PoolPlaceInfo,
  type StatusFor,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount } from '@agoric/ertp/src/types.js';
import { Fail, q, X } from '@endo/errors';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
// import { TEST_NETWORK } from '@aglocal/portfolio-contract/test/network/test-network.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/src/network/network.prod.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/src/plan-solve.js';
import type {
  AssetPlaceRef,
  MovementDesc,
} from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/src/network/network-spec.js';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';
import type { CosmosRestClient } from './cosmos-rest-client.js';

const getOwn = <O, K extends PropertyKey>(
  obj: O,
  key: K,
): K extends keyof O ? O[K] : undefined =>
  // @ts-expect-error TS doesn't let `hasOwn(obj, key)` support `obj[key]`.
  Object.hasOwn(obj, key) ? obj[key] : undefined;

const addressOfAccountId = (aid: `${string}:${string}:${string}`) =>
  aid.split(':', 3)[2];

export const getCurrentBalance = async (
  { protocol, chainName, ..._details }: PoolPlaceInfo,
  accountIdByChain: StatusFor['portfolio']['accountIdByChain'],
  {
    spectrum,
    cosmosRest,
  }: { spectrum: SpectrumClient; cosmosRest: CosmosRestClient },
): Promise<bigint> => {
  await null;
  switch (protocol) {
    case 'USDN': {
      const addr = addressOfAccountId(accountIdByChain[chainName]);
      // XXX add denom to PoolPlaceInfo?
      const resp = await cosmosRest.getAccountBalance(chainName, addr, 'usdn');
      return BigInt(resp.amount);
    }
    case 'Aave':
    case 'Compound': {
      const pool = protocol.toLowerCase() as Pool;
      const chain = chainName.toLowerCase() as Chain;
      const addr = addressOfAccountId(accountIdByChain[chainName]);
      const resp = await spectrum.getPoolBalance(chain, pool, addr);
      const balance = resp.balance.supplyBalance;
      Number.isSafeInteger(balance) ||
        Fail`Invalid balance for chain ${q(chain)} pool ${q(pool)} address ${addr}: ${balance}`;
      return BigInt(balance);
    }
    default:
      // TODO: Beefy
      throw Fail`Unknown protocol: ${q(protocol)}`;
  }
};

/**
 * Compute absolute target balances from an allocation map over PoolKeys.
 * Ensures sum(target) == sum(current) + deposit; non-allocated pools target to 0.
 */
export const depositTargetsFromAllocation = (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: Record<PoolKey, number>, // weights; not optional
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const brand = amount.brand;
  // Base weighted targets for current + delta
  const targets = computeWeightedTargets(
    brand,
    current,
    amount.value as bigint,
    allocation,
  );

  // Staging account ('+agoric') must end at 0: all staged funds should be fanned out
  // to destination accounts/pools as part of this deposit plan.
  targets['+agoric'] = AmountMath.make(brand, 0n);
  return harden(targets);
};

/**
 * Compute absolute target balances for a withdraw operation driven by allocation weights.
 * Reduces balances across selected pools per weights and increases '<Cash>' by the withdraw amount.
 * Pools not in the allocation remain unchanged. Throws if selected pools do not cover the withdrawal.
 */
export const withdrawTargetsFromAllocation = (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: Record<PoolKey, number>,
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const brand = amount.brand;
  const withdraw = amount.value;
  const targets = computeWeightedTargets(brand, current, -withdraw, allocation);
  const currentCash = current['<Cash>']?.value ?? 0n;
  targets['<Cash>'] = AmountMath.make(brand, currentCash + withdraw);
  return harden(targets);
};

/**
 * Derive weighted targets for allocation keys. Additionally, always zero out hub balances
 * (chains; keys starting with '@') that have non-zero current amounts. Returns only entries
 * whose values change compared to current.
 */
const computeWeightedTargets = (
  brand: Brand<'nat'>,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  delta: bigint,
  allocation: Record<PoolKey, number>,
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const totalCurrentAmt = Object.keys(current).reduce(
    (acc, k) => (allocation[k] ? AmountMath.add(acc, current[k]) : acc),
    AmountMath.makeEmpty(brand),
  );
  const total = totalCurrentAmt.value + delta;
  assert(total >= 0n, X`total after delta must not be negative`);
  const entries = Object.entries(allocation) as Array<
    [PoolKey, number | bigint]
  >;
  assert(entries.length > 0, X`empty allocation`);
  const SCALE_NUM = 1_000_000;
  const weights = entries.map(([k, w]) => {
    const wNum = Number(w as any);
    assert(Number.isFinite(wNum), X`allocation weight must be a number`);
    const wScaled = BigInt(Math.round(wNum * SCALE_NUM));
    return [k, wScaled] as const;
  });
  const sumW = weights.reduce<bigint>((acc, [, w]) => acc + w, 0n);
  assert(sumW > 0n, X`allocation weights must sum > 0`);
  const draft: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  let assigned = 0n;
  let maxKey = entries[0][0];
  let maxW = -1n as unknown as bigint;
  for (const [key, w] of weights) {
    if (w > (maxW as bigint)) {
      maxW = w as bigint;
      maxKey = key;
    }
    const v = (total * (w as bigint)) / (sumW as bigint);
    assigned += v;
    draft[key] = AmountMath.make(brand, v);
  }
  const remainder = total - assigned;
  if (remainder !== 0n) {
    const cur = draft[maxKey] ?? AmountMath.make(brand, 0n);
    draft[maxKey] = AmountMath.add(cur, AmountMath.make(brand, remainder));
  }
  const targets: Partial<Record<AssetPlaceRef, NatAmount>> = { ...draft };
  // Zero hubs (chains) with non-zero current balances
  for (const key of Object.keys(current)) {
    if (key.startsWith('@')) {
      const curAmt = current[key];
      if (curAmt && curAmt.value !== 0n) {
        targets[key] = AmountMath.make(brand, 0n);
      }
    }
  }
  for (const key of Object.keys(targets)) {
    const curV = current[key]?.value ?? 0n;
    const nextV = targets[key]!.value;
    if (curV === nextV) delete targets[key];
  }
  return targets;
};

/**
 * Plan deposit to absolute target balances using the LP rebalance solver.
 * Default mode is 'fastest'.
 */
export const planDepositToTargets = async (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>, // includes all pools + '+agoric'
  network: NetworkSpec,
): Promise<MovementDesc[]> => {
  const brand = amount.brand;
  // Construct current including the deposit seat
  const currentWithDeposit: Partial<Record<string, NatAmount>> = {
    ...current,
  };
  // NOTE It is important that the only '+agoric' amount that it is allowed to
  // include in the solution is the amount provided in this deposit operation.
  // The actual balance on '+agoric' may include assets for another operation
  // in progress.
  const existing = currentWithDeposit['+agoric'] ?? AmountMath.make(brand, 0n);
  currentWithDeposit['+agoric'] = AmountMath.add(existing, amount);
  // console.log('COMPLETE GRAPH', currentWithDeposit, target, network);
  const { steps } = await planRebalanceFlow({
    network,
    current: currentWithDeposit as any,
    target: target as any,
    brand,
  });
  return steps;
};

/**
 * Plan deposit driven by target allocation weights.
 * Computes absolute targets, then calls the amount-based planner above.
 */
export const planDepositToAllocations = async (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: Record<PoolKey, number>,
  network: NetworkSpec,
): Promise<MovementDesc[]> => {
  const targets = depositTargetsFromAllocation(amount, current, allocation);
  return planDepositToTargets(amount, current, targets, network);
};

// Back-compat utility used by CLI or handlers
export const handleDeposit = async (
  portfolioKey: `${string}.portfolios.portfolio${number}`,
  amount: NatAmount,
  feeBrand: Brand<'nat'>,
  powers: {
    readPublished: VstorageKit['readPublished'];
    spectrum: SpectrumClient;
    cosmosRest: CosmosRestClient;
  },
  network: NetworkSpec = PROD_NETWORK,
) => {
  const querier = makePortfolioQuery(powers.readPublished, portfolioKey);
  const status = await querier.getPortfolioStatus();
  const { targetAllocation, positionKeys, accountIdByChain } = status;
  if (!targetAllocation) return [];
  const errors = [] as Error[];
  const balanceEntries = await Promise.all(
    positionKeys.map(async (posKey: PoolKey): Promise<[PoolKey, NatAmount]> => {
      await null;
      try {
        const poolPlaceInfo =
          getOwn(PoolPlaces, posKey) || Fail`Unknown PoolPlace`;
        // TODO there should be a bulk query operation available now
        const amountValue = await getCurrentBalance(
          poolPlaceInfo,
          accountIdByChain,
          powers,
        );
        return [posKey, AmountMath.make(amount.brand, amountValue)];
      } catch (cause) {
        errors.push(Error(`Could not get ${posKey} balance`, { cause }));
        // @ts-expect-error
        return [posKey, undefined];
      }
    }),
  );
  if (errors.length) {
    throw AggregateError(errors, 'Could not get balances');
  }
  const currentBalances = Object.fromEntries(balanceEntries);
  // Use PROD network by default; callers may wish to parameterize later
  return planDepositToAllocations(
    amount,
    currentBalances,
    targetAllocation as any,
    network,
  );
};
