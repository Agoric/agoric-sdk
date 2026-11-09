/**
 * @file EIP-712 messages by which an off-chain observation service (the
 * attestor) vouches for the state of a portfolio, so that a plan submitted by
 * a delegated agent can be checked against it on chain.
 *
 * These messages are only ever signed by the attestor's EOA, never by a
 * portfolio owner, and use their own domain name so that they can never be
 * confused with {@link YmaxPortfolioMessageSchema} operations. They are
 * standalone messages only (no permit2 witness), whose envelope fields are
 * used as the interval during which the observations may be relied upon:
 *
 * - `nonce`: when the observations were issued (`issuedAt`), in seconds since
 *   the epoch. It's not used to prevent replay: the observations are bound to
 *   an exact portfolio sync state, so replaying them is harmless.
 * - `deadline`: when the observations expire, in seconds since the epoch.
 *
 * The generic machinery lives in `@agoric/orchestration`; this module defines
 * the {@link YmaxObservationMessageSchema} and converts between its messages
 * and the application-level {@link PlanObservations}.
 *
 * This module has no runtime dependency on Endo, so that it can be used
 * outside of a locked-down (SES) environment, e.g. by the attestor. In
 * particular, the values it returns are not hardened.
 */

import type {
  TypedDataParameter,
  TypedDataToStructType,
} from '@agoric/orchestration/src/utils/abitype.js';
import {
  makeEIP712MessageKit,
  type EIP712MessageKit,
  type FullDomain,
  type EIP712MessageSchema,
  type OperationType,
  type StandaloneOperationData,
} from '@agoric/orchestration/src/utils/eip712-messages.ts';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.js';
import {
  isInterChainAccountRef,
  isInstrumentId,
  isPortfolioBalancePlaceRef,
} from './places.ts';
import type {
  PlanObservations,
  TypedHoldingDetail,
  PortfolioSyncState,
} from './types.ts';

// A param to designate the portfolio by its `portfolioId`
const PortfolioIdParam = {
  name: 'portfolio',
  type: 'uint256',
} as const satisfies TypedDataParameter;

const ObservationOperationTypes = {
  /**
   * The state of a portfolio and of the instruments relevant to it, as
   * observed at the portfolio's `syncState`.
   *
   * - syncState: the portfolio state the observations correspond to
   * - holdings: the balance of every balance-bearing place of the portfolio
   * - instruments: details of the instruments relevant to the portfolio
   */
  PortfolioObservations: [
    PortfolioIdParam,
    { name: 'syncState', type: 'SyncState' },
    { name: 'holdings', type: 'HoldingDetail[]' },
    { name: 'instruments', type: 'InstrumentDetail[]' },
  ],
} as const satisfies Record<string, readonly TypedDataParameter[]>;

const holdingDetailV1 = [
  { name: 'balanceUsdc', type: 'uint256' },
] as const satisfies TypedDataParameter[];

const holdingDetailV2 = [
  { name: 'kind', type: 'string' },
  { name: 'tokenAddress', type: 'address' },
  { name: 'amount', type: 'uint256' },
  /**
   * Valuation in micro-USD, or {@link VALUE_USD_UNKNOWN} if not observed.
   * Signed only to make room for that sentinel.
   */
  { name: 'valueUsd', type: 'int256' },
] as const satisfies TypedDataParameter[];

const ObservationSubTypes = {
  /** @see {@link PortfolioSyncState} */
  SyncState: [
    { name: 'policyVersion', type: 'uint64' },
    { name: 'rebalanceCount', type: 'uint64' },
  ],
  HoldingDetail: [
    /** a {@link PortfolioBalancePlaceRef} */
    { name: 'place', type: 'string' },
    ...holdingDetailV1.map(el => ({ ...el, optional: true as const })),
    ...holdingDetailV2.map(el => ({ ...el, optional: true as const })),
  ],
  InstrumentDetail: [
    /** an {@link InstrumentId} */
    { name: 'instrumentId', type: 'string' },
    /** in whole USD */
    { name: 'tvlUsd', type: 'uint256' },
  ],
} as const satisfies Record<string, readonly TypedDataParameter[]>;

/**
 * The schema of Ymax observation messages. The domain name intentionally
 * differs from the `Ymax` portfolio operations domain.
 */
export const YmaxObservationMessageSchema = {
  domainName: 'YmaxObservation',
  domainVersion: '1',
  operationTypes: ObservationOperationTypes,
  subTypes: ObservationSubTypes,
} as const satisfies EIP712MessageSchema;
export type YmaxObservationMessageSchema = typeof YmaxObservationMessageSchema;

export const ymaxObservationMessageKit: EIP712MessageKit<YmaxObservationMessageSchema> =
  makeEIP712MessageKit(YmaxObservationMessageSchema);

export type YmaxObservationFullDomain =
  FullDomain<YmaxObservationMessageSchema>;

/** The (normalized) data of a `PortfolioObservations` message. */
export type PortfolioObservationsEIP712 = OperationType<
  YmaxObservationMessageSchema,
  'PortfolioObservations'
>;

/** The data of a `PortfolioObservations` message, as accepted when authoring one. */
export type PortfolioObservationsEIP712Input = TypedDataToStructType<
  typeof ObservationOperationTypes & typeof ObservationSubTypes,
  'PortfolioObservations',
  'input'
>;

/** A standalone `PortfolioObservations` message, as signed by the attestor. */
export type PortfolioObservationsStandaloneData = StandaloneOperationData<
  YmaxObservationMessageSchema,
  'PortfolioObservations'
>;

export type SignedPortfolioObservations =
  WithSignature<PortfolioObservationsStandaloneData>;

/** The application-level content of a `PortfolioObservations` message. */
export type PortfolioObservationsContent = {
  portfolioId: number;
  syncState: PortfolioSyncState;
  observations: PlanObservations;
};

/**
 * EIP-712 cannot omit a field from only some instances of a struct type, so
 * typed holdings always carry `valueUsd` on the wire, using this sentinel for
 * an unknown valuation. The converters below translate it to and from an
 * absent `valueUsd` in {@link TypedHoldingDetail}; it never reaches
 * application data.
 */
export const VALUE_USD_UNKNOWN = -1n;

/** Largest valuation representable in the signed `int256` wire field. */
export const MAX_VALUE_USD = 2n ** 255n - 1n;

/** A `HoldingDetail` entry as it appears on the wire. */
type HoldingDetailEIP712Input =
  PortfolioObservationsEIP712Input['holdings'][number];

/** A typed holding as it appears on the (normalized) wire. */
type TypedHoldingDetailEIP712 = Omit<TypedHoldingDetail, 'valueUsd'> & {
  /** non-negative, or {@link VALUE_USD_UNKNOWN} */
  valueUsd: bigint;
};

/** Application -> wire: an absent valuation becomes the sentinel. */
const typedHoldingToEIP712 = ({
  place,
  kind,
  tokenAddress,
  amount,
  valueUsd,
  ...rest
}: TypedHoldingDetail): TypedHoldingDetailEIP712 => ({
  place,
  kind,
  tokenAddress,
  amount,
  valueUsd: valueUsd ?? VALUE_USD_UNKNOWN,
  // deprecated, and must be uniformly present or absent
  ...('balanceUsdc' in rest ? { balanceUsdc: rest.balanceUsdc } : {}),
});

/** Wire -> application: the sentinel (or an absent field) becomes absent. */
const typedHoldingFromEIP712 = ({
  valueUsd,
  ...rest
}: PortfolioObservationsEIP712['holdings'][number]): TypedHoldingDetail =>
  ({
    ...rest,
    ...(valueUsd === undefined || valueUsd === VALUE_USD_UNKNOWN
      ? {}
      : { valueUsd }),
  }) as TypedHoldingDetail;

const assertUint256 = (value: bigint, field: string): void => {
  if (typeof value !== 'bigint' || value < 0n || value >= 2n ** 256n) {
    throw RangeError(`invalid uint256 ${field}: ${String(value)}`);
  }
};

const toSafeNumber = (value: bigint, what: string): number => {
  assertUint256(value, what);
  // Negate the lte to prevent non-BigInt values from sneaking in.
  if (!(value <= BigInt(Number.MAX_SAFE_INTEGER))) {
    throw RangeError(`${JSON.stringify(what)} out of range: ${value}`);
  }
  return Number(value);
};

/** Validate identities and units without inventing valuations or holdings. */
const assertTypedHoldings: (
  holdings: readonly TypedHoldingDetail[],
) => asserts holdings is TypedHoldingDetail[] = holdings => {
  const identities = new Set<string>();
  for (const {
    place,
    kind,
    tokenAddress,
    amount,
    valueUsd,
    balanceUsdc,
  } of holdings) {
    if (!isPortfolioBalancePlaceRef(place)) {
      throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
    }
    const isNative =
      typeof kind === 'string' && kind.startsWith('$') && kind.length > 1;
    const isInstrument =
      kind === 'shares' || kind === 'principal' || kind === 'claimable-reward';
    const isAccountHolding =
      isNative || kind === 'token' || kind === 'claimed-reward';
    if (!isAccountHolding && !isInstrument) {
      throw TypeError(`invalid holding kind ${JSON.stringify(kind)}`);
    }
    if (
      isInstrument ? !isInstrumentId(place) : !isInterChainAccountRef(place)
    ) {
      throw TypeError(
        `holding kind ${kind} is incompatible with place ${place}`,
      );
    }
    if (
      typeof tokenAddress !== 'string' ||
      !/^0x[0-9a-fA-F]{40}$/.test(tokenAddress)
    ) {
      throw TypeError(`invalid holding token address ${String(tokenAddress)}`);
    }
    if (isNative !== /^0x0{40}$/i.test(tokenAddress)) {
      throw TypeError(`holding kind ${kind} has an incompatible token address`);
    }
    const identity = JSON.stringify([place, kind, tokenAddress.toLowerCase()]);
    if (identities.has(identity)) {
      throw TypeError(`duplicate holding identity ${identity}`);
    }
    identities.add(identity);
    assertUint256(amount, 'amount');
    if (
      valueUsd !== undefined &&
      (typeof valueUsd !== 'bigint' ||
        valueUsd < 0n ||
        valueUsd > MAX_VALUE_USD)
    ) {
      throw RangeError(`invalid valuation valueUsd: ${String(valueUsd)}`);
    }
    if (balanceUsdc !== undefined) {
      assertUint256(balanceUsdc, 'balanceUsdc');
    }
  }
};

/**
 * Transitional: derive legacy per-place `balances` from the deprecated
 * `balanceUsdc` of typed holdings, summed per place, so consumers of
 * `balances` keep working when producers switch to typed holdings. Producers
 * put the legacy place balance on one holding per place and `0n` on the
 * others. Never derived from `valueUsd`. Empty if the holdings omit
 * `balanceUsdc` (EIP-712 requires it on all of them or none).
 */
const balancesFromTypedHoldings = (
  holdings: readonly TypedHoldingDetail[],
): PlanObservations['balances'] => {
  const balances: PlanObservations['balances'] = {};
  for (const { place, balanceUsdc } of holdings) {
    if (balanceUsdc !== undefined) {
      balances[place] = (balances[place] ?? 0n) + balanceUsdc;
    }
  }
  for (const [place, balance] of Object.entries(balances)) {
    assertUint256(balance, `balanceUsdc sum for ${place}`);
  }
  return balances;
};

/**
 * Author either legacy balances or typed holdings using the shared schema.
 * Typed holdings always carry `valueUsd`, with {@link VALUE_USD_UNKNOWN}
 * standing for an absent valuation. With typed holdings, `balances` may only
 * repeat what their `balanceUsdc` values derive (as decoding returns), so no
 * balance is silently dropped.
 */
export const portfolioObservationsToEIP712 = ({
  portfolioId,
  syncState,
  observations: { balances, holdings, instrumentTvls },
}: PortfolioObservationsContent): PortfolioObservationsEIP712Input => {
  for (const [field, value] of Object.entries({
    portfolio: portfolioId,
    ...syncState,
  })) {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw RangeError(`${field} out of range: ${value}`);
    }
  }
  if (holdings !== undefined) {
    assertTypedHoldings(holdings);
    const derived = balancesFromTypedHoldings(holdings);
    const given = Object.entries(balances).filter(([, v]) => v !== undefined);
    if (
      given.length > 0 &&
      (given.length !== Object.keys(derived).length ||
        given.some(([place, v]) => derived[place] !== v))
    ) {
      throw TypeError(
        'aggregate balances must match the balanceUsdc of typed holdings',
      );
    }
  }
  const legacy: HoldingDetailEIP712Input[] = Object.entries(balances).flatMap(
    ([place, balanceUsdc]) => {
      if (balanceUsdc === undefined) {
        return [];
      }
      if (!isPortfolioBalancePlaceRef(place)) {
        throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
      }
      assertUint256(balanceUsdc, 'balanceUsdc');
      return [{ place, balanceUsdc }];
    },
  );
  const instruments = Object.entries(instrumentTvls).flatMap(
    ([instrumentId, tvl]) => {
      if (tvl === undefined) {
        return [];
      }
      if (!isInstrumentId(instrumentId)) {
        throw TypeError(`invalid instrument ${JSON.stringify(instrumentId)}`);
      }
      assertUint256(tvl.tvlUsd, 'tvlUsd');
      return [{ instrumentId, tvlUsd: tvl.tvlUsd }];
    },
  );
  return {
    portfolio: portfolioId,
    syncState: { ...syncState },
    holdings:
      holdings === undefined ? legacy : holdings.map(typedHoldingToEIP712),
    instruments,
  };
};

/**
 * Decode normalized authenticated observations. The handler must use
 * onUnknownSignedField: 'throw'. This converter does not verify signatures.
 * For typed holdings, `balances` is derived from their deprecated
 * `balanceUsdc` (see {@link balancesFromTypedHoldings}), never from `valueUsd`.
 * A typed holding's {@link VALUE_USD_UNKNOWN} valuation decodes to an absent
 * `valueUsd`.
 */
export const portfolioObservationsFromEIP712 = ({
  portfolio,
  syncState,
  holdings,
  instruments,
}: PortfolioObservationsEIP712): PortfolioObservationsContent => {
  const legacyBalances: PlanObservations['balances'] = {};
  const rawHoldings: TypedHoldingDetail[] = [];
  for (const holding of holdings) {
    const { place, balanceUsdc, kind, tokenAddress, amount } = holding;
    if (!isPortfolioBalancePlaceRef(place)) {
      throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
    }
    if (
      kind !== undefined ||
      tokenAddress !== undefined ||
      amount !== undefined
    ) {
      rawHoldings.push(typedHoldingFromEIP712(holding));
    } else {
      if (Object.hasOwn(legacyBalances, place)) {
        throw TypeError(`duplicate holding place ${JSON.stringify(place)}`);
      }
      assertUint256(balanceUsdc as bigint, 'balanceUsdc');
      legacyBalances[place] = balanceUsdc;
    }
  }
  // Uniform EIP-712 field presence already rules this out; fail closed anyway.
  if (rawHoldings.length && Object.keys(legacyBalances).length) {
    throw TypeError('cannot combine legacy balances with typed holdings');
  }
  assertTypedHoldings(rawHoldings);
  const balances = rawHoldings.length
    ? balancesFromTypedHoldings(rawHoldings)
    : legacyBalances;
  const instrumentTvls: PlanObservations['instrumentTvls'] = {};
  for (const { instrumentId, tvlUsd } of instruments) {
    if (!isInstrumentId(instrumentId)) {
      throw TypeError(`invalid instrument ${JSON.stringify(instrumentId)}`);
    }
    if (Object.hasOwn(instrumentTvls, instrumentId)) {
      throw TypeError(`duplicate instrument ${JSON.stringify(instrumentId)}`);
    }
    assertUint256(tvlUsd, 'tvlUsd');
    instrumentTvls[instrumentId] = { tvlUsd };
  }
  return {
    portfolioId: toSafeNumber(portfolio, 'portfolio'),
    syncState: {
      policyVersion: toSafeNumber(syncState.policyVersion, 'policyVersion'),
      rebalanceCount: toSafeNumber(syncState.rebalanceCount, 'rebalanceCount'),
    },
    observations: {
      balances,
      ...(rawHoldings.length ? { holdings: rawHoldings } : {}),
      instrumentTvls,
    },
  };
};
