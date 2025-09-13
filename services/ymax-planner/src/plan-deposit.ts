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
import { PROD_NETWORK } from '@aglocal/portfolio-contract/src/network/network.prod.js';
import type { NetworkDefinition } from '@aglocal/portfolio-contract/src/network/types.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/src/plan-solve.js';
import type { MovementDesc } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
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
export const computeTargetsFromAllocation = (
  amount: NatAmount,
  current: Partial<Record<PoolKey, NatAmount>>,
  allocation: Record<PoolKey, number>, // weights; not optional
): Partial<Record<string, NatAmount>> => {
  const brand = amount.brand;
  const totalCurrent = Object.values(current).reduce<bigint>((acc, a) => {
    if (!a) return acc;
    assert(a.brand === brand);
    return acc + (a.value as bigint);
  }, 0n);
  const total = totalCurrent + (amount.value as bigint);
  const entries = Object.entries(allocation) as Array<
    [PoolKey, number | bigint]
  >;
  assert(entries.length > 0, X`empty allocation`);
  const SCALE_NUM = 1_000_000; // 1e6 fixed-point for weights
  const weights = entries.map(([k, w]) => {
    const wNum = Number(w as any);
    assert(Number.isFinite(wNum), X`allocation weight must be a number`);
    const wScaled = BigInt(Math.round(wNum * SCALE_NUM));
    return [k, wScaled] as const;
  });
  const sumW = weights.reduce<bigint>((acc, [, w]) => acc + w, 0n);
  assert(sumW > 0n, X`allocation weights must sum > 0`);
  // Base allocation by floor division
  const targets: Partial<Record<string, NatAmount>> = {};
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
    targets[key] = AmountMath.make(brand, v);
  }
  // Distribute remainder to the largest-weight key to hit exact total
  const remainder = total - assigned;
  if (remainder !== 0n) {
    const cur = targets[maxKey] ?? AmountMath.make(brand, 0n);
    targets[maxKey] = AmountMath.add(cur, AmountMath.make(brand, remainder));
  }
  // Any pools present in current but not in allocation -> target 0
  for (const key of Object.keys(current) as PoolKey[]) {
    if (!(key in allocation)) {
      targets[key] = AmountMath.make(brand, 0n);
    }
  }
  // Deposit seat must end at 0
  targets['<Deposit>'] = AmountMath.make(brand, 0n);
  return harden(targets);
};

/**
 * Plan deposit to absolute target balances using the LP rebalance solver.
 * Default mode is 'fastest'.
 */
export const planDepositToTargets = async (
  amount: NatAmount,
  current: Partial<Record<PoolKey, NatAmount>>,
  target: Partial<Record<string, NatAmount>>, // includes all pools + '<Deposit>'
  network: NetworkDefinition,
): Promise<MovementDesc[]> => {
  const brand = amount.brand;
  // Construct current including the deposit seat
  const currentWithDeposit: Partial<Record<string, NatAmount>> = {
    ...current,
  };
  const existing =
    currentWithDeposit['<Deposit>'] ?? AmountMath.make(brand, 0n);
  currentWithDeposit['<Deposit>'] = AmountMath.add(existing, amount);
  const { steps } = await planRebalanceFlow({
    network,
    current: currentWithDeposit as any,
    target: target as any,
    brand,
    // mode not provided -> defaults to 'fastest'
  });
  return steps;
};

/**
 * Plan deposit driven by target allocation weights.
 * Computes absolute targets, then calls the amount-based planner above.
 */
export const planDepositToAllocations = async (
  amount: NatAmount,
  current: Partial<Record<PoolKey, NatAmount>>,
  allocation: Record<PoolKey, number>,
  network: NetworkDefinition,
): Promise<MovementDesc[]> => {
  const targets = computeTargetsFromAllocation(amount, current, allocation);
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
    PROD_NETWORK,
  );
};
