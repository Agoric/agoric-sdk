import type {
  FundsFlowPlan,
  MovementDesc,
  SupportedChain,
} from '@agoric/portfolio-api';
import { chainOf } from '@agoric/portfolio-api/src/places.js';

/** cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/routes/gas.ts: /chains/gas API */
export type YdsChainGasState = {
  caip2Id: string;
  chainName: string;
  gasDenom: string;
  gasDenomScale: number;
  current: {
    latestScaledGasDenomPerGasUnit: number;
    takenAtSec: number;
  };
  windows: Array<{
    window: string;
    until: string;
    mean: number;
    p50: number;
    p90: number;
    sampleCount: number;
  }>;
  recent: Array<{
    takenAtSec: number;
    scaledGasDenomPerGasUnit: number;
  }>;
};

export type GasStateResponse = {
  message: 'Gas data retrieved successfully';
  data: YdsChainGasState[];
  timestamp: string;
};

const GAS_STATS_WINDOW = 'P30D';

export const makeFilterStepByGasStateV1 = (gasPrices: GasStateResponse) => {
  const filterByGasState = (
    chainGasState: YdsChainGasState,
    _chainName: SupportedChain,
  ): boolean => {
    const period = chainGasState.windows.find(
      // @ts-expect-error -- aspirational
      ({ duration }) => duration === GAS_STATS_WINDOW,
    );
    // @ts-expect-error -- aspirational
    return !!period && chainGasState.current.sampleUusd * 2 < period.p50Uusd * 3;
  };

  const gasStateByChainName = new Map<SupportedChain, YdsChainGasState>(
    gasPrices.data.map(chainGasState => [
      chainGasState.chainName as SupportedChain,
      chainGasState,
    ]),
  );
 
  const filterStep = (step: MovementDesc, _index: number): boolean => {
    const chainNames = chainNamesForStep(step);
    for (const chainName of chainNames) {
      const gasState = gasStateByChainName.get(chainName);
      if (gasState) return !!filterByGasState(gasState, chainName);
    }
    return false;
  };

  return harden(filterStep);
};

const isRecord = (data: unknown): data is Record<string, unknown> =>
  !!data && typeof data === 'object';

const hasNumberFields = (data: Record<string, unknown>, fields: string[]) =>
  fields.every(field => typeof data[field] === 'number');

const isChainGasState = (data: unknown): data is YdsChainGasState => {
  if (!isRecord(data)) return false;
  const { current, windows } = data;
  return (
    typeof data.caip2Id === 'string' &&
    typeof data.chainName === 'string' &&
    typeof data.gasDenom === 'string' &&
    typeof data.gasDenomScale === 'number' &&
    isRecord(current) &&
    hasNumberFields(current, [
      'sampleBaseFee',
      'samplePriorityFee',
      'sample',
      'sampleUusd',
      'usdPerGasDenom',
      'blockNumber',
      'blockTimestampSec',
      'takenAtSec',
    ]) &&
    Array.isArray(windows) &&
    windows.every(
      window =>
        isRecord(window) &&
        typeof window.duration === 'string' &&
        hasNumberFields(window, [
          'untilSec',
          'min',
          'mean',
          'p50',
          'p90',
          'max',
          'minUusd',
          'meanUusd',
          'p50Uusd',
          'p90Uusd',
          'maxUusd',
          'sampleCount',
        ]),
    )
  );
};

export const parseChainsGasResponse = (data: unknown): GasStateResponse => {
  if (
    !isRecord(data) ||
    data.message !== 'Gas data retrieved successfully' ||
    !Array.isArray(data.data) ||
    !data.data.every(isChainGasState) ||
    typeof data.timestamp !== 'string'
  ) {
    throw Error('unexpected /chains/gas response schema');
  }
  return data as GasStateResponse;
};

export const stringifyGasPrices = (gasPrices: GasStateResponse): string =>
  JSON.stringify(
    [...gasPrices.data].sort((a, b) => a.chainName.localeCompare(b.chainName)),
  );

const chainNamesForStep = ({ src, dest }: MovementDesc): SupportedChain[] => {
  const chainNames = [src, dest]
    .map(place => chainOf(place));
  return [...new Set(chainNames)];
};

const gasFavorableForStep = (
  gasStateByChainName: Map<string, YdsChainGasState>,
  step: MovementDesc,
): boolean => {
  const chainNames = chainNamesForStep(step);
  if (chainNames.length === 0) return true;

  for (const chainName of chainNames) {
    const gasState = gasStateByChainName.get(chainName);
    if (!gasState) continue;
    const p30d = gasState.windows.find(
      ({ window }) => window === GAS_STATS_WINDOW,
    );
    return (
      !!p30d &&
      gasState.current.latestScaledGasDenomPerGasUnit * 2 < p30d.p50 * 3
    );
  }
  return false;
};

const dependenciesFor = (plan: FundsFlowPlan, stepIndex: number): number[] => {
  if (!plan.order) {
    return stepIndex === 0 ? [] : [stepIndex - 1];
  }
  const entry = plan.order.find(([idx]) => idx === stepIndex);
  return entry?.[1] ?? [];
};

export const filterGasFavorablePlan = (
  plan: FundsFlowPlan,
  gasState: GasStateResponse,
): FundsFlowPlan => {
  const removed = new Set<number>();
  const gasStateByChainName = new Map(
    gasState.data.map(chainGasState => [
      chainGasState.chainName,
      chainGasState,
    ]),
  );
  for (let i = 0; i < plan.flow.length; i += 1) {
    if (!gasFavorableForStep(gasStateByChainName, plan.flow[i])) {
      removed.add(i);
    }
  }

  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < plan.flow.length; i += 1) {
      if (removed.has(i)) continue;
      if (dependenciesFor(plan, i).some(dep => removed.has(dep))) {
        removed.add(i);
        changed = true;
      }
    }
  }

  if (removed.size === 0) return plan;

  const oldToNew = new Map<number, number>();
  const flow = plan.flow.filter((_step, oldIndex) => {
    if (removed.has(oldIndex)) return false;
    oldToNew.set(oldIndex, oldToNew.size);
    return true;
  });
  const order = plan.order
    ?.flatMap(([oldIndex, oldPrerequisites]) => {
      const newIndex = oldToNew.get(oldIndex);
      if (newIndex === undefined) return [];
      const prerequisites = oldPrerequisites.flatMap(oldPrerequisite => {
        const newPrerequisite = oldToNew.get(oldPrerequisite);
        return newPrerequisite === undefined ? [] : [newPrerequisite];
      });
      return prerequisites.length ? ([[newIndex, prerequisites]] as const) : [];
    })
    .map(([idx, prerequisites]) => [idx, prerequisites] as [number, number[]]);
  return harden({ flow, order });
};
harden(filterGasFavorablePlan);
