import {
  PoolPlaces,
  type PoolKey,
  type PoolPlaceInfo,
  type StatusFor,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { makePortfolioQuery } from '@aglocal/portfolio-contract/tools/portfolio-actors.js';
import type { VstorageKit } from '@agoric/client-utils';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp/src/types.js';
import { Fail, q } from '@endo/errors';
// import { TEST_NETWORK } from '@aglocal/portfolio-contract/test/network/test-network.js';
import type {
  AssetPlaceRef,
  MovementDesc,
} from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/tools/network/network.prod.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/tools/plan-solve.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import type { CosmosRestClient } from './cosmos-rest-client.js';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';

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

export const getCurrentBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: {
    spectrum: SpectrumClient;
    cosmosRest: CosmosRestClient;
  },
) => {
  const { positionKeys, accountIdByChain } = status;
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
        return [posKey, AmountMath.make(brand, amountValue)];
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
  return currentBalances;
};

/**
 * Compute absolute target balances for a withdraw operation driven by allocation weights.
 * Reduces balances across selected pools per weights and increases '<Cash>' by the withdraw amount.
 * Pools not in the allocation remain unchanged. Throws if selected pools do not cover the withdrawal.
 */
export const withdrawTargetsFromAllocation = (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: TargetAllocation,
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
  allocation: TargetAllocation,
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const totalCurrentAmt = Object.keys(current).reduce(
    (acc, k) => (allocation[k] ? AmountMath.add(acc, current[k]) : acc),
    AmountMath.makeEmpty(brand),
  );
  const total = totalCurrentAmt.value + delta;
  total >= 0n || Fail`total after delta must not be negative`;
  const weights = Object.entries(allocation) as Array<[PoolKey, NatValue]>;
  weights.length > 0 || Fail`empty allocation`;
  for (const entry of weights) {
    const w = entry[1];
    (typeof w === 'bigint' && w > 0n) ||
      Fail`allocation weight in ${entry} must be a Nat`;
  }
  const sumW = weights.reduce<bigint>((acc, [, w]) => acc + w, 0n);
  sumW > 0n || Fail`allocation weights must sum > 0`;
  const draft: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  let assigned = 0n;
  let maxKey = weights[0][0];
  let maxW = -1n;
  for (const [key, w] of weights) {
    if (w > maxW) {
      maxW = w;
      maxKey = key;
    }
    const v = (total * w) / sumW;
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

type PlannerContext = {
  currentBalances: Partial<Record<AssetPlaceRef, NatAmount>>;
  targetAllocation?: TargetAllocation;
  network: NetworkSpec;
  brand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  gasEstimator: GasEstimator;
};

/**
 * Plan deposit driven by target allocation weights.
 * Computes absolute targets, then plans the corresponding flow.
 */
export const planDepositToAllocations = async (
  details: PlannerContext & { amount: NatAmount },
): Promise<MovementDesc[]> => {
  const { amount, brand, currentBalances, targetAllocation } = details;
  if (!targetAllocation) return [];
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    amount.value,
    targetAllocation,
  );

  // The deposit should be distributed.
  const currentWithDeposit = { ...currentBalances, '+agoric': amount };
  target['+agoric'] = AmountMath.make(brand, 0n);

  const { network, feeBrand, gasEstimator } = details;
  const flowDetail = await planRebalanceFlow({
    network,
    current: currentWithDeposit,
    target,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.steps;
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
    gasEstimator: GasEstimator;
  },
  network: NetworkSpec = PROD_NETWORK,
) => {
  const querier = makePortfolioQuery(powers.readPublished, portfolioKey);
  const status = await querier.getPortfolioStatus();
  const { policyVersion, rebalanceCount, targetAllocation } = status;
  if (!targetAllocation) return { policyVersion, rebalanceCount, steps: [] };
  const currentBalances = await getCurrentBalances(
    status,
    amount.brand,
    powers,
  );
  const steps = await planDepositToAllocations({
    amount,
    brand: amount.brand,
    currentBalances,
    targetAllocation,
    network,
    feeBrand,
    gasEstimator: powers.gasEstimator,
  });
  return { policyVersion, rebalanceCount, steps };
};
