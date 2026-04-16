import { fromUniqueEntries } from '@endo/common/from-unique-entries.js';
import { assert, Fail, q, X } from '@endo/errors';

import type { AssetPlaceRef } from '@aglocal/portfolio-contract/src/type-guards-steps.js';
import type {
  PoolKey,
  PoolPlaceInfo,
  StatusFor,
  TargetAllocation,
} from '@aglocal/portfolio-contract/src/type-guards.js';
import { PoolPlaces } from '@aglocal/portfolio-contract/src/type-guards.js';
import { chainOf } from '@aglocal/portfolio-contract/tools/network/buildGraph.js';
import type {
  ChainSpec,
  NetworkSpec,
} from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import { planRebalanceFlow } from '@aglocal/portfolio-contract/tools/plan-solve.js';
import type { GasEstimator } from '@aglocal/portfolio-contract/tools/plan-solve.ts';
import { AmountMath } from '@agoric/ertp/src/amountMath.js';
import type { Brand, NatAmount, NatValue } from '@agoric/ertp/src/types.js';
import {
  fromTypedEntries,
  objectMap,
  objectMetaMap,
  provideLazyMap,
  typedEntries,
} from '@agoric/internal';
import type { Caip10Record, CaipChainId } from '@agoric/orchestration';
import { parseAccountId } from '@agoric/orchestration/src/utils/address.js';
import type {
  FundsFlowPlan,
  InterChainAccountRef,
  SupportedChain,
} from '@agoric/portfolio-api';
import { ACCOUNT_DUST_EPSILON, isInstrumentId } from '@agoric/portfolio-api';

import type { EvmAddress } from '@agoric/fast-usdc';
import type { WebSocketProvider } from 'ethers';
import { getErc20Balances } from './evm-utils.ts';
import type {
  ChainAddressTokenBalance as SpectrumGetAddressBalanceResult,
  ChainAddressTokenInput as SpectrumGetAddressBalanceInput,
} from './graphql/api-spectrum-blockchain/__generated/graphql.ts';
import type { Sdk as SpectrumBlockchainSdk } from './graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { EvmChain } from './pending-tx-manager.ts';
import { UserInputError } from './support.ts';
import { getOwn, lookupValueForKey } from './utils.js';

// eslint-disable-next-line no-underscore-dangle
const _DEFAULT_DELTA_SOFT_MIN = 1_000_000n; // 1 USDC

const bigintAbs = (x: bigint) => (x < 0n ? -x : x);

const scale6 = (x: number) => {
  assert.typeof(x, 'number');
  return BigInt(Math.round(x * 1e6));
};

const rejectUserInput = (details: ReturnType<typeof X> | string): never =>
  assert.fail(details, ((...args) =>
    Reflect.construct(UserInputError, args)) as ErrorConstructor);

const isDust = (value: bigint): boolean =>
  -ACCOUNT_DUST_EPSILON < value && value < ACCOUNT_DUST_EPSILON;

const chainRecordsByNetwork = new WeakMap<
  NetworkSpec,
  Map<AssetPlaceRef, ChainSpec>
>();

// eslint-disable-next-line no-underscore-dangle
const _getChainData = (
  place: AssetPlaceRef,
  network: NetworkSpec,
): ChainSpec => {
  // Memoization of immutable NetworkSpec data: get a
  // Map<AssetPlaceRef, ChainSpec> for `network`, initialized to the
  // hubs for its `chains` and then lazily populated for each observed non-hub
  // `place` by mapping to those hubs via chain name.
  const chainRecordsMap = provideLazyMap(chainRecordsByNetwork, network, () => {
    const mapEntries = network.chains.map(
      chainRecord =>
        [`@${chainRecord.name}`, chainRecord] as [AssetPlaceRef, ChainSpec],
    );
    return new Map(typedEntries(fromUniqueEntries(mapEntries)));
  });
  const chainData = provideLazyMap(chainRecordsMap, place, () => {
    const chainName = chainOf(place);
    return chainRecordsMap.get(`@${chainName}`);
  });
  return chainData || Fail`No chain found for asset place ${q(place)}`;
};

const isNonemptyPositionEntry = (entry: [AssetPlaceRef, NatValue]): boolean => {
  const [place, value] = entry;
  return isInstrumentId(place) && value > 0n;
};

const natEntriesDesc = <T extends [string, NatValue]>(entries: T[]): T[] =>
  entries.sort(([_k1, a], [_k2, b]) => (a < b ? 1 : a > b ? -1 : 0));

const amountFromSpectrumAccountBalance = (
  brand: Brand<'nat'>,
  balance: SpectrumGetAddressBalanceResult['balance'],
) =>
  balance === undefined
    ? undefined
    : AmountMath.make(brand, scale6(Number(balance)));

export type BalanceQueryPowers = {
  spectrumBlockchain: SpectrumBlockchainSdk;
  spectrumChainIds: Partial<Record<SupportedChain, string>>;
  evmTokenAddresses: Partial<
    Record<InterChainAccountRef | PoolKey, EvmAddress>
  >;
  usdcTokensByChain: Partial<Record<SupportedChain, string>>;
  evmProviders: Record<CaipChainId, WebSocketProvider>;
  chainNameToChainIdMap: Partial<Record<EvmChain, CaipChainId>>;
};

type AlchemyBalanceQuery = {
  place: InterChainAccountRef | PoolKey;
  chainName: SupportedChain;
  address: string;
  token: PoolPlaceInfo['protocol'] | 'USDC';
};

type SpectrumBalanceQuery = {
  place: AssetPlaceRef;
  chainName: SupportedChain;
  address: string;
  asset: string;
};

const makeSpectrumGetAddressBalanceInput = (
  desc: Pick<SpectrumBalanceQuery, 'chainName' | 'address' | 'asset'>,
  powers: BalanceQueryPowers,
): SpectrumGetAddressBalanceInput => {
  const { chainName, address, asset } = desc;
  const chainId = lookupValueForKey(powers.spectrumChainIds, chainName);
  const token =
    asset === 'USDC'
      ? lookupValueForKey(powers.usdcTokensByChain, chainName)
      : // "USDN" -> "usdn"
        asset.toLowerCase();
  return { chain: chainId, address, token };
};

export const getCurrentBalances = async (
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Partial<Record<AssetPlaceRef, NatAmount | undefined>>> => {
  const { positionKeys, accountIdByChain } = status;
  const { spectrumBlockchain } = powers;
  const addressInfo = new Map<SupportedChain, Caip10Record>();
  /** Queries for Alchemy (EVM account & position balances) */
  const alchemyQueries = [] as AlchemyBalanceQuery[];
  /** Queries for the Spectrum Blockchain API (non-EVM account balances) */
  const spectrumAccountQueries = [] as SpectrumBalanceQuery[];
  const balances = new Map<AssetPlaceRef, NatAmount | undefined>();
  const errors = [] as Error[];

  // Define account queries (EVM chains via Alchemy, others via Spectrum).
  for (const [chainName, accountId] of typedEntries(
    accountIdByChain as Required<typeof accountIdByChain>,
  )) {
    const place = `@${chainName}` as AssetPlaceRef;
    balances.set(place, undefined);
    try {
      const addressParts = parseAccountId(accountId);
      addressInfo.set(chainName, addressParts);
      const { namespace, accountAddress: address } = addressParts;
      if (namespace === 'eip155') {
        alchemyQueries.push({
          place: place as `@${EvmChain}`,
          chainName,
          address,
          token: 'USDC',
        });
      } else {
        spectrumAccountQueries.push({
          place,
          chainName,
          address,
          asset: 'USDC',
        });
      }
    } catch (cause) {
      const err = Error(
        `Cannot make query for ${chainName} address ${accountId}`,
        { cause },
      );
      errors.push(err);
    }
  }

  // Define position queries (EVM chains via Alchemy, others via Spectrum).
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
      if (namespace === 'eip155') {
        alchemyQueries.push({ place, chainName, address, token: protocol });
      } else {
        spectrumAccountQueries.push({
          place,
          chainName,
          address,
          asset: protocol,
        });
      }
    } catch (err) {
      errors.push(err);
    }
  }

  const [alchemyResult, spectrumAccountResult] = await Promise.allSettled([
    alchemyQueries.length
      ? getErc20Balances(alchemyQueries, powers)
      : { balances: [] },
    spectrumAccountQueries.length
      ? spectrumBlockchain.getBalances({
          accounts: spectrumAccountQueries.map(queryDesc =>
            makeSpectrumGetAddressBalanceInput(queryDesc, powers),
          ),
        })
      : { balances: [] },
  ]);

  if (
    alchemyResult.status !== 'fulfilled' ||
    spectrumAccountResult.status !== 'fulfilled'
  ) {
    const rejections = [alchemyResult, spectrumAccountResult].flatMap(
      settlement =>
        settlement.status === 'fulfilled' ? [] : [settlement.reason],
    );
    errors.push(...rejections);
    throw AggregateError(errors, 'Could not get balances');
  }
  const alchemyBalances = alchemyResult.value.balances;
  const spectrumAccountBalances = spectrumAccountResult.value.balances;
  if (
    alchemyBalances.length !== alchemyQueries.length ||
    spectrumAccountBalances.length !== spectrumAccountQueries.length
  ) {
    const msg = `Bad balance query response(s), expected [${[alchemyBalances.length, spectrumAccountBalances.length]}] results but got [${[alchemyQueries.length, spectrumAccountQueries.length]}]`;
    throw AggregateError(errors, msg);
  }

  for (let i = 0; i < alchemyBalances.length; i += 1) {
    const { place, balance, error } = alchemyBalances[i];
    if (error) {
      errors.push(Error(error));
    }
    balances.set(
      place as AssetPlaceRef,
      balance === undefined ? undefined : AmountMath.make(brand, balance),
    );
  }

  for (let i = 0; i < spectrumAccountQueries.length; i += 1) {
    const { place, asset } = spectrumAccountQueries[i];
    const result = spectrumAccountBalances[i];
    if (result.error) errors.push(Error(result.error));
    const balanceAmount = amountFromSpectrumAccountBalance(
      brand,
      result.balance,
    );
    balances.set(place, balanceAmount);
    // XXX as of 2025-11-19, spectrumBlockchain.getBalances returns @agoric
    // IBC USDC balances in micro-USDC (uusdc) rather than USDC like the rest.
    if (place === '@agoric' && asset === 'USDC' && result.balance) {
      if (!result.balance.match(/^[0-9]+$/)) {
        const msg = `⚠️ Got a non-integer balance ${result.balance} for @agoric USDC; verify scaling with Spectrum`;
        errors.push(Error(msg));
      }
      balances.set(place, AmountMath.make(brand, BigInt(result.balance)));
    }
  }

  if (errors.length) {
    throw AggregateError(errors, 'Could not accept balances');
  }
  return Object.fromEntries(balances);
};

export const getNonDustBalances = async <C extends AssetPlaceRef>(
  status: StatusFor['portfolio'],
  brand: Brand<'nat'>,
  powers: BalanceQueryPowers,
): Promise<Record<C, NatAmount>> => {
  const currentBalances = await getCurrentBalances(status, brand, powers);
  const nonDustBalances = objectMetaMap(currentBalances, desc =>
    desc.value && desc.value.value > ACCOUNT_DUST_EPSILON ? desc : undefined,
  );
  return nonDustBalances;
};

/**
 * Derive weighted targets for allocation keys. Additionally, always zero out hub balances
 * (chains; keys starting with '@') that have non-zero current amounts. Returns only entries
 * whose values change by at least ACCOUNT_DUST_EPSILON compared to current.
 */
const computeWeightedTargets = <
  C extends AssetPlaceRef,
  T extends keyof TargetAllocation,
>(
  brand: Brand<'nat'>,
  currentAmounts: Record<C, NatAmount>,
  balanceDelta: NatValue,
  allocation: Partial<Pick<TargetAllocation, T>> = {},
  _network: NetworkSpec,
): Partial<Record<C | T, NatAmount>> => {
  const currentValues = objectMap(currentAmounts, amount => amount.value);
  const currentTotal = Object.values<NatValue>(currentValues).reduce(
    (acc, value) => acc + value,
    0n,
  );
  const total = currentTotal + balanceDelta;
  total >= 0n || rejectUserInput('Insufficient funds for withdrawal.');

  type PW = [C | T, NatValue];
  const allWeights: PW[] = Object.keys(allocation).length
    ? typedEntries({
        // Any current balance with no target has an effective weight of 0.
        ...objectMap(currentValues, () => 0n),
        ...(allocation as Required<typeof allocation>),
      })
    : // In the absence of target weights, maintain the relative status quo but
      // zero out hubs (chains) if there is anywhere else to deploy their funds.
      (valueEntries => {
        return valueEntries.some(isNonemptyPositionEntry)
          ? valueEntries.map(([p, v]) => [p, isInstrumentId(p) ? v : 0n] as PW)
          : valueEntries;
      })(typedEntries(currentValues));
  let sumW = allWeights.reduce((acc, entry) => acc + entry[1], 0n);
  sumW > 0n ||
    rejectUserInput('Total target allocation weights must be positive.');

  let prunedTotal = total;
  let remainder = total;
  for (const prunedWeights = fromTypedEntries(allWeights); sumW > 0n; ) {
    // Try to satisfy the weights, suppressing deltas that are too small and
    // tracking the geometric magnitude by which they miss.
    const draft: Partial<Record<C | T, NatValue>> = {};
    const suppressions: [C | T, number][] = [];
    for (const [place, weight] of typedEntries(prunedWeights) as PW[]) {
      const current = getOwn(currentValues, place) ?? 0n;
      const target = (prunedTotal * weight) / sumW;
      const absDelta = bigintAbs(target - current);
      // TODO(AGO-456): Partially restore AGO-373.
      // const chainData = getChainData(place, network);
      // const { deltaSoftMin = DEFAULT_DELTA_SOFT_MIN } = chainData;
      // const suppressed = absDelta !== 0n && absDelta < deltaSoftMin;
      // if (suppressed) {
      //   suppressions.push([place, Number(deltaSoftMin) / Number(absDelta)]);
      // }
      const suppressed = isDust(absDelta);
      const resolved = suppressed ? current : target;
      draft[place] = resolved;
      remainder -= resolved;
    }

    // If any deltas were suppressed, filter out weights for the biggest misses
    // and try again with the pruned subset.
    if (suppressions.length > 0) {
      suppressions.sort(([_k1, a], [_k2, b]) => (a < b ? 1 : a > b ? -1 : 0));
      for (let i = 0; i < suppressions.length; i += 1) {
        const [place, softLimitGap] = suppressions[i];
        if (i > 0 && softLimitGap !== suppressions[i - 1][1]) break;
        sumW -= prunedWeights[place] as NatValue;
        prunedTotal -= getOwn(currentValues, place) ?? 0n;
        delete prunedWeights[place];
      }
      remainder = prunedTotal;
      continue;
    }

    // We have our targets. Distribute any rounding loss to the highest-weight
    // place that can accept it.
    // XXX We should instead redistribute to minimize error.
    if (remainder !== 0n) {
      const weightsDesc = natEntriesDesc(typedEntries(prunedWeights) as PW[]);
      for (const [key, _w] of weightsDesc) {
        const a = getOwn(currentValues, key) ?? 0n;
        const v = (getOwn(draft, key) ?? 0n) + remainder;
        if (v === a || !isDust(v - a)) {
          draft[key] = v;
          remainder = 0n;
          break;
        }
      }
      remainder === 0n ||
        rejectUserInput(
          X`Nowhere to place ${remainder} in update of ${currentValues} to ${draft}`,
        );
    }

    // Return a mutable Record that omits no-change entries.
    return {
      ...objectMetaMap(draft, (desc, place) => {
        const targetValue = desc.value as NatValue;
        if (targetValue === getOwn(currentValues, place)) return undefined;
        return { ...desc, value: AmountMath.make(brand, targetValue) };
      }),
    };
  }

  // All deltas were suppressed, and if this is for a deposit or rebalance then
  // we're done.
  if (balanceDelta >= 0n) return {};

  // A withdraw should succeed regardless, but minimize the count of deltas
  // rather than the divergence from target allocation.
  // @ts-expect-error Record confused by null prototype
  const draft: Partial<Record<C | T, NatAmount>> = { __proto__: null };
  remainder = -balanceDelta;
  for (const [place, value] of natEntriesDesc(typedEntries(currentValues))) {
    const take = value < remainder ? value : remainder;
    draft[place] = AmountMath.make(brand, value - take);
    remainder -= take;
    if (remainder === 0n) break;
  }
  return { ...draft };
};

export type PlannerContext<
  C extends AssetPlaceRef,
  T extends keyof TargetAllocation,
> = {
  currentBalances: Record<C, NatAmount>;
  targetAllocation?: Partial<Pick<TargetAllocation, T>>;
  network: NetworkSpec;
  brand: Brand<'nat'>;
  feeBrand: Brand<'nat'>;
  gasEstimator: GasEstimator;
};

type PlanMaker<D = unknown> = <
  C extends AssetPlaceRef,
  T extends keyof TargetAllocation,
>(
  details: PlannerContext<C, T> & D,
) => Promise<FundsFlowPlan>;

/** Plan absorption of a deposit into current balances and target weights. */
export const planDepositToAllocations: PlanMaker<{
  amount: NatAmount;
  fromChain?: SupportedChain;
}> = async details => {
  const { amount, brand, currentBalances, network, targetAllocation } = details;
  if (!targetAllocation) return { flow: [], order: undefined };
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    amount.value,
    targetAllocation,
    network,
  );
  if (Object.keys(target).length === 0) return { flow: [], order: undefined };

  const { feeBrand, gasEstimator, fromChain = 'agoric' } = details;
  const depositFrom =
    // TODO(#12309): Remove the `<Deposit>` special case in favor of `+agoric`.
    (fromChain === 'agoric' ? '<Deposit>' : `+${fromChain}`) as AssetPlaceRef;
  const zeroAmount = AmountMath.make(brand, 0n);
  const resolvedCurrent = { ...currentBalances, [depositFrom]: amount };
  const resolvedTarget = { ...target, [depositFrom]: zeroAmount };
  const flowDetail = await planRebalanceFlow({
    network,
    current: resolvedCurrent,
    target: resolvedTarget,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.plan;
};

/** Plan rebalancing of current balances against target weights. */
export const planRebalanceToAllocations: PlanMaker = async details => {
  const { brand, currentBalances, network, targetAllocation } = details;
  if (!targetAllocation) return { flow: [], order: undefined };
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    0n,
    targetAllocation,
    network,
  );
  if (Object.keys(target).length === 0) return { flow: [], order: undefined };

  const { feeBrand, gasEstimator } = details;
  const flowDetail = await planRebalanceFlow({
    network,
    current: currentBalances,
    target,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.plan;
};

/** Plan a rebalancing withdrawal from current balances and target weights. */
export const planWithdrawFromAllocations: PlanMaker<{
  amount: NatAmount;
  toChain?: SupportedChain;
}> = async details => {
  const { amount, brand, currentBalances, network, targetAllocation } = details;
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    -amount.value,
    targetAllocation,
    network,
  );

  const { feeBrand, gasEstimator, toChain = 'agoric' } = details;
  const withdrawTo =
    // TODO(#12309): Remove the `<Cash>` special case in favor of `-agoric`.
    (toChain === 'agoric' ? '<Cash>' : `-${toChain}`) as AssetPlaceRef;
  const zeroAmount = AmountMath.make(brand, 0n);
  const resolvedCurrent = { ...currentBalances, [withdrawTo]: zeroAmount };
  const resolvedTarget = { ...target, [withdrawTo]: amount };
  const flowDetail = await planRebalanceFlow({
    network,
    current: resolvedCurrent,
    target: resolvedTarget,
    brand,
    feeBrand,
    gasEstimator,
  });
  return flowDetail.plan;
};
