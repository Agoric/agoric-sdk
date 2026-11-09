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

import {
  minSignedBigInt,
  maxSignedBigInt,
  type TypedDataParameter,
  type TypedDataToStructType,
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
  /** Valuation in micro-USD, `undefined` if not observed. */
  {
    name: 'valueUsd',
    type: 'int256',
    optSentinel: minSignedBigInt(256n), // how to encode the `undefined` value
  },
] as const satisfies TypedDataParameter[];

const holdingDetailV2 = [
  { name: 'kind', type: 'string' },
  { name: 'tokenAddress', type: 'address' },
  { name: 'amount', type: 'uint256' },
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

const assertUint256 = (value: bigint, field: string): void => {
  if (typeof value !== 'bigint' || value < 0n || value >= 2n ** 256n) {
    throw RangeError(`invalid uint256 ${field}: ${String(value)}`);
  }
};

const toSafeNumber = (value: bigint, what: string): number => {
  assertUint256(value, what);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw RangeError(`${JSON.stringify(what)} out of range: ${value}`);
  }
  return Number(value);
};

/** Validate identities and units without inventing valuations or holdings. */
const copyHoldings = (
  holdings: readonly TypedHoldingDetail[],
): TypedHoldingDetail[] => {
  const identities = new Set<string>();
  return holdings.map(
    ({ place, kind, tokenAddress, amount, valueUsd, balanceUsdc }) => {
      if (!isPortfolioBalancePlaceRef(place))
        throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
      const isNative =
        typeof kind === 'string' && kind.startsWith('$') && kind.length > 1;
      const isInstrument =
        kind === 'shares' || kind === 'principal' || kind === 'reward';
      if (!isNative && !isInstrument && kind !== 'token')
        throw TypeError(`invalid holding kind ${JSON.stringify(kind)}`);
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
        throw TypeError(
          `invalid holding token address ${String(tokenAddress)}`,
        );
      }
      if (isNative !== /^0x0{40}$/i.test(tokenAddress))
        throw TypeError(
          `holding kind ${kind} has an incompatible token address`,
        );
      const identity = JSON.stringify([
        place,
        kind,
        tokenAddress.toLowerCase(),
      ]);
      if (identities.has(identity))
        throw TypeError(`duplicate holding identity ${identity}`);
      identities.add(identity);
      assertUint256(amount, 'amount');
      if (valueUsd === minSignedBigInt(256n)) valueUsd = undefined;
      if (
        valueUsd !== undefined &&
        (typeof valueUsd !== 'bigint' ||
          valueUsd < 0n ||
          valueUsd > maxSignedBigInt(256n))
      ) {
        throw RangeError(`invalid valuation valueUsd: ${String(valueUsd)}`);
      }
      if (balanceUsdc !== undefined) assertUint256(balanceUsdc, 'balanceUsdc');
      return {
        place,
        kind,
        tokenAddress,
        amount,
        valueUsd,
        ...(balanceUsdc === undefined ? {} : { balanceUsdc }),
      };
    },
  );
};

/** Author either legacy balances or typed holdings using the shared schema. */
export const portfolioObservationsToEIP712 = ({
  portfolioId,
  syncState,
  observations: { balances, holdings, instrumentTvls },
}: PortfolioObservationsContent): PortfolioObservationsEIP712Input => {
  for (const [field, value] of Object.entries({
    portfolio: portfolioId,
    ...syncState,
  })) {
    if (!Number.isSafeInteger(value) || value < 0)
      throw RangeError(`${field} out of range: ${value}`);
  }
  if (
    holdings !== undefined &&
    Object.values(balances).some(value => value !== undefined)
  ) {
    throw TypeError('cannot combine aggregate balances with typed holdings');
  }
  const legacy = Object.entries(balances).flatMap(([place, balanceUsdc]) => {
    if (balanceUsdc === undefined) return [];
    if (!isPortfolioBalancePlaceRef(place))
      throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
    assertUint256(balanceUsdc, 'balanceUsdc');
    return [{ place, balanceUsdc }];
  });
  const instruments = Object.entries(instrumentTvls).flatMap(
    ([instrumentId, tvl]) => {
      if (tvl === undefined) return [];
      if (!isInstrumentId(instrumentId))
        throw TypeError(`invalid instrument ${JSON.stringify(instrumentId)}`);
      assertUint256(tvl.tvlUsd, 'tvlUsd');
      return [{ instrumentId, tvlUsd: tvl.tvlUsd }];
    },
  );
  return {
    portfolio: portfolioId,
    syncState: { ...syncState },
    holdings: holdings === undefined ? legacy : copyHoldings(holdings),
    instruments,
  };
};

/**
 * Decode normalized authenticated observations. The handler must use
 * onUnknownSignedField: 'throw'. This converter does not verify signatures.
 * Raw holding valuations never imply aggregate balances.
 */
export const portfolioObservationsFromEIP712 = ({
  portfolio,
  syncState,
  holdings,
  instruments,
}: PortfolioObservationsEIP712): PortfolioObservationsContent => {
  const balances: PlanObservations['balances'] = {};
  const rawHoldings: TypedHoldingDetail[] = [];
  for (const holding of holdings) {
    const { place, balanceUsdc, kind, tokenAddress, amount } = holding;
    if (!isPortfolioBalancePlaceRef(place))
      throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
    if (
      kind !== undefined ||
      tokenAddress !== undefined ||
      amount !== undefined
    ) {
      rawHoldings.push(holding as TypedHoldingDetail);
    } else {
      if (Object.hasOwn(balances, place))
        throw TypeError(`duplicate holding place ${JSON.stringify(place)}`);
      assertUint256(balanceUsdc as bigint, 'balanceUsdc');
      balances[place] = balanceUsdc;
    }
  }
  if (rawHoldings.length && Object.keys(balances).length)
    throw TypeError('cannot combine aggregate balances with typed holdings');
  const instrumentTvls: PlanObservations['instrumentTvls'] = {};
  for (const { instrumentId, tvlUsd } of instruments) {
    if (!isInstrumentId(instrumentId))
      throw TypeError(`invalid instrument ${JSON.stringify(instrumentId)}`);
    if (Object.hasOwn(instrumentTvls, instrumentId))
      throw TypeError(`duplicate instrument ${JSON.stringify(instrumentId)}`);
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
      ...(rawHoldings.length ? { holdings: copyHoldings(rawHoldings) } : {}),
      instrumentTvls,
    },
  };
};
