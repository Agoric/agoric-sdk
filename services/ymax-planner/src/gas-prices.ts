import type {
  FundsFlowPlan,
  MovementDesc,
  SupportedChain as EverySupportedChain,
} from '@agoric/portfolio-api';
import { chainOf } from '@agoric/portfolio-api/src/places.js';

/** cf. https://github.com/Agoric/ymax-web/blob/main/yds/src/routes/gas.ts: /chains/gas API */
export type YdsChainGasState = {
  caip2Id: string;
  chainName: string;
  gasDenom: string;
  gasDenomScale: number;
  current: {
    sampleBaseFee: number;
    samplePriorityFee: number;
    sample: number;
    sampleUusd: number;
    usdPerGasDenom: number;
    blockNumber: number;
    blockTimestampSec: number;
    takenAtSec: number;
  };
  windows: Array<{
    duration: string;
    untilSec: number;
    min: number;
    mean: number;
    p50: number;
    p90: number;
    max: number;
    minUusd: number;
    meanUusd: number;
    p50Uusd: number;
    p90Uusd: number;
    maxUusd: number;
    sampleCount: number;
  }>;
};

export type YdsGasStateResponse = {
  message: 'Gas data retrieved successfully';
  data: YdsChainGasState[];
  timestamp: string;
};

/** It would be better to detect chain support dynamically within the moves. */
export const unsupportedChainNames = ['agoric', 'noble'] as const;
export type SupportedChain = Exclude<
  EverySupportedChain,
  (typeof unsupportedChainNames)[number]
>;

const GAS_STATS_WINDOW = 'P30D';

export const makeFilterStepByGasState = (gasPrices: YdsGasStateResponse) => {
  /** The filter function that curries in the gasPrices. */
  const filterByGasState = (
    chainGasState: YdsChainGasState,
    _chainName: SupportedChain,
  ): boolean => {
    const period = chainGasState.windows.find(
      ({ duration }) => duration === GAS_STATS_WINDOW,
    );
    // Return true if we allow plan steps to proceed.
    return (
      !!period && chainGasState.current.sampleUusd * 2 < period.p50Uusd * 3
    );
  };

  const gasStateByChainName = new Map<SupportedChain, YdsChainGasState>(
    gasPrices.data.map(chainGasState => [
      chainGasState.chainName as SupportedChain,
      chainGasState,
    ]),
  );
 
  const filterStep = (step: MovementDesc, _index: number): boolean => {
    const chainNames = chainNamesForStep(step);
    if (chainNames.length === 0) return true;

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

export const parseChainsGasResponse = (data: unknown): YdsGasStateResponse => {
  if (
    !isRecord(data) ||
    data.message !== 'Gas data retrieved successfully' ||
    !Array.isArray(data.data) ||
    !data.data.every(isChainGasState) ||
    typeof data.timestamp !== 'string'
  ) {
    throw Error('unexpected /chains/gas response schema');
  }
  return data as YdsGasStateResponse;
};

export const stringifyGasPrices = (gasPrices: YdsGasStateResponse): string =>
  JSON.stringify(
    [...gasPrices.data].sort((a, b) => a.chainName.localeCompare(b.chainName)),
  );

const chainNamesForStep = (step: MovementDesc): SupportedChain[] => {
  const { src, dest } = step;
  const chainNames = [src, dest]
    .map(place => chainOf(place))
    .filter(
      chainName => !unsupportedChainNames.includes(chainName as any),
    ) as SupportedChain[];
  return [...new Set(chainNames)];
};

/**
 * Find all the transitive dependencies indices for the step at `stepIndex`.
 *
 * @param plan
 */
const makeDependenciesFor = (plan: FundsFlowPlan | MovementDesc[]) => {
  // Compile a dependency graph from the plan's order, or if not present then
  // from the flow's linear order.
  let order: [number, number[]][] | undefined;
  if ('order' in plan) {
    order = plan.order;
  }
  if (!order) {
    const steps = Array.isArray(plan) ? plan : plan.flow;
    order = steps.map(
      (_step, idx) => [idx, idx === 0 ? [] : [idx - 1]] as const,
    );
  }

  /**
   *
   * @param stepIndex the index of the plan step for which to find dependencies
   * @returns the indices of all steps that the step at `stepIndex` depends on, including itself
   */
  const dependenciesFor = (stepIndex: number): number[] => {
    // Traverse the dependency graph to find all steps that the given step depends
    // on.
    const selectedIndices = new Set<number>();
    const todo = [stepIndex];
    while (todo.length > 0) {
      // Ensure we don't revisit steps we've already seen, which also handles
      // cycles in the dependency graph (though there shouldn't be any).
      const currentIndex = todo.shift()!;
      if (selectedIndices.has(currentIndex)) continue;
      selectedIndices.add(currentIndex);

      // Add the direct dependencies of the current step to the todo list.
      const deps = order.find(([idx]) => idx === currentIndex)?.[1] ?? [];
      todo.push(...deps.filter(dep => !selectedIndices.has(dep)));
    }
    return [...selectedIndices.keys()];
  };
  return dependenciesFor;
};

export const filterPlan = (
  plan: FundsFlowPlan,
  filterStep: (step: MovementDesc, index: number) => boolean,
): FundsFlowPlan => {
  const removed = new Set<number>();
  for (let i = 0; i < plan.flow.length; i += 1) {
    if (!filterStep(plan.flow[i], i)) {
      removed.add(i);
    }
  }

  const dependenciesFor = makeDependenciesFor(plan);
  let changed = true;
  while (changed) {
    changed = false;
    for (let i = 0; i < plan.flow.length; i += 1) {
      if (removed.has(i)) continue;
      if (dependenciesFor(i).some(dep => removed.has(dep))) {
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
harden(filterPlan);
