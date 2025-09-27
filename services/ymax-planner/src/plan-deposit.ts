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
import { Fail, q, X } from '@endo/errors';
// import { TEST_NETWORK } from '@aglocal/portfolio-contract/test/network/test-network.js';
import type {
  AssetPlaceRef,
  MovementDesc,
} from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import { PROD_NETWORK } from '@aglocal/portfolio-contract/tools/network/network.prod.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/tools/plan-solve.js';
import type { CosmosRestClient } from './cosmos-rest-client.js';
import { type GasEstimator } from './gas-estimation.ts';
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

/**
 * Compute absolute target balances from an allocation map over PoolKeys.
 * Ensures sum(target) == sum(current) + deposit; non-allocated pools target to 0.
 */
export const depositTargetsFromAllocation = (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: TargetAllocation, // integer weights (NatValue)
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const brand = amount.brand;
  // Base weighted targets for current + delta
  const targets = computeWeightedTargets(
    brand,
    current,
    amount.value,
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
 * Compute a withdraw-only flow (steps) that strictly decreases balances towards
 * the weighted rebalance target computed for a given withdraw amount and allocation.
 *
 * Properties:
 * - No pool/account balance increases are produced (only decrements).
 * - The '<Cash>' seat increases by exactly the withdrawal amount.
 * - Decrements are allocated greedily to minimize actions, draining the largest needs first.
 * - Hub accounts (keys starting with '@') are preferred and drained before pools when possible.
 */
export const withdrawStepsFromAllocation = (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: TargetAllocation,
): MovementDesc[] => {
  const brand = amount.brand;
  const withdraw = amount.value;
  if (withdraw === 0n) return harden([]);

  // Compute absolute targets for the withdraw scenario
  const targets = computeWeightedTargets(brand, current, -withdraw, allocation);

  // Build full target values map: unchanged keys default to current
  const targetVals: Partial<Record<AssetPlaceRef, NatAmount>> = { ...targets };
  for (const key of Object.keys(current)) {
    if (!targetVals[key]) targetVals[key] = current[key];
  }

  // Determine over-weight sources (those that must decrease to reach target)
  type DecEntry = { key: AssetPlaceRef; need: bigint };
  const decs: DecEntry[] = [];
  for (const key of Object.keys(targetVals)) {
    // Skip seats that should not be decreased
    if (key === '<Cash>' || key === '+agoric') continue;
    const curV: bigint = current[key]?.value ?? 0n;
    const tgtV: bigint = targetVals[key]?.value ?? 0n;
    if (tgtV < curV) {
      decs.push({ key: key as AssetPlaceRef, need: curV - tgtV });
    }
  }

  const totalNeed = decs.reduce<bigint>((acc, e) => acc + e.need, 0n);
  assert(totalNeed >= withdraw, X`not enough over-weight to satisfy withdraw`);

  // Greedy allocation: prefer non-pool (hub '@') sources first, then by need descending
  const sorted = decs.sort((a, b) => {
    const aHub = (a.key as string).startsWith('@');
    const bHub = (b.key as string).startsWith('@');
    if (aHub !== bHub) return aHub ? -1 : 1; // hubs first
    if (a.need === b.need) return 0;
    return a.need < b.need ? 1 : -1; // descending by need
  });
  let remaining = withdraw;
  const steps: MovementDesc[] = [];
  for (const { key, need } of sorted) {
    if (remaining === 0n) break;
    const take = need < remaining ? need : remaining;
    if (take > 0n) {
      steps.push({
        amount: AmountMath.make(brand, take),
        src: key,
        dest: '<Cash>',
      });
      remaining -= take;
    }
  }
  assert(remaining === 0n, X`insufficient capacity to complete withdraw`);
  return harden(steps);
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
  assert(total >= 0n, X`total after delta must not be negative`);
  const entries = Object.entries(allocation) as Array<[PoolKey, NatValue]>;
  assert(entries.length > 0, X`empty allocation`);
  const weights = entries.map(([k, w]) => {
    assert(
      typeof w === 'bigint' && w >= 0n,
      X`allocation weight must be a Nat`,
    );
    return [k, w] as const;
  });
  const sumW = weights.reduce<bigint>((acc, [, w]) => acc + w, 0n);
  assert(sumW > 0n, X`allocation weights must sum > 0`);
  const draft: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  let assigned = 0n;
  let maxKey = entries[0][0];
  let maxW = -1n as bigint;
  for (const [key, w] of weights) {
    if (w > (maxW as bigint)) {
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

/**
 * Plan deposit to absolute target balances using the LP rebalance solver.
 * Default mode is 'fastest'.
 */
export const planDepositToTargets = async (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>, // includes all pools + '+agoric'
  network: NetworkSpec,
  feeBrand: Brand<'nat'>,
  gasEstimator: GasEstimator,
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
    feeBrand,
    gasEstimator,
  });
  return steps;
};

/**
 * Plan a deposit using only monotonic increases to pool balances.
 *
 * Properties:
 * - Only creates steps from '+agoric' to Pool destinations (no decreases anywhere).
 * - Consumes exactly `amount.value` by allocating greedily to the largest needs first.
 * - Ignores non-pool destinations (e.g., '<Cash>', hubs '@...').
 * - Throws if the target does not have enough pool headroom (sum of positive deltas) to absorb the deposit amount.
 *
 * Signature is identical to planDepositToTargets for easy substitution.
 */
export const planDepositOnlyToTargets = async (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>, // includes all pools + '+agoric'
  _network: NetworkSpec,
  _feeBrand: Brand<'nat'>,
): Promise<MovementDesc[]> => {
  const brand = amount.brand;
  let remaining = amount.value;
  if (remaining === 0n) return harden([]);

  // Collect positive deltas for pool destinations only
  type Inc = { key: AssetPlaceRef; need: bigint };
  const incs: Inc[] = [];
  for (const key of Object.keys(target)) {
    // Skip non-destinations we don't increase here
    if (key === '+agoric' || key === '<Cash>' || key.startsWith('@')) continue;
    // Only treat known pools as valid destinations
    if (!getOwn(PoolPlaces, key as PoolKey)) continue;
    const curV: bigint = current[key]?.value ?? 0n;
    const tgtV: bigint = target[key]?.value ?? 0n;
    if (tgtV > curV) {
      incs.push({ key: key as AssetPlaceRef, need: tgtV - curV });
    }
  }

  const totalNeed = incs.reduce<bigint>((acc, e) => acc + e.need, 0n);
  assert(totalNeed >= remaining, X`not enough pool headroom to absorb deposit`);

  // Greedy: largest needs first to minimize actions
  incs.sort((a, b) => {
    if (a.need === b.need) return 0;
    return a.need < b.need ? 1 : -1; // descending by need
  });
  const steps: MovementDesc[] = [];
  for (const { key, need } of incs) {
    if (remaining === 0n) break;
    const take = need < remaining ? need : remaining;
    if (take > 0n) {
      steps.push({ amount: AmountMath.make(brand, take), src: '+agoric', dest: key });
      remaining -= take;
    }
  }
  assert(remaining === 0n, X`internal error: deposit not fully allocated`);
  return harden(steps);
};

/**
 * Plan deposit driven by target allocation weights.
 * Computes absolute targets, then calls the amount-based planner above.
 */
export const planDepositToAllocations = async (
  amount: NatAmount,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  allocation: TargetAllocation,
  network: NetworkSpec,
  feeBrand: Brand<'nat'>,
  gasEstimator: GasEstimator,
): Promise<MovementDesc[]> => {
  const targets = depositTargetsFromAllocation(amount, current, allocation);
  return planDepositToTargets(
    amount,
    current,
    targets,
    network,
    feeBrand,
    gasEstimator,
  );
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
  const {
    targetAllocation,
    positionKeys,
    accountIdByChain,
    policyVersion,
    rebalanceCount,
  } = status;
  if (!targetAllocation) return { policyVersion, rebalanceCount, steps: [] };
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
  const steps = await planDepositToAllocations(
    amount,
    currentBalances,
    targetAllocation,
    network,
    feeBrand,
    powers.gasEstimator,
  );
  return { policyVersion, rebalanceCount, steps };
};
