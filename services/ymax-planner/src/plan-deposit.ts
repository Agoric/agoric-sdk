import {
  PoolPlaces,
  type PoolKey,
  type PoolPlaceInfo,
  type StatusFor,
  type TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp/src/types.js';
import {
  fromTypedEntries,
  objectMap,
  objectMetaMap,
  typedEntries,
} from '@agoric/internal';
import type { AccountId, Caip10Record } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
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
import type { ChainAddressTokenBalance } from './graphql/api-spectrum-blockchain/__generated/graphql.ts';
import type { Sdk as SpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { ProtocolPoolUserBalanceResult } from './graphql/api-spectrum-pools/__generated/graphql.ts';
import type { Sdk as SpectrumPoolsSdk } from './graphql/api-spectrum-pools/__generated/sdk.ts';
import type { Chain, Pool, SpectrumClient } from './spectrum-client.js';
import { spectrumProtocols } from './support.ts';
import { getOwn, lookupValueForKey } from './utils.js';

const scale6 = (x: number) => {
  assert.typeof(x, 'number');
  return BigInt(Math.round(x * 1e6));
};

// Note the differences in the shape of field `balance` between the two Spectrum
// APIs (string vs. Record<'USDC' | 'USD' | string, number>).
type AccountBalance = ChainAddressTokenBalance['balance'];
const amountFromAccountBalance = (
  brand: Brand<'nat'>,
  balance: AccountBalance,
) =>
  balance === undefined
    ? undefined
    : AmountMath.make(brand, scale6(Number(balance)));
type PositionBalance = ProtocolPoolUserBalanceResult['balance'];
const amountFromPositionBalance = (
  brand: Brand<'nat'>,
  balanceRecord: PositionBalance,
) =>
  balanceRecord?.USDC === undefined
    ? undefined
    : AmountMath.make(brand, scale6(balanceRecord.USDC));

export type BalanceQueryPowers = {
  cosmosRest: CosmosRestClient;
  spectrum: SpectrumClient;
  spectrumBlockchain?: SpectrumBlockchainSdk;
  spectrumPools?: SpectrumPoolsSdk;
  spectrumChainIds: Partial<Record<SupportedChain, string>>;
  spectrumPoolIds: Partial<Record<PoolKey, string>>;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
};

// UNTIL https://github.com/Agoric/agoric-sdk/issues/12186
// This should move into @agoric/orchestration/src/utils/address.js, which
// itself should be updated to conform with CAIP-10.
// cf. https://github.com/Agoric/agoric-sdk/pull/12185/commits/34667cf25cb11a90d348f72750af6e50d632a22d
const addressOfAccountId = (caip10AccountId: AccountId) =>
  parseAccountId(caip10AccountId).accountAddress;

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

type AccountQueryDescriptor = {
  place: AssetPlaceRef;
  chainName: SupportedChain;
  address: string;
  asset: string;
};

type PositionQueryDescriptor = {
  place: PoolKey;
  chainName: SupportedChain;
  protocol: PoolPlaceInfo['protocol'];
  address: string;
};

const makeSpectrumAccountQuery = (
  desc: AccountQueryDescriptor,
  powers: BalanceQueryPowers,
) => {
  const { chainName, address, asset } = desc;
  const chainId = lookupValueForKey(powers.spectrumChainIds, chainName);
  if (asset !== 'USDC') {
    // "USDN" -> "usdn"
    return { chain: chainId, address, token: asset.toLowerCase() };
  }
  const token = lookupValueForKey(powers.usdcTokensByChain, chainName);
  return { chain: chainId, address, token };
};

const makeSpectrumPoolQuery = (
  desc: PositionQueryDescriptor,
  powers: BalanceQueryPowers,
) => {
  const { place, chainName, protocol, address } = desc;
  return {
    chain: lookupValueForKey(powers.spectrumChainIds, chainName),
    protocol: lookupValueForKey(spectrumProtocols, protocol),
    pool: lookupValueForKey(powers.spectrumPoolIds, place),
    address,
  };
};

export const getCurrentBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Partial<Record<AssetPlaceRef, NatAmount | undefined>>> => {
  const { positionKeys, accountIdByChain } = status;
  const { spectrumBlockchain, spectrumPools } = powers;
  const addressInfo = new Map<SupportedChain, Caip10Record>();
  const accountQueries = [] as AccountQueryDescriptor[];
  const positionQueries = [] as PositionQueryDescriptor[];
  const balances = new Map<AssetPlaceRef, NatAmount | undefined>();
  const errors = [] as Error[];
  for (const [chainName, accountId] of typedEntries(
    accountIdByChain as Required<typeof accountIdByChain>,
  )) {
    const place = `@${chainName}` as AssetPlaceRef;
    balances.set(place, undefined);
    try {
      const addressParts = parseAccountId(accountId);
      addressInfo.set(chainName, addressParts);
      const { accountAddress: address } = addressParts;
      accountQueries.push({ place, chainName, address, asset: 'USDC' });
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_err) {
      errors.push(Error(`Invalid CAIP-10 address for chain: ${chainName}`));
    }
  }
  for (const instrument of positionKeys) {
    const place = instrument;
    balances.set(place, undefined);
    try {
      const poolPlaceInfo =
        getOwn(PoolPlaces, instrument) ||
        Fail`Unknown instrument: ${instrument}`;
      const { chainName, protocol } = poolPlaceInfo;
      const { namespace, accountAddress: address } =
        addressInfo.get(chainName) ||
        Fail`No ${chainName} address for instrument ${instrument}`;
      if (namespace !== 'eip155') {
        // USDN Vaults are not "pools" and specifically are not in the Spectrum
        // Pools API.
        accountQueries.push({ place, chainName, address, asset: protocol });
        continue;
      }
      positionQueries.push({ place, chainName, protocol, address });
    } catch (err) {
      errors.push(err);
    }
  }
  await null;
  if (spectrumBlockchain && spectrumPools) {
    const spectrumAccountQueries = accountQueries.map(desc =>
      makeSpectrumAccountQuery(desc, powers),
    );
    const spectrumPoolQueries = positionQueries.map(desc =>
      makeSpectrumPoolQuery(desc, powers),
    );
    const [accountResult, positionResult] = await Promise.allSettled([
      spectrumBlockchain.getBalances({ accounts: spectrumAccountQueries }),
      spectrumPools.getBalances({ positions: spectrumPoolQueries }),
    ]);
    if (
      accountResult.status !== 'fulfilled' ||
      positionResult.status !== 'fulfilled'
    ) {
      const rejections = [accountResult, positionResult].flatMap(settlement =>
        settlement.status === 'fulfilled' ? [] : [settlement.reason],
      );
      errors.push(...rejections);
      throw AggregateError(errors, 'Could not get balances');
    }
    const accountBalances = accountResult.value.balances;
    const positionBalances = positionResult.value.balances;
    if (
      accountBalances.length !== accountQueries.length ||
      positionBalances.length !== positionQueries.length
    ) {
      const msg = `Bad balance query response(s), expected [${[accountBalances.length, positionBalances.length]}] results but got [${[accountQueries.length, positionQueries.length]}]`;
      throw AggregateError(errors, msg);
    }
    for (let i = 0; i < accountQueries.length; i += 1) {
      const { place } = accountQueries[i];
      const result = accountBalances[i];
      if (result.error) errors.push(Error(result.error));
      balances.set(place, amountFromAccountBalance(brand, result.balance));
    }
    for (let i = 0; i < positionQueries.length; i += 1) {
      const { place } = positionQueries[i];
      const result = positionBalances[i];
      if (result.error) errors.push(Error(result.error));
      balances.set(place, amountFromPositionBalance(brand, result.balance));
    }
    if (errors.length) {
      throw AggregateError(errors, 'Could not accept balances');
    }
    return Object.fromEntries(balances);
  }
  // XXX Fallback during the transition to using only Spectrum GraphQL.
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
  const currentBalances = fromTypedEntries(balanceEntries);
  return currentBalances;
};

export const getNonDustBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Partial<Record<AssetPlaceRef, NatAmount>>> => {
  const currentBalances = await getCurrentBalances(status, brand, powers);
  const nonDustBalances = objectMetaMap(currentBalances, desc =>
    desc.value && desc.value.value > ACCOUNT_DUST_EPSILON ? desc : undefined,
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
  const weights = Object.keys(allocation).length
    ? typedEntries({
        // Any current balance with no target has an effective weight of 0.
        ...objectMap(current, () => 0n),
        ...(allocation as Required<typeof allocation>),
      })
    : // In the absence of target weights, maintain the relative status quo.
      typedEntries(current as Required<typeof current>).map(
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
