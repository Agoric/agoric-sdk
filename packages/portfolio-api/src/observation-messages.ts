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
 * particular, the values it returns are not hardened, but they share no
 * state with the caller's: the converters validate a copy of their input.
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
import type { Address as EvmAddress } from 'abitype';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.js';
import { sameEvmAddress } from '@agoric/orchestration/src/utils/evm-address.js';
import {
  assertEvmAccountRef,
  isEvmChain,
  isInterChainAccountRef,
  isInstrumentId,
  isPortfolioBalancePlaceRef,
  maybeChainOf,
  getCanonicalHoldingKey,
} from './places.ts';
import type {
  MerklClaimEvidence,
  OneInchSwapInstructions,
  PlanObservations,
  SelectableObservations,
  TypedHoldingDetail,
  PortfolioSyncState,
  RewardClaimProtocol,
} from './types.ts';
import type { YieldProtocol } from './constants.js';

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
   * - aaveClaims, compoundClaims, merklClaims, oneInchSwaps: optional claim
   *   evidence and swap instructions, which plan steps select by index (see
   *   {@link SelectableObservations}), each present only when requested. As
   *   there is a single `PortfolioObservations` per message, their presence
   *   never conflicts.
   */
  PortfolioObservations: [
    PortfolioIdParam,
    { name: 'syncState', type: 'SyncState' },
    { name: 'holdings', type: 'HoldingDetail[]' },
    { name: 'instruments', type: 'InstrumentDetail[]' },
    { name: 'aaveClaims', type: 'AaveClaim[]', optional: true },
    { name: 'compoundClaims', type: 'CompoundClaim[]', optional: true },
    { name: 'merklClaims', type: 'MerklClaim[]', optional: true },
    { name: 'oneInchSwaps', type: 'OneInchSwap[]', optional: true },
  ],
} as const satisfies Record<string, readonly TypedDataParameter[]>;

const holdingDetailV1 = [
  { name: 'balanceUsdc', type: 'uint256' },
] as const satisfies TypedDataParameter[];

const holdingDetailV2 = [
  { name: 'kind', type: 'string' },
  { name: 'tokenId', type: 'string' },
  { name: 'amount', type: 'uint256' },
  /**
   * Valuation in micro-USD, or {@link VALUE_UUSD_UNKNOWN} if not observed.
   * Signed only to make room for that sentinel.
   */
  { name: 'valueUusd', type: 'int256' },
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
  // Every field of the selectable structs is required.
  /** @see {@link AaveClaimEvidence} */
  AaveClaim: [
    { name: 'instrumentId', type: 'string' },
    { name: 'tokenId', type: 'address' },
    { name: 'expectedAmount', type: 'uint256' },
  ],
  /** @see {@link CompoundClaimEvidence} */
  CompoundClaim: [
    { name: 'instrumentId', type: 'string' },
    { name: 'tokenId', type: 'address' },
    { name: 'expectedAmount', type: 'uint256' },
  ],
  /** @see {@link MerklClaimEvidence} */
  MerklClaim: [
    { name: 'accountPlace', type: 'string' },
    { name: 'distributor', type: 'address' },
    { name: 'tokenId', type: 'address' },
    { name: 'cumulativeAmount', type: 'uint256' },
    { name: 'claimedAmount', type: 'uint256' },
    { name: 'proofs', type: 'bytes32[]' },
  ],
  /** @see {@link OneInchSwapInstructions} */
  OneInchSwap: [
    { name: 'accountPlace', type: 'string' },
    { name: 'tokenIn', type: 'address' },
    { name: 'tokenOut', type: 'address' },
    { name: 'amountIn', type: 'uint256' },
    { name: 'quotedAmountOut', type: 'uint256' },
    { name: 'minAmountOut', type: 'uint256' },
    { name: 'slippageBps', type: 'uint16' },
    { name: 'expiresAt', type: 'uint64' },
    { name: 'flags', type: 'uint256' },
    { name: 'executor', type: 'address' },
    { name: 'srcReceiver', type: 'address' },
    { name: 'data', type: 'bytes' },
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
 * typed holdings always carry `valueUusd` on the wire, using this sentinel for
 * an unknown valuation. The converters below translate it to and from an
 * absent `valueUusd` in {@link TypedHoldingDetail}; it never reaches
 * application data.
 */
export const VALUE_UUSD_UNKNOWN = -1n;

/** Largest valuation representable in the signed `int256` wire field. */
export const MAX_VALUE_UUSD = 2n ** 255n - 1n;

/** A `HoldingDetail` entry as it appears on the wire. */
type HoldingDetailEIP712Input =
  PortfolioObservationsEIP712Input['holdings'][number];

/** A typed holding as it appears on the (normalized) wire. */
type TypedHoldingDetailEIP712 = Omit<TypedHoldingDetail, 'valueUusd'> & {
  /** non-negative, or {@link VALUE_UUSD_UNKNOWN} */
  valueUusd: bigint;
};

/** Application -> wire: an absent valuation becomes the sentinel. */
const typedHoldingToEIP712 = ({
  place,
  kind,
  tokenId,
  amount,
  valueUusd,
  ...rest
}: TypedHoldingDetail): TypedHoldingDetailEIP712 => ({
  place,
  kind,
  tokenId,
  amount,
  valueUusd: valueUusd ?? VALUE_UUSD_UNKNOWN,
  // deprecated, and must be uniformly present or absent
  ...(rest.balanceUsdc === undefined ? {} : { balanceUsdc: rest.balanceUsdc }),
});

/** Wire -> application: the sentinel (or an absent field) becomes absent. */
const typedHoldingFromEIP712 = ({
  valueUusd,
  ...rest
}: PortfolioObservationsEIP712['holdings'][number]): TypedHoldingDetail =>
  ({
    ...rest,
    ...(valueUusd === undefined || valueUusd === VALUE_UUSD_UNKNOWN
      ? {}
      : { valueUusd }),
  }) as TypedHoldingDetail;

/** A canonical (lowercase) EVM address. */
const LOWERCASE_EVM_ADDRESS_REGEX = /^0x[0-9a-f]{40}$/;
const ZERO_EVM_ADDRESS = `0x${'0'.repeat(40)}`;

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
    tokenId,
    amount,
    valueUusd,
    balanceUsdc,
    ...rest
  } of holdings) {
    const unknownFields = Object.keys(rest);
    if (unknownFields.length) {
      throw TypeError(`unknown holding fields: ${unknownFields.join(', ')}`);
    }
    if (!isPortfolioBalancePlaceRef(place)) {
      throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
    }
    const isNative =
      typeof kind === 'string' && kind.startsWith('$') && kind.length > 1;
    // A claimable reward may be attributed to an instrument, or only
    // to the account entitled to claim it (e.g. Merkl rewards).
    const isClaimableReward = kind === 'claimable-reward';
    const isInstrument =
      isClaimableReward || kind === 'shares' || kind === 'principal';
    const isAccountHolding =
      isClaimableReward ||
      isNative ||
      kind === 'token' ||
      kind === 'claimed-reward';
    if (!isAccountHolding && !isInstrument) {
      throw TypeError(`invalid holding kind ${JSON.stringify(kind)}`);
    }
    if (
      !(isInstrument && isInstrumentId(place)) &&
      !(isAccountHolding && isInterChainAccountRef(place))
    ) {
      throw TypeError(
        `holding kind ${kind} is incompatible with place ${place}`,
      );
    }
    const isEvmPlace = isEvmChain(maybeChainOf(place));
    // EIP-712 strings do not normalize addresses. Reject non-canonical hex
    // in signed data. Other chains retain their local identifiers, e.g. Cosmos
    // denoms or Solana mints. Identity keys canonicalize only EVM identifiers.
    if (
      typeof tokenId !== 'string' ||
      /\s/.test(tokenId) ||
      (!isNative && isEvmPlace && !LOWERCASE_EVM_ADDRESS_REGEX.test(tokenId))
    ) {
      throw TypeError(`invalid holding token identifier ${String(tokenId)}`);
    }
    if (
      isNative !== (tokenId === '') ||
      (isEvmPlace && /^0x0{40}$/.test(tokenId)) ||
      (isNative && !isEvmPlace)
    ) {
      throw TypeError(
        `holding kind ${kind} has an incompatible token identifier`,
      );
    }
    const holdingKey = getCanonicalHoldingKey({ place, kind, tokenId });
    if (identities.has(holdingKey)) {
      throw TypeError(`duplicate holding identity ${holdingKey}`);
    }
    identities.add(holdingKey);
    assertUint256(amount, 'amount');
    if (
      valueUusd !== undefined &&
      (typeof valueUusd !== 'bigint' ||
        valueUusd < 0n ||
        valueUusd > MAX_VALUE_UUSD)
    ) {
      throw RangeError(`invalid valuation valueUusd: ${String(valueUusd)}`);
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
 * others. Never derived from `valueUusd`. Empty if the holdings omit
 * `balanceUsdc` (EIP-712 requires it on all of them or none).
 */
const balancesFromTypedHoldings = (
  holdings: readonly TypedHoldingDetail[],
): PlanObservations['balances'] => {
  const balances = new Map<TypedHoldingDetail['place'], bigint>();
  for (const { place, balanceUsdc } of holdings) {
    if (balanceUsdc !== undefined) {
      balances.set(place, (balances.get(place) ?? 0n) + balanceUsdc);
    }
  }
  for (const [place, balance] of balances) {
    assertUint256(balance, `balanceUsdc sum for ${place}`);
  }
  return Object.fromEntries(balances);
};

/**
 * A deep copy of plain data (arrays, records and primitives), so that what is
 * validated cannot then be changed through references the caller retains.
 * Rejects anything else (e.g. a `Uint8Array`), which the converters' types
 * never declare.
 */
const copyPlainData = <T>(value: T): T => {
  if (Array.isArray(value)) return value.map(copyPlainData) as T;
  if (typeof value === 'function') {
    throw TypeError('expected plain data, got a function');
  }
  if (value !== null && typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) {
      throw TypeError(
        `expected plain data, got ${Object.prototype.toString.call(value)}`,
      );
    }
    return Object.fromEntries(
      Object.entries(value).map(([k, v]) => [k, copyPlainData(v)]),
    ) as T;
  }
  return value;
};

/**
 * Signed selectable observations, before {@link pickSelectableObservations}
 * narrows them. The EIP-712 layer checks primitive types and ranges (and, when
 * decoding, rejects missing or unknown fields); only application constraints
 * are checked here.
 */
type SelectableObservationsEIP712 = Pick<
  PortfolioObservationsEIP712,
  keyof SelectableObservations
>;
type SelectableObservationEIP712<K extends keyof SelectableObservations> =
  NonNullable<SelectableObservationsEIP712[K]>[number];

/**
 * Addresses in selectable observations are EIP-712 `address` values, whose
 * hashing ignores case (unlike holding token identifiers, which are strings),
 * so they may be lowercase or EIP-55 checksummed. Like the EIP-712 layer, this
 * does not verify checksums, which signing does. Compare them with
 * {@link sameEvmAddress}, or lowercase them for keys.
 */
const assertNonZeroAddress = (
  value: EvmAddress,
  label: string,
  field: string,
): void => {
  if (value === ZERO_EVM_ADDRESS) {
    throw TypeError(`[${label}] invalid ${field} address ${value}`);
  }
};

/**
 * For each reward claim protocol, the array of {@link SelectableObservations}
 * holding its evidence, and for those whose evidence is attributed to an
 * instrument, the yield protocol of the instruments it may name. Merkl
 * evidence is account-scoped instead.
 */
export const rewardClaimProtocols = Object.freeze({
  aave: Object.freeze({ evidenceKey: 'aaveClaims', yieldProtocol: 'Aave' }),
  compound: Object.freeze({
    evidenceKey: 'compoundClaims',
    yieldProtocol: 'Compound',
  }),
  merkl: Object.freeze({ evidenceKey: 'merklClaims' }),
} as const satisfies Record<
  RewardClaimProtocol,
  { evidenceKey: keyof SelectableObservations; yieldProtocol?: YieldProtocol }
>);

/** Reward claim protocols whose evidence is attributed to an instrument. */
export type InstrumentClaimProtocol = {
  [P in RewardClaimProtocol]: (typeof rewardClaimProtocols)[P] extends {
    yieldProtocol: YieldProtocol;
  }
    ? P
    : never;
}[RewardClaimProtocol];

/**
 * Validate instrument-attributed claims, whose instrument must be of the
 * claim's protocol, on an EVM chain.
 */
const assertInstrumentClaims: <P extends InstrumentClaimProtocol>(
  claims: readonly SelectableObservationEIP712<
    (typeof rewardClaimProtocols)[P]['evidenceKey']
  >[],
  protocol: P,
) => asserts claims is NonNullable<
  SelectableObservations[(typeof rewardClaimProtocols)[P]['evidenceKey']]
> = (claims, protocol) => {
  const { evidenceKey: key, yieldProtocol } = rewardClaimProtocols[protocol];
  const identities = new Set<string>();
  claims.forEach(({ instrumentId, tokenId }, i) => {
    const label = `${key}[${i}]`;
    if (
      !isInstrumentId(instrumentId) ||
      !instrumentId.startsWith(`${yieldProtocol}_`) ||
      !isEvmChain(maybeChainOf(instrumentId))
    ) {
      throw TypeError(
        `[${label}] invalid ${yieldProtocol} instrument ${JSON.stringify(instrumentId)}`,
      );
    }
    assertNonZeroAddress(tokenId, label, 'token');
    const identity = JSON.stringify([instrumentId, tokenId.toLowerCase()]);
    if (identities.has(identity)) {
      throw TypeError(`[${label}] duplicate ${identity}`);
    }
    identities.add(identity);
  });
};

/**
 * The estimated incremental payout of a Merkl claim: its cumulative
 * entitlement less what was observed to be claimed already. Not guaranteed,
 * since the distributor uses its own claimed state at execution time.
 *
 * @param claim
 * @throws {RangeError} if more was claimed than the cumulative entitlement
 */
export const getMerklClaimExpectedAmount = ({
  cumulativeAmount,
  claimedAmount,
}: Pick<MerklClaimEvidence, 'cumulativeAmount' | 'claimedAmount'>): bigint => {
  if (claimedAmount > cumulativeAmount) {
    throw RangeError(
      `claimedAmount ${claimedAmount} exceeds cumulativeAmount ${cumulativeAmount}`,
    );
  }
  return cumulativeAmount - claimedAmount;
};

const assertMerklClaims: (
  claims: readonly SelectableObservationEIP712<'merklClaims'>[],
) => asserts claims is MerklClaimEvidence[] = claims => {
  const identities = new Set<string>();
  claims.forEach((claim, i) => {
    const label = `merklClaims[${i}]`;
    const { accountPlace, distributor, tokenId } = claim;
    assertEvmAccountRef(accountPlace, label);
    assertNonZeroAddress(distributor, label, 'distributor');
    assertNonZeroAddress(tokenId, label, 'token');
    try {
      getMerklClaimExpectedAmount(claim);
    } catch (err) {
      throw RangeError(`[${label}] ${(err as Error).message}`);
    }
    const identity = JSON.stringify([
      accountPlace,
      distributor.toLowerCase(),
      tokenId.toLowerCase(),
    ]);
    if (identities.has(identity)) {
      throw TypeError(`[${label}] duplicate ${identity}`);
    }
    identities.add(identity);
  });
};

/**
 * Validate the structure of swap instructions. Whether they are acceptable
 * (their tokens, slippage, flags or expiry) is for its consumer to decide.
 */
const assertOneInchSwaps: (
  swaps: readonly SelectableObservationEIP712<'oneInchSwaps'>[],
) => asserts swaps is OneInchSwapInstructions[] = swaps => {
  swaps.forEach((swap, i) => {
    const label = `oneInchSwaps[${i}]`;
    const { accountPlace, tokenIn, tokenOut, amountIn, slippageBps } = swap;
    assertEvmAccountRef(accountPlace, label);
    // The route's executor and srcReceiver may be the zero address,
    // but tokens may not be.
    assertNonZeroAddress(tokenIn, label, 'tokenIn');
    assertNonZeroAddress(tokenOut, label, 'tokenOut');
    if (sameEvmAddress(tokenIn, tokenOut)) {
      throw TypeError(`[${label}] tokenIn and tokenOut must differ`);
    }
    if (amountIn === 0n) {
      throw RangeError(`[${label}] amountIn must be positive`);
    }
    if (swap.minAmountOut > swap.quotedAmountOut) {
      throw RangeError(`[${label}] minAmountOut exceeds quotedAmountOut`);
    }
    if (slippageBps > 10_000) {
      throw RangeError(`[${label}] invalid slippageBps: ${slippageBps}`);
    }
  });
};

/**
 * Pick the arrays present in `source`, validated. An absent array remains
 * absent, distinct from an empty one.
 */
const pickSelectableObservations = ({
  aaveClaims,
  compoundClaims,
  merklClaims,
  oneInchSwaps,
}: SelectableObservationsEIP712): SelectableObservations => {
  if (aaveClaims) assertInstrumentClaims(aaveClaims, 'aave');
  if (compoundClaims) assertInstrumentClaims(compoundClaims, 'compound');
  if (merklClaims) assertMerklClaims(merklClaims);
  if (oneInchSwaps) assertOneInchSwaps(oneInchSwaps);
  return {
    ...(aaveClaims && { aaveClaims }),
    ...(compoundClaims && { compoundClaims }),
    ...(merklClaims && { merklClaims }),
    ...(oneInchSwaps && { oneInchSwaps }),
  };
};

/**
 * Author either legacy balances or typed holdings using the shared schema.
 * Typed holdings always carry `valueUusd`, with {@link VALUE_UUSD_UNKNOWN}
 * standing for an absent valuation. With typed holdings, `balances` may only
 * repeat what their `balanceUsdc` values derive (as decoding returns), so no
 * balance is silently dropped.
 */
export const portfolioObservationsToEIP712 = (
  content: PortfolioObservationsContent,
): PortfolioObservationsEIP712Input => {
  const {
    portfolioId,
    syncState,
    observations: { balances, holdings, instrumentTvls, ...rest },
  } = copyPlainData(content);
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
  const selectable = pickSelectableObservations(rest);
  return {
    portfolio: portfolioId,
    syncState,
    holdings:
      holdings === undefined ? legacy : holdings.map(typedHoldingToEIP712),
    instruments,
    ...(selectable as Pick<
      PortfolioObservationsEIP712Input,
      keyof SelectableObservations
    >),
  };
};

/**
 * Decode normalized authenticated observations. The handler must use
 * onUnknownSignedField: 'throw'. This converter does not verify signatures.
 * For typed holdings, `balances` is derived from their deprecated
 * `balanceUsdc` (see {@link balancesFromTypedHoldings}), never from `valueUusd`.
 * A typed holding's {@link VALUE_UUSD_UNKNOWN} valuation decodes to an absent
 * `valueUusd`.
 */
export const portfolioObservationsFromEIP712 = (
  message: PortfolioObservationsEIP712,
): PortfolioObservationsContent => {
  const { portfolio, syncState, holdings, instruments, ...rest } =
    copyPlainData(message);
  const legacyBalances: PlanObservations['balances'] = {};
  const rawHoldings: TypedHoldingDetail[] = [];
  for (const holding of holdings) {
    const { place, balanceUsdc, kind, tokenId, amount, valueUusd } = holding;
    if (!isPortfolioBalancePlaceRef(place)) {
      throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
    }
    // Any typed field makes this a typed holding, validated as a whole, so a
    // partial hybrid is rejected rather than having signed fields dropped.
    if (
      kind !== undefined ||
      tokenId !== undefined ||
      amount !== undefined ||
      valueUusd !== undefined
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
  // Other fields (e.g. the standalone envelope) are the handler's concern.
  const selectable = pickSelectableObservations(rest);
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
      ...selectable,
    },
  };
};
