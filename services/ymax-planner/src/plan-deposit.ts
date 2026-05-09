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
  PoolSpec,
} from '@aglocal/portfolio-contract/tools/network/network-spec.js';
import {
  bigintAbs,
  bigintMin,
  planRebalanceFlow,
} from '@aglocal/portfolio-contract/tools/plan-solve.js';
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

const DEFAULT_DELTA_SOFT_MIN = 1_000_000n; // 1 USDC

const scale6 = (x: number) => {
  assert.typeof(x, 'number');
  return BigInt(Math.round(x * 1e6));
};

const rejectUserInput = (details: ReturnType<typeof X> | string): never =>
  assert.fail(details, ((...args) =>
    Reflect.construct(UserInputError, args)) as ErrorConstructor);

const isDust = (value: bigint): boolean =>
  -ACCOUNT_DUST_EPSILON < value && value < ACCOUNT_DUST_EPSILON;

type PlaceRecord = {
  chain: ChainSpec;
  pool?: PoolSpec;
};

const placeRecordsByNetwork = new WeakMap<
  NetworkSpec,
  Map<AssetPlaceRef, PlaceRecord>
>();

const getPlaceData = (
  place: AssetPlaceRef,
  network: NetworkSpec,
): PlaceRecord => {
  // The `chains` and `pools` arrays of `network` are immutable, so we only need
  // to build its corresponding Map<AssetPlaceRef, PlaceRecord> once.
  const placeRecords = provideLazyMap(placeRecordsByNetwork, network, () => {
    const chainEntries = network.chains.map<[AssetPlaceRef, PlaceRecord]>(
      chain => [`@${chain.name}`, { chain }],
    );
    // eslint-disable-next-line no-shadow
    const placeRecords = new Map(typedEntries(fromUniqueEntries(chainEntries)));
    for (const pool of network.pools) {
      const { chain } =
        placeRecords.get(`@${pool.chain}`) ||
        Fail`No chain found for pool ${q(pool.pool)}`;
      placeRecords.set(pool.pool, { chain, pool });
    }
    return placeRecords;
  });
  // `network.pools` is not necessarily complete.
  const placeRecord = provideLazyMap(placeRecords, place, () => {
    const chainName =
      chainOf(place) || Fail`Unknown chain name for asset place ${q(place)}`;
    const { chain } =
      placeRecords.get(`@${chainName}`) ||
      Fail`No chain found for pool ${q(place)}`;
    return { chain };
  });
  return placeRecord;
};

const isNonemptyPositionEntry = (entry: [AssetPlaceRef, NatValue]): boolean => {
  const [place, value] = entry;
  return isInstrumentId(place) && value > 0n;
};

const sortEntriesDesc = <T extends [unknown, number] | [unknown, NatValue]>(
  entries: T[],
): T[] => entries.sort(([_k1, a], [_k2, b]) => (a < b ? 1 : a > b ? -1 : 0));

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
 * Derive weighted targets for allocation keys, suppressing small changes and
 * movements blocked by e.g. lack of instrument liquidity or available capacity.
 * When target allocations cannot be satisfied, strive for proportionality and
 * bend the rules for a withdrawal, but do not increase any position beyond its
 * target allocation (opting instead to leave the excess at a non-instrument
 * hub).
 *
 * Returns only entries whose values change by at least ACCOUNT_DUST_EPSILON
 * compared to current.
 */
const computeWeightedTargets = <
  C extends AssetPlaceRef,
  T extends keyof TargetAllocation,
>(
  brand: Brand<'nat'>,
  currentAmounts: Record<C, NatAmount>,
  balanceDelta: NatValue,
  allocation: Partial<Pick<TargetAllocation, T>> = {},
  network: NetworkSpec,
  depositFromChain?: SupportedChain,
): Partial<Record<C | T, NatAmount>> => {
  const currentValues = objectMap(currentAmounts, amount => amount.value);
  const currentTotal = Object.values<NatValue>(currentValues).reduce(
    (acc, value) => acc + value,
    0n,
  );
  const total = currentTotal + balanceDelta;
  total >= 0n || rejectUserInput('Insufficient funds for withdrawal.');
  let liquidTotal = total;

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
  allWeights.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  let sumW = allWeights.reduce((acc, entry) => acc + entry[1], 0n);
  sumW > 0n ||
    rejectUserInput('Total target allocation weights must be positive.');

  type DraftRecord = {
    readonly place: C | T;
    readonly chain: ChainSpec;
    readonly weight: NatValue;
    readonly current: NatValue;
    readonly blockDeposit: boolean;
    readonly blockWithdraw: boolean;
    readonly deltaSoftMin: NatValue;
    target: NatValue;
    delta: NatValue; // target - current
    resolvedDelta: NatValue;
  };
  const makeDraftRecord = (
    place: C | T,
    weight: NatValue = 0n,
  ): DraftRecord => {
    const placeData = getPlaceData(place, network);
    return {
      place,
      chain: placeData.chain,
      weight,
      current: getOwn(currentValues, place) ?? 0n,
      blockDeposit: !!placeData.pool?.blockDepositReason,
      blockWithdraw: !!placeData.pool?.blockWithdrawReason,
      deltaSoftMin: placeData.chain.deltaSoftMin ?? DEFAULT_DELTA_SOFT_MIN,

      target: 0n,
      delta: 0n,
      resolvedDelta: 0n,
    };
  };
  // @ts-expect-error Record confused by null prototype
  const draft: Record<C | T, DraftRecord> = {
    __proto__: null,
    ...fromTypedEntries(
      allWeights.map(([place, weight]) => {
        return [place, makeDraftRecord(place, weight)] as [C | T, DraftRecord];
      }),
    ),
  };

  // Blocked/suppressed sources proportionally reduce the other targets,
  // potentially even cascading into new blocked sources (e.g., A/B/C/D target
  // balances 40/20/20/20 can become 52/16/16/16 from A being withdraw-blocked
  // at current 52, and then 52/15/15/18 from the originally-a-sink D being
  // withdraw-blocked at current 18.
  const suppressions = new Map<AssetPlaceRef, NatValue>();
  for (;;) {
    const badSources: [DraftRecord, gap: NatValue][] = [];
    const needsSuppress: [DraftRecord, gap: NatValue][] = [];
    for (const [place, draftRecord] of typedEntries(draft)) {
      if (suppressions.has(place)) continue;
      const { weight, current, blockDeposit, blockWithdraw } = draftRecord;
      const target = (liquidTotal * weight) / sumW; // rounds down
      /** positive delta is a sink, negative delta is a source */
      const delta = target - current;
      Object.assign(draftRecord, { target, delta });
      const absDelta = bigintAbs(delta);
      const isBlocked =
        (delta > 0n && blockDeposit) || (delta < 0n && blockWithdraw);
      const isSuppressed = delta !== 0n && absDelta < draftRecord.deltaSoftMin;
      if (isBlocked && delta < 0n) {
        badSources.push([draftRecord, 0n]);
      } else if (isSuppressed && delta < 0n) {
        needsSuppress.push([draftRecord, draftRecord.deltaSoftMin - absDelta]);
      }
      draftRecord.resolvedDelta = isBlocked || isSuppressed ? 0n : delta;
    }

    if (badSources.length === 0) {
      // No sources to block, but there still might be suppressions.
      // Cement those with the largest gap.
      sortEntriesDesc(needsSuppress);
      for (let i = 0; i < needsSuppress.length; i += 1) {
        const gap = needsSuppress[i][1];
        if (i > 0 && gap !== needsSuppress[i - 1][1]) break;
        badSources.push(needsSuppress[i]);
      }
    }
    for (const [source, gap] of badSources) {
      const { place, current, weight, blockWithdraw } = source;
      // A blocked source is not usable even as a withdrawal fallback.
      if (blockWithdraw) delete draft[place];
      if (suppressions.has(place)) continue;
      suppressions.set(place, gap);
      liquidTotal -= current;
      sumW -= weight;
    }
    if (badSources.length === 0 || liquidTotal < 0n) break;
  }

  // If all sources are suppressed for a deposit or rebalance, we're done.
  if (liquidTotal <= 0n && balanceDelta >= 0n) return {};

  // If all sources are suppressed for a withdrawal, try to succeed anyway but
  // minimize the count of affected places rather than the divergence from
  // allocation.
  if (liquidTotal < 0n && balanceDelta < 0n) {
    // @ts-expect-error Record confused by null prototype
    const fallback: Partial<Record<C | T, NatAmount>> = { __proto__: null };
    let unsatisfied = -balanceDelta;
    for (const [place, value] of sortEntriesDesc(typedEntries(currentValues))) {
      if (isDust(value)) break;
      if (draft[place]?.blockWithdraw !== false) continue;
      const take = bigintMin(unsatisfied, value);
      fallback[place] = AmountMath.make(brand, value - take);
      unsatisfied -= take;
      if (unsatisfied === 0n) return { ...fallback };
    }
    // TODO(AGO-535): Effect a partial withdrawal here if necessary (e.g., when
    // some requested funds are in a low-liquidity position).
    return {};
  }

  // Blocked/suppressed *sinks* just leave funds in a source chain account.
  // We track chain-level outflow to know which one.
  const outByChain: Partial<Record<SupportedChain, NatValue>> = {};
  for (const [place, { chain, delta }] of typedEntries(draft)) {
    if (suppressions.has(place)) continue;
    const chainName = chain.name;
    outByChain[chainName] = (getOwn(outByChain, chainName) ?? 0n) - delta;
  }
  if (depositFromChain) {
    outByChain[depositFromChain] =
      (getOwn(outByChain, depositFromChain) ?? 0n) + balanceDelta;
  }
  const donorChainsDesc = sortEntriesDesc(
    typedEntries(outByChain as Required<typeof outByChain>),
  );
  let remainder = liquidTotal;
  const pending = new Set<DraftRecord>(Object.values(draft));
  for (const draftRecord of pending) {
    pending.delete(draftRecord);
    const { place, current, delta, resolvedDelta } = draftRecord;
    if (suppressions.has(place)) continue;
    // No adjustment is necessary for a source and/or satisfied delta.
    if (delta <= 0n || resolvedDelta !== 0n) {
      const newBalance = current + resolvedDelta;
      remainder -= newBalance;
      continue;
    }

    // This sink cannot receive its inbound funds. If its chain is a net source
    // or neutral, we leave them at the local hub. Otherwise, we reduce the net
    // outflow from one or more donor-chain hubs.
    remainder -= current;
    const local = getPlaceData(place, network).chain;
    const localNetOut = donorChainsDesc.find(([n]) => n === local.name)![1];
    if (localNetOut >= 0n) {
      const chainPlace = `@${local.name}` as C | T;
      draft[chainPlace] ??= makeDraftRecord(chainPlace);
      draft[chainPlace].resolvedDelta += delta;
      if (!pending.has(draft[chainPlace])) remainder -= delta;
    } else {
      let excess = delta;
      for (const donorEntry of donorChainsDesc) {
        const [chainName, netOut] = donorEntry;
        if (excess === 0n || netOut <= 0n) break;
        const chainPlace = `@${chainName}` as C | T;
        draft[chainPlace] ??= makeDraftRecord(chainPlace);
        const d = bigintMin(excess, netOut);
        if (!pending.has(draft[chainPlace])) remainder -= d;
        draft[chainPlace].resolvedDelta += d;
        donorEntry[1] -= d;
        excess -= d;
      }
      excess === 0n ||
        Fail`internal: Unable to suppress ${q(place)} for ${{ currentValues, balanceDelta, allocation }}`;
      sortEntriesDesc(donorChainsDesc);
    }
  }

  // We have our targets. Distribute any rounding loss to the highest-weight
  // place that can accept it.
  // XXX We should instead redistribute to minimize error.
  if (remainder !== 0n) {
    const weightsDesc = sortEntriesDesc(allWeights);
    for (const [place, _w] of weightsDesc) {
      if (draft[place]?.blockDeposit) continue;
      draft[place] ??= makeDraftRecord(place);
      const newDelta = draft[place].resolvedDelta + remainder;
      if (newDelta === 0n || !isDust(newDelta)) {
        draft[place].resolvedDelta = newDelta;
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
    ...objectMetaMap(draft, (desc, _place) => {
      const { current, resolvedDelta } = desc.value as DraftRecord;
      if (resolvedDelta === 0n) return undefined;
      const targetValue = current + resolvedDelta;
      return { ...desc, value: AmountMath.make(brand, targetValue) };
    }),
  };
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
  const {
    amount,
    brand,
    currentBalances,
    network,
    targetAllocation,
    fromChain = 'agoric',
  } = details;
  if (!targetAllocation) return { flow: [], order: undefined };
  const target = computeWeightedTargets(
    brand,
    currentBalances,
    amount.value,
    targetAllocation,
    network,
    fromChain,
  );
  if (Object.keys(target).length === 0) return { flow: [], order: undefined };

  const { feeBrand, gasEstimator } = details;
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
