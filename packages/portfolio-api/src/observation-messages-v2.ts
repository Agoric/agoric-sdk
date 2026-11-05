/**
 * Signed typed holdings, with raw quantities independent of valuation.
 * Version 1 remains available from observation-messages.ts for numeric plans.
 * This module is also usable without SES or runtime Endo dependencies.
 */
import type {
  TypedDataParameter,
  TypedDataToStructType,
} from '@agoric/orchestration/src/utils/abitype.js';
import {
  makeEIP712MessageKit,
  type EIP712MessageSchema,
  type OperationType,
  type StandaloneOperationData,
} from '@agoric/orchestration/src/utils/eip712-messages.ts';
import type { WithSignature } from '@agoric/orchestration/src/utils/viem.js';
import { optUint255, assertOptUint255 } from './opt-uint-core.ts';
import {
  isInstrumentId,
  isInterChainAccountRef,
  isPortfolioBalancePlaceRef,
} from './places.ts';
import type {
  HoldingDetail,
  PlanObservationsV2,
  PortfolioSyncState,
} from './types.ts';

export {
  OPT_UINT_UNDEFINED,
  optUint255,
  maxOptUint255,
  assertOptUint255,
} from './opt-uint-core.ts';

const operationTypes = {
  PortfolioObservations: [
    { name: 'portfolio', type: 'uint256' },
    { name: 'syncState', type: 'SyncState' },
    { name: 'holdings', type: 'HoldingDetail[]' },
    { name: 'instruments', type: 'InstrumentDetail[]' },
  ],
} as const satisfies Record<string, readonly TypedDataParameter[]>;

const subTypes = {
  SyncState: [
    { name: 'policyVersion', type: 'uint64' },
    { name: 'rebalanceCount', type: 'uint64' },
  ],
  HoldingDetail: [
    { name: 'place', type: 'string' },
    { name: 'balanceUsdc', type: optUint255, optional: true },
    /** Valuation in micro-USD, `OPT_UINT_UNDEFINED` if not observed. */
    { name: 'valueUsd', type: optUint255 },
    { name: 'kind', type: 'string' },
    { name: 'tokenAddress', type: 'address' },
    { name: 'amount', type: 'uint256' },
  ],
  InstrumentDetail: [
    { name: 'instrumentId', type: 'string' },
    { name: 'tvlUsd', type: 'uint256' },
  ],
} as const satisfies Record<string, readonly TypedDataParameter[]>;

/** Opt-in schema: deploy verifier support before enabling version 2 producers. */
export const YmaxObservationMessageSchemaV2 = {
  domainName: 'YmaxObservation',
  domainVersion: '2',
  operationTypes,
  subTypes,
} as const satisfies EIP712MessageSchema;
export type YmaxObservationMessageSchemaV2 =
  typeof YmaxObservationMessageSchemaV2;

export const ymaxObservationMessageKitV2 = makeEIP712MessageKit(
  YmaxObservationMessageSchemaV2,
);

export type PortfolioObservationsEIP712V2 = OperationType<
  YmaxObservationMessageSchemaV2,
  'PortfolioObservations'
>;
export type PortfolioObservationsEIP712InputV2 = TypedDataToStructType<
  typeof operationTypes & typeof subTypes,
  'PortfolioObservations',
  'input'
>;
export type SignedPortfolioObservationsV2 = WithSignature<
  StandaloneOperationData<
    YmaxObservationMessageSchemaV2,
    'PortfolioObservations'
  >
>;

export type PortfolioObservationsContentV2 = {
  portfolioId: number;
  syncState: PortfolioSyncState;
  observations: PlanObservationsV2;
};

const assertUint256 = (value: bigint, field: string): void => {
  if (typeof value !== 'bigint' || value < 0n || value >= 2n ** 256n) {
    throw RangeError(`invalid uint256 ${field}: ${String(value)}`);
  }
};

const safeNumber = (value: bigint, field: string): number => {
  assertUint256(value, field);
  if (value > BigInt(Number.MAX_SAFE_INTEGER)) {
    throw RangeError(`${field} out of range: ${value}`);
  }
  return Number(value);
};

/** Validate identity and units without inventing valuations or missing holdings. */
const copyHoldings = (holdings: readonly HoldingDetail[]): HoldingDetail[] => {
  const identities = new Set<string>();
  const deprecatedValuationFields = ['balanceUsdc'] as const;
  for (const field of deprecatedValuationFields) {
    if (
      holdings.some(h => h[field] !== undefined) &&
      holdings.some(h => h[field] === undefined)
    ) {
      throw TypeError(`inconsistent ${field} presence in HoldingDetail[]`);
    }
  }
  return holdings.map(
    ({ place, kind, tokenAddress, amount, valueUsd, balanceUsdc }) => {
      if (!isPortfolioBalancePlaceRef(place)) {
        throw TypeError(`invalid holding place ${JSON.stringify(place)}`);
      }
      const isNative =
        typeof kind === 'string' && kind.startsWith('$') && kind.length > 1;
      const isInstrument =
        kind === 'shares' || kind === 'principal' || kind === 'reward';
      if (!isNative && !isInstrument && kind !== 'token') {
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
        throw TypeError(
          `invalid holding token address ${String(tokenAddress)}`,
        );
      }
      const isZeroAddress = /^0x0{40}$/i.test(tokenAddress);
      if (isNative !== isZeroAddress) {
        throw TypeError(
          `holding kind ${kind} has an incompatible token address`,
        );
      }
      const identity = JSON.stringify([
        place,
        kind,
        tokenAddress.toLowerCase(),
      ]);
      if (identities.has(identity)) {
        throw TypeError(`duplicate holding identity ${identity}`);
      }
      identities.add(identity);
      assertUint256(amount, 'amount');
      assertOptUint255(valueUsd, 'valueUsd');
      if (balanceUsdc !== undefined)
        assertOptUint255(balanceUsdc, 'balanceUsdc');
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

/** Author version 2 observations with independent per-holding valuations. */
export const portfolioObservationsToEIP712V2 = ({
  portfolioId,
  syncState,
  observations: { holdings, instrumentTvls },
}: PortfolioObservationsContentV2): PortfolioObservationsEIP712InputV2 => {
  // Validate the same application bounds when producing and consuming evidence.
  safeNumber(BigInt(portfolioId), 'portfolio');
  safeNumber(BigInt(syncState.policyVersion), 'policyVersion');
  safeNumber(BigInt(syncState.rebalanceCount), 'rebalanceCount');
  const instruments = Object.entries(instrumentTvls).flatMap(
    ([instrumentId, tvl]) => {
      if (tvl === undefined) return [];
      if (!isInstrumentId(instrumentId))
        throw TypeError(`invalid instrument ${instrumentId}`);
      assertUint256(tvl.tvlUsd, 'tvlUsd');
      return [{ instrumentId, tvlUsd: tvl.tvlUsd }];
    },
  );
  return {
    portfolio: portfolioId,
    syncState: { ...syncState },
    holdings: copyHoldings(holdings),
    instruments,
  };
};

/**
 * Decode normalized, authenticated v2 data. The handler must use
 * onUnknownSignedField: 'throw'; this conversion does not verify signatures.
 * No aggregate balances are derived: unavailable valuation is not zero.
 */
export const portfolioObservationsFromEIP712V2 = ({
  portfolio,
  syncState,
  holdings,
  instruments,
}: PortfolioObservationsEIP712V2): PortfolioObservationsContentV2 => {
  const instrumentTvls: PlanObservationsV2['instrumentTvls'] = {};
  for (const { instrumentId, tvlUsd } of instruments) {
    if (!isInstrumentId(instrumentId))
      throw TypeError(`invalid instrument ${instrumentId}`);
    if (Object.hasOwn(instrumentTvls, instrumentId)) {
      throw TypeError(`duplicate instrument ${instrumentId}`);
    }
    assertUint256(tvlUsd, 'tvlUsd');
    instrumentTvls[instrumentId] = { tvlUsd };
  }
  return {
    portfolioId: safeNumber(portfolio, 'portfolio'),
    syncState: {
      policyVersion: safeNumber(syncState.policyVersion, 'policyVersion'),
      rebalanceCount: safeNumber(syncState.rebalanceCount, 'rebalanceCount'),
    },
    observations: {
      holdings: copyHoldings(holdings as HoldingDetail[]),
      instrumentTvls,
    },
  };
};
