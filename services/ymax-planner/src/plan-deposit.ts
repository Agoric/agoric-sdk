import {
  PoolPlaces,
  type PoolKey,
  type PoolPlaceInfo,
  type StatusFor,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp/src/types.js';
import { typedEntries } from '@agoric/internal';
import { Fail, q } from '@endo/errors';
// import { TEST_NETWORK } from '@aglocal/portfolio-contract/test/network/test-network.js';
import type {
  AssetPlaceRef,
  MovementDesc,
} from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type { NetworkSpec } from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/tools/plan-solve.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import { ACCOUNT_DUST_EPSILON } from '@agoric/portfolio-api';
import type { SupportedChain } from '@agoric/portfolio-api/src/constants.js';
import { USDN, type CosmosRestClient } from './cosmos-rest-client.js';
import type { Sdk as SpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { Sdk as SpectrumPoolsSdk } from './graphql/api-spectrum-pools/__generated/sdk.ts';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';
import { getOwn } from './utils.js';

export type BalanceQueryPowers = {
  cosmosRest: CosmosRestClient;
  spectrum: SpectrumClient;
  spectrumBlockchain?: SpectrumBlockchainSdk;
  spectrumPools?: SpectrumPoolsSdk;
  spectrumChainIds: Partial<Record<SupportedChain, string>>;
  spectrumPoolIds: Partial<Record<PoolKey, string>>;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
};

const addressOfAccountId = (aid: `${string}:${string}:${string}`) =>
  aid.split(':', 3)[2];

export const getCurrentBalance = async (
  { protocol, chainName, ..._details }: PoolPlaceInfo,
  accountIdByChain: StatusFor['portfolio']['accountIdByChain'],
  { spectrum, cosmosRest }: BalanceQueryPowers,
): Promise<bigint> => {
  await null;
  switch (protocol) {
    case 'USDN': {
      const addr = addressOfAccountId(accountIdByChain[chainName] as any);
      // XXX add denom to PoolPlaceInfo?
      const resp = await cosmosRest.getAccountBalance(
        chainName,
        addr,
        USDN.base,
      );
      return BigInt(resp.amount);
    }
    case 'Aave':
    case 'Compound': {
      const pool = protocol.toLowerCase() as Pool;
      const chain = chainName.toLowerCase() as Chain;
      const addr = addressOfAccountId(accountIdByChain[chainName] as any);
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
  powers: BalanceQueryPowers,
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

export const getNonDustBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
) => {
  const currentBalances = await getCurrentBalances(status, brand, powers);
  const nonDustBalances = Object.fromEntries(
    Object.entries(currentBalances).filter(
      ([, amount]) => amount.value > ACCOUNT_DUST_EPSILON,
    ),
  );
  return nonDustBalances;
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
  allocation: TargetAllocation = {},
): Partial<Record<AssetPlaceRef, NatAmount>> => {
  const currentTotal = Object.values(current).reduce(
    (acc, amount) => acc + amount.value,
    0n,
  );
  const total = currentTotal + delta;
  total >= 0n || Fail`total after delta must not be negative`;
  const targetWeights = typedEntries(allocation as Required<typeof allocation>);
  // In the absence of target weights, maintain the relative status quo.
  const weights = targetWeights.length
    ? targetWeights
    : typedEntries(current as Required<typeof current>).map(
        ([key, amount]) => [key, amount.value] as [PoolKey, NatValue],
      );
  const sumW = weights.reduce<bigint>((acc, entry) => {
    const w = entry[1];
    (typeof w === 'bigint' && w >= 0n) ||
      Fail`allocation weight in ${entry} must be a Nat`;
    return acc + w;
  }, 0n);
  sumW > 0n || Fail`allocation weights must sum > 0`;
  const draft: Partial<Record<AssetPlaceRef, NatAmount>> = {};
  let remainder = total;
  let [maxKey, maxW] = [weights[0][0], -1n];
  for (const [key, w] of weights) {
    if (w > maxW) {
      [maxKey, maxW] = [key, w];
    }
    const v = (total * w) / sumW;
    draft[key] = AmountMath.make(brand, v);
    remainder -= v;
  }
  if (remainder !== 0n) {
    const remainderAmount = AmountMath.make(brand, remainder);
    draft[maxKey] = AmountMath.add(draft[maxKey] as NatAmount, remainderAmount);
  }
  // Zero out hubs (chains) with non-zero current balances
  for (const key of Object.keys(current)) {
    if (key.startsWith('@')) draft[key] = AmountMath.make(brand, 0n);
  }
  // Delete entries reflecting no change.
  for (const [key, amount] of Object.entries(draft)) {
    const currentAmount = current[key];
    if (currentAmount && AmountMath.isEqual(currentAmount, amount)) {
      delete draft[key];
    }
  }
  return draft;
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
  const currentWithDeposit = { ...currentBalances, '<Deposit>': amount };
  target['<Deposit>'] = AmountMath.make(brand, 0n);

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

/**
 * Plan rebalance driven by target allocation weights.
 * Computes absolute targets, then plans the corresponding flow.
 */
export const planRebalanceToAllocations = async (
  details: PlannerContext,
): Promise<MovementDesc[]> => {
  const { brand, currentBalances, targetAllocation } = details;
  if (!targetAllocation) return [];
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    0n,
    targetAllocation,
  );

  const { network, feeBrand, gasEstimator } = details;
  const flowDetail = await planRebalanceFlow({
    network,
    current: currentBalances,
    target,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.steps;
};

/**
 * Plan withdrawal driven by target allocation weights.
 * Computes absolute targets, then plans the corresponding flow.
 */
export const planWithdrawFromAllocations = async (
  details: PlannerContext & { amount: NatAmount },
): Promise<MovementDesc[]> => {
  const { amount, brand, currentBalances, targetAllocation } = details;
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    -amount.value,
    targetAllocation,
  );

  const currentCash = currentBalances['<Cash>'] || AmountMath.make(brand, 0n);
  target['<Cash>'] = AmountMath.add(currentCash, amount);

  const { network, feeBrand, gasEstimator } = details;
  const flowDetail = await planRebalanceFlow({
    network,
    current: currentBalances,
    target,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.steps;
};
