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
import { Fail, q } from '@endo/errors';
import type { InstrumentId } from './instruments.js';
import { isInstrumentId } from './places.ts';
import { isPortfolioBalancePlaceRef } from './type-guards.ts';
import type {
  PlanObservations,
  PortfolioBalancePlaceRef,
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

const ObservationSubTypes = {
  /** @see {@link PortfolioSyncState} */
  SyncState: [
    { name: 'policyVersion', type: 'uint64' },
    { name: 'rebalanceCount', type: 'uint64' },
  ],
  HoldingDetail: [
    /** a {@link PortfolioBalancePlaceRef} */
    { name: 'place', type: 'string' },
    /** in micro-USDC (6 decimal places) */
    { name: 'balanceUsdc', type: 'uint256' },
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

const toSafeNumber = (value: bigint, what: string): number => {
  value <= BigInt(Number.MAX_SAFE_INTEGER) ||
    Fail`${q(what)} out of range: ${value}`;
  return Number(value);
};

/**
 * Convert the content of a portfolio observation to the data of a
 * `PortfolioObservations` message, e.g. for the attestor to sign.
 *
 * @param observation
 */
export const portfolioObservationsToEIP712 = ({
  portfolioId,
  syncState: { policyVersion, rebalanceCount },
  observations: { balances, instrumentTvls },
}: PortfolioObservationsContent): PortfolioObservationsEIP712Input =>
  harden({
    portfolio: portfolioId,
    syncState: { policyVersion, rebalanceCount },
    holdings: Object.entries(balances).flatMap(([place, balanceUsdc]) =>
      balanceUsdc === undefined ? [] : [{ place, balanceUsdc }],
    ),
    instruments: Object.entries(instrumentTvls).flatMap(
      ([instrumentId, tvl]) =>
        tvl === undefined ? [] : [{ instrumentId, tvlUsd: tvl.tvlUsd }],
    ),
  });

/**
 * Convert the data of a signed `PortfolioObservations` message to its
 * application-level content.
 *
 * Expects the data as extracted by `makeEIP712MessageHandlerUtils` with
 * `onUnknownSignedField: 'throw'`, i.e. normalized and without fields this
 * version does not understand. Fails closed: rejects places or instruments
 * that are invalid or listed more than once, and values out of range.
 *
 * @param data
 */
export const portfolioObservationsFromEIP712 = ({
  portfolio,
  syncState,
  holdings,
  instruments,
}: PortfolioObservationsEIP712): PortfolioObservationsContent => {
  const balances: Partial<Record<PortfolioBalancePlaceRef, bigint>> = {};
  for (const { place, balanceUsdc } of holdings) {
    isPortfolioBalancePlaceRef(place) ||
      Fail`invalid holding place ${q(place)}`;
    !Object.hasOwn(balances, place) ||
      Fail`duplicate holding place ${q(place)}`;
    balances[place] = balanceUsdc;
  }

  const instrumentTvls: PlanObservations['instrumentTvls'] = {};
  for (const { instrumentId, tvlUsd } of instruments) {
    isInstrumentId(instrumentId) || Fail`invalid instrument ${q(instrumentId)}`;
    !Object.hasOwn(instrumentTvls, instrumentId) ||
      Fail`duplicate instrument ${q(instrumentId)}`;
    instrumentTvls[instrumentId as InstrumentId] = { tvlUsd };
  }

  return harden({
    portfolioId: toSafeNumber(portfolio, 'portfolio'),
    syncState: {
      policyVersion: toSafeNumber(syncState.policyVersion, 'policyVersion'),
      rebalanceCount: toSafeNumber(syncState.rebalanceCount, 'rebalanceCount'),
    },
    observations: { balances, instrumentTvls },
  });
};
