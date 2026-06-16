import type { Brand, NatAmount, NatValue } from '@agoric/ertp/src/types.js';
import {
  fromTypedEntries,
  objectMap,
  provideLazyMap,
  typedEntries,
} from '@agoric/internal';
import { ACCOUNT_DUST_EPSILON, type SupportedChain } from './constants.js';
import { chainOf, isInstrumentId } from './places.ts';
import type { AssetPlaceRef, TargetAllocation } from './types.js';

import type {
  ChainSpec,
  NetworkSpec,
  PoolSpec,
} from './network/network-spec.js';

const hardenOrFreeze = globalThis.harden ?? Object.freeze;

export const DEFAULT_DELTA_SOFT_MIN = 1_000_000n; // 1 USDC

export const TargetBalanceError = class extends Error {} as ErrorConstructor;
hardenOrFreeze(TargetBalanceError);

export type ComputeTargetBalancesOptions<
  C extends AssetPlaceRef,
  T extends string & keyof TargetAllocation,
> = {
  /**
   * Brand for the returned nat amounts. It must match the brand used by
   * `currentBalances`.
   */
  brand: Brand<'nat'>;
  /** Current portfolio balances keyed by pool, hub, or local place. */
  currentBalances: Partial<Record<C, NatAmount>>;
  /**
   * Signed balance change to apply before computing targets. Deposits are
   * positive, withdrawals are negative, and rebalances are zero.
   */
  balanceDelta?: NatValue;
  /** Relative target weights. Empty means preserve the non-hub status quo. */
  targetAllocation?: Partial<Pick<TargetAllocation, T>>;
  /** Static network constraints and pool availability. */
  network: NetworkSpec;
  /**
   * Chain providing a deposit. Used to keep funds on a reachable hub when a
   * target sink is unavailable or suppressed.
   */
  depositFromChain?: SupportedChain;
  instrumentBlocks?: {
    noDepositInstruments: Set<AssetPlaceRef>;
    noWithdrawInstruments: Set<AssetPlaceRef>;
  };
};

type PlaceRecord = {
  chain: ChainSpec;
  pool?: PoolSpec;
};

const placeRecordsByNetwork = new WeakMap<
  NetworkSpec,
  Map<AssetPlaceRef, PlaceRecord>
>();

const failTargetBalance = (message: string): never => {
  throw new TargetBalanceError(message);
};

const failInternal = (message: string): never => {
  throw Error(message);
};

const getOwn = <V>(
  obj: Partial<Record<PropertyKey, V>>,
  key: PropertyKey,
): V | undefined => (Object.hasOwn(obj, key) ? obj[key] : undefined);

const isDust = (value: bigint): boolean =>
  -ACCOUNT_DUST_EPSILON < value && value < ACCOUNT_DUST_EPSILON;

// #region XXX These probably belong in @agoric/internal.
const bigintAbs = (x: bigint) => (x < 0n ? -x : x);

const bigintMin = (first: bigint, ...rest: bigint[]): bigint => {
  let min = first;
  for (const arg of rest) {
    if (arg < min) min = arg;
  }
  return min;
};
// #endregion

const sortEntriesDesc = <T extends [unknown, number] | [unknown, NatValue]>(
  entries: T[],
): T[] => entries.sort(([_k1, a], [_k2, b]) => (a < b ? 1 : a > b ? -1 : 0));

const makeNatAmount = (brand: Brand<'nat'>, value: NatValue): NatAmount => {
  value >= 0n ||
    failInternal(`internal: computed negative target balance ${value}`);
  return hardenOrFreeze({ brand, value }) as NatAmount;
};

const getPlaceData = (
  place: AssetPlaceRef,
  network: NetworkSpec,
): PlaceRecord => {
  // The `chains` and `pools` arrays of `network` are immutable, so we only need
  // to build its corresponding Map<AssetPlaceRef, PlaceRecord> once.
  const placeRecords = provideLazyMap(placeRecordsByNetwork, network, () => {
    const records = new Map<AssetPlaceRef, PlaceRecord>();
    for (const chain of network.chains) {
      records.set(`@${chain.name}` as AssetPlaceRef, { chain });
    }
    for (const pool of network.pools) {
      const chainRecord =
        records.get(`@${pool.chain}` as AssetPlaceRef) ??
        failInternal(`No chain found for pool ${pool.pool}`);
      records.set(pool.pool as AssetPlaceRef, {
        chain: chainRecord.chain,
        pool,
      });
    }
    return records;
  });

  // `network.pools` is not necessarily complete.
  return provideLazyMap(placeRecords, place, () => {
    const chainName = chainOf(place);
    const chainRecord =
      placeRecords.get(`@${chainName}` as AssetPlaceRef) ??
      failInternal(`No chain found for asset place ${place}`);
    return { chain: chainRecord.chain };
  });
};

const isNonemptyPositionEntry = (entry: [AssetPlaceRef, NatValue]): boolean => {
  const [place, value] = entry;
  return isInstrumentId(place) && value > 0n;
};

/**
 * Derive target balances for allocation keys, suppressing small changes and
 * movements blocked by e.g. lack of instrument liquidity or available capacity.
 * When target allocations cannot be satisfied, strive for proportionality and
 * bend the rules for a withdrawal, but do not increase any position beyond its
 * target allocation (opting instead to leave the excess at a non-instrument
 * hub).
 *
 * Returns only entries whose values change by at least ACCOUNT_DUST_EPSILON
 * compared to current.
 */
export const computeTargetBalances = <
  C extends AssetPlaceRef,
  T extends string & keyof TargetAllocation,
>({
  brand,
  currentBalances,
  balanceDelta = 0n,
  targetAllocation = {},
  network,
  depositFromChain,
  instrumentBlocks,
}: ComputeTargetBalancesOptions<C, T>): Partial<Record<C | T, NatAmount>> => {
  const { noDepositInstruments, noWithdrawInstruments } =
    instrumentBlocks ?? {};
  const currentValues = objectMap(
    currentBalances as Record<C, NatAmount>,
    amount => amount.value,
  ) as Partial<Record<C, NatValue>>;
  const currentTotal = Object.values<NatValue>(
    currentValues as Record<C, NatValue>,
  ).reduce((acc, value) => acc + value, 0n);
  const total = currentTotal + balanceDelta;
  total >= 0n || failTargetBalance('Insufficient funds for withdrawal.');
  let liquidTotal = total;

  type PW = [C | T, NatValue];
  const allWeights: PW[] = Object.keys(targetAllocation).length
    ? (typedEntries({
        // Any current balance with no target has an effective weight of 0.
        ...objectMap(currentValues, () => 0n),
        ...(targetAllocation as Required<typeof targetAllocation>),
      } as Partial<Record<C | T, NatValue>>) as PW[])
    : // In the absence of target weights, maintain the relative status quo but
      // zero out hubs (chains) if there is anywhere else to deploy their funds.
      (valueEntries => {
        return valueEntries.some(isNonemptyPositionEntry)
          ? valueEntries.map(([p, v]) => [p, isInstrumentId(p) ? v : 0n] as PW)
          : (valueEntries as PW[]);
      })(typedEntries(currentValues) as [C, NatValue][]);
  allWeights.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  let sumW = allWeights.reduce((acc, entry) => acc + entry[1], 0n);
  sumW > 0n ||
    failTargetBalance('Total target allocation weights must be positive.');

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
    const { blockDepositReason, blockWithdrawReason } = placeData.pool ?? {};
    return {
      place,
      chain: placeData.chain,
      weight,
      current: getOwn(currentValues, place) ?? 0n,
      deltaSoftMin: placeData.chain.deltaSoftMin ?? DEFAULT_DELTA_SOFT_MIN,
      // `network` can force an instrument to be blocked or unblocked, but
      // otherwise it's based upon dynamic status.
      blockDeposit:
        blockDepositReason !== undefined
          ? !!blockDepositReason
          : !!noDepositInstruments?.has(place),
      blockWithdraw:
        blockWithdrawReason !== undefined
          ? !!blockWithdrawReason
          : !!noWithdrawInstruments?.has(place),

      target: 0n,
      delta: 0n,
      resolvedDelta: 0n,
    };
  };
  const draft: Record<C | T, DraftRecord> = Object.assign(
    Object.create(null) as Record<C | T, DraftRecord>,
    fromTypedEntries(
      allWeights.map(([place, weight]) => {
        return [place, makeDraftRecord(place, weight)] as [C | T, DraftRecord];
      }),
    ),
  );

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
    const fallback = Object.create(null) as Partial<Record<C | T, NatAmount>>;
    let unsatisfied = -balanceDelta;
    for (const [place, value] of sortEntriesDesc(
      typedEntries(currentValues) as [C, NatValue][],
    )) {
      if (isDust(value)) break;
      if (draft[place]?.blockWithdraw !== false) continue;
      const take = bigintMin(unsatisfied, value);
      fallback[place] = makeNatAmount(brand, value - take);
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
    typedEntries(outByChain) as [SupportedChain, NatValue][],
  );
  let remainder = liquidTotal;
  const pending = new Set<DraftRecord>(Object.values(draft));
  const claim = (chainName: SupportedChain, value: NatValue) => {
    const chainPlace = `@${chainName}` as C | T;
    draft[chainPlace] ??= makeDraftRecord(chainPlace);
    draft[chainPlace].resolvedDelta += value;
    if (!pending.has(draft[chainPlace])) remainder -= value;
  };
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
    // outflow from one or more donor-chain hubs before adjusting the local hub.
    remainder -= current;
    const local = getPlaceData(place, network).chain;
    const localDonorEntry = donorChainsDesc.find(([n]) => n === local.name)!;
    const localNetOut = localDonorEntry[1];
    if (localNetOut >= 0n) {
      claim(local.name, delta);
    } else {
      let excess = delta;
      for (const donorEntry of donorChainsDesc) {
        const [chainName, netOut] = donorEntry;
        if (excess === 0n || netOut <= 0n) break;
        const d = bigintMin(excess, netOut);
        claim(chainName, d);
        donorEntry[1] -= d;
        excess -= d;
      }
      if (excess !== 0n) {
        claim(local.name, excess);
        localDonorEntry[1] -= excess;
      }
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
      failTargetBalance(
        `Nowhere to place ${remainder} in target balance update`,
      );
  }

  // Return a mutable Record that omits no-change entries.
  const result = Object.create(null) as Partial<Record<C | T, NatAmount>>;
  for (const [place, draftRecord] of typedEntries(draft)) {
    const { current, resolvedDelta } = draftRecord;
    if (resolvedDelta === 0n) continue;
    const targetValue = current + resolvedDelta;
    result[place] = makeNatAmount(brand, targetValue);
  }
  return { ...result };
};
hardenOrFreeze(computeTargetBalances);
