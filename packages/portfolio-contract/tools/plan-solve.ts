import jsLPSolver from 'javascript-lp-solver';
import type {
  IModel,
  IModelVariableConstraint,
  Solution,
} from 'javascript-lp-solver';

import { assert, Fail, X } from '@endo/errors';

import { AmountMath } from '@agoric/ertp';
import type { NatAmount } from '@agoric/ertp/src/types.js';
import {
  makeTracer,
  naturalCompare,
  objectMap,
  partialMap,
  provideLazyMap,
  typedEntries,
} from '@agoric/internal';
import { EvmWalletOperationType } from '@agoric/portfolio-api';
import type {
  AxelarChain,
  FundsFlowPlan,
  YieldProtocol,
} from '@agoric/portfolio-api';

import type { AssetPlaceRef, MovementDesc } from '../src/type-guards-steps.js';
import { PoolPlaces } from '../src/type-guards.js';
import type { PoolKey } from '../src/type-guards.js';
import {
  preflightValidateNetworkPlan,
  formatInfeasibleDiagnostics,
  validateSolvedFlows,
} from './graph-diagnose.js';
import { chainOf, makeGraphForFlow } from './network/buildGraph.js';
import type { FlowEdge, FlowGraph } from './network/buildGraph.js';
import type { NetworkSpec } from './network/network-spec.js';

const replaceOrInit = <K, V>(
  map: Map<K, V>,
  key: K,
  callback: (value: V | undefined, key: K, exists: boolean) => V,
) => {
  const old = map.get(key);
  const exists = old !== undefined || map.has(key);
  map.set(key, callback(old, key, exists));
};

// XXX These probably belong in @agoric/internal.
/**
 * Return the minimum and maximum bigint value from non-empty arguments, similar
 * to `Math.min` and `Math.max` (which don't work with bigints).
 */
const bigIntExtremes = (first: bigint, ...rest: bigint[]) => {
  let min = first;
  let max = first;
  for (const arg of rest) {
    if (arg < min) min = arg;
    if (arg > max) max = arg;
  }
  return { min, max };
};
/**
 * Return the maximum bigint value from non-empty arguments, similar to
 * `Math.max` (which doesn't work with bigints).
 */
const bigIntMax = (first: bigint, ...rest: bigint[]): bigint =>
  bigIntExtremes(first, ...rest).max;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trace = makeTracer('solve');

/** The count of minor units per major unit (e.g., uusdc per USDC) */
const UNIT_SCALE = 1e6;

export const NoSolutionError = class extends Error {} as ErrorConstructor;
harden(NoSolutionError);

const failUnsolvable = (
  details: ReturnType<typeof X> | string,
  cause?: Error,
): never =>
  assert.fail(
    details,
    ((...args) => Reflect.construct(NoSolutionError, args)) as ErrorConstructor,
    { cause },
  );

/** Mode of optimization */
export type RebalanceMode = 'cheapest' | 'fastest';

/** For representing partial order in a flow graph */
export type StepOrder = Required<FundsFlowPlan>['order'];

/** Solver result edge */
export interface SolvedEdgeFlow {
  edge: FlowEdge;
  flow: number;
  used: boolean;
}

/** Model shape for javascript-lp-solver */
export type LpModel = IModel<string, string>;
export type LpSolution = Solution<string>;

/**
 * Gas estimation interface:
 * - getFactoryContractEstimate: Estimate gas fees for executing the
 *   [Factory Contract]{@link https://github.com/agoric-labs/agoric-to-axelar-local/blob/cd6087fa44de3b019b2cdac6962bb49b6a2bc1ca/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol}
 *   to create a wallet on the specified chain
 * - getReturnFeeEstimate: Estimate return fees for sending a transaction back
 *   from the factory contract to Agoric
 * - getWalletEstimate: Estimate gas fees for remote wallet operations on the
 *   specified chain
 */
export type GasEstimator = {
  getWalletEstimate: (
    chainName: AxelarChain,
    operationType?: EvmWalletOperationType,
    protocol?: YieldProtocol,
  ) => Promise<bigint>;
  getFactoryContractEstimate: (chainName: AxelarChain) => Promise<bigint>;
  getReturnFeeEstimate: (chainName: AxelarChain) => Promise<bigint>;
};

/**
 * -----------------------------------------------------------------------------
 * Scaling Rules (model domain normalization)
 *  - Amount / Capacity units (native) are scaled by AMOUNT_SCALE (1e3)
 *  - Variable fee given in native $/unit -> divide by AMOUNT_SCALE
 *  - Flat fees kept as-is (assumed already small: cents → dollars)
 *  - Latency (seconds) -> minutes ( divide by 60 )
 *  - Big-M: use scaled capacity directly (tight)
 *  - Treat |value| < FLOW_EPS as zero when decoding
 * -----------------------------------------------------------------------------
 */
const FLOW_EPS = 1e-6;

// ------------------------------ Model Building -------------------------------

type FlowVar = Record<
  | `allow_${string}`
  | `through_${string}`
  | `netOut_${string}`
  | 'variableFeeBps'
  | 'weight',
  number
>;
type PickVar = Record<
  `allow_${string}` | 'magnifiedFlatFee' | 'timeSec' | 'weight',
  number
>;
type WeightFns = {
  classifyWeights: (
    flowVar: FlowVar,
    pickVar: PickVar,
  ) => { primary: number[]; other: number[] };
  setWeights: (flowVar: FlowVar, pickVar: PickVar, epsilon: number) => void;
};

const DEFAULT_SECONDARY_WEIGHT_EPSILON = 1e-6;

const modeFns = new Map(
  typedEntries({
    cheapest: {
      classifyWeights: (flowVar, pickVar) => ({
        primary: [flowVar.variableFeeBps, pickVar.magnifiedFlatFee],
        other: [pickVar.timeSec],
      }),
      setWeights: (flowVar, pickVar, epsilon) => {
        // Fees have full weight; time is weighted by epsilon.
        flowVar.weight = flowVar.variableFeeBps;
        pickVar.weight = pickVar.magnifiedFlatFee + pickVar.timeSec * epsilon;
      },
    },
    fastest: {
      classifyWeights: (flowVar, pickVar) => ({
        primary: [pickVar.timeSec],
        other: [flowVar.variableFeeBps, pickVar.magnifiedFlatFee],
      }),
      setWeights: (flowVar, pickVar, epsilon) => {
        // Fees are weighted by epsilon; time has full weight.
        flowVar.weight = flowVar.variableFeeBps * epsilon;
        pickVar.weight = pickVar.timeSec + pickVar.magnifiedFlatFee * epsilon;
      },
    },
  } as Record<RebalanceMode, WeightFns>),
);

/**
 * Build LP/MIP model for javascript-lp-solver, expressing amounts in major
 * units with floating point values (e.g., `1.5` for 1.5 USDC from 1_500_000n
 * uusdc).
 */
export const buildLPModel = (
  graph: FlowGraph,
  mode: RebalanceMode,
): LpModel => {
  const { classifyWeights, setWeights } =
    modeFns.get(mode) || Fail`unknown mode ${mode}`;

  const flowVariables = {} as Record<`via_${string}`, FlowVar>;
  const pickVariables = {} as Record<`pick_${string}`, PickVar>;
  const couplingConstraints = {} as Record<string, IModelVariableConstraint>;
  const throughputConstraints = {} as Record<string, IModelVariableConstraint>;
  const netFlowConstraints = {} as Record<string, IModelVariableConstraint>;
  let [minPrimaryWeight, maxSecondaryWeight] = [Infinity, -Infinity];
  for (const edge of graph.edges) {
    const { id, src, dest } = edge;
    const { capacity, min, variableFeeBps, flatFee = 0n, timeSec = 0 } = edge;

    // Scale capacity to major units; handle min via coupling because a nonzero
    // min here would force the solver to pick otherwise unnecessary arcs.
    throughputConstraints[`through_${id}`] = {
      min: 0,
      max: capacity === undefined ? undefined : Number(capacity) / UNIT_SCALE,
    };

    // Dynamic costs for this edge are associated with the numeric `via_${id}`
    // variable, and fixed costs are associated with the binary `pick_${id}`.
    // We couple them together with a shared `allow_${id}` attribute that has a
    // small negative value for the former and a large positive value for the
    // latter, and a constraint that the total sum be non-negative.
    // So any `via_${id}` dynamic flow requires activation of `pick_${id}`,
    // which adds enough `allow_${id}` to cover all of the flow.
    couplingConstraints[`allow_${id}`] = { min: 0 };
    const FORCE_PICK = -1;
    const COVER_FLOW = 1e12;
    if (min !== undefined) {
      // This arc has a defined minimum that applies whenever it used, which we
      // represent as a *maximum* bound on the coupling attribute such that
      // there must be enough `via_${id}` throughput to reduce the sum by a
      // correspondingly high amount from the COVER_FLOW starting point
      // established by `pick_${id}`.
      const scaledMin = Number(min) / UNIT_SCALE;
      couplingConstraints[`allow_${id}`].max = COVER_FLOW - scaledMin;
    }

    const flowVar: FlowVar = {
      [`allow_${id}`]: FORCE_PICK,
      [`through_${id}`]: 1,
      [`netOut_${src}`]: 1,
      [`netOut_${dest}`]: -1,
      variableFeeBps,
      weight: 0, // increased below
    };
    flowVariables[`via_${id}`] = flowVar;

    // Basing weight on unscaled variableFeeBps is an an implicit magnification
    // by 1e4 to hundreds of minor units/thousandths of major units (e.g.,
    // 100 bps = 1% of 1.5 USDC is actually 0.015 USDC but manifests as 150),
    // and flatFee (which is in minor units) should follow suit such that e.g.
    // 123 uusdc = 0.000123 USDC manifests as 1.23.
    const magnifiedFlatFee = (Number(flatFee) * 1e4) / UNIT_SCALE;

    const pickVar: PickVar = {
      [`allow_${id}`]: COVER_FLOW,
      magnifiedFlatFee,
      timeSec,
      weight: 0, // increased below
    };
    pickVariables[`pick_${id}`] = pickVar;

    // Track the gap between primary and non-primary non-zero weights.
    const weights = classifyWeights(flowVar, pickVar);
    minPrimaryWeight = Math.min(
      minPrimaryWeight,
      ...weights.primary.map(n => n || Infinity),
    );
    maxSecondaryWeight = Math.max(
      maxSecondaryWeight,
      ...weights.other.map(n => n || -Infinity),
    );
  }

  // Finalize the weights, trying to leave 100x overhead between primary and
  // non-primary contributions.
  const maxExpectedFlow = Math.max(
    ...Object.values(graph.supplies).map(x => Math.abs(x) / UNIT_SCALE),
  );
  const epsilonWeight =
    Number.isFinite(minPrimaryWeight) && Number.isFinite(maxSecondaryWeight)
      ? minPrimaryWeight / (maxSecondaryWeight * maxExpectedFlow * 100)
      : DEFAULT_SECONDARY_WEIGHT_EPSILON;
  for (const { id } of graph.edges) {
    setWeights(
      flowVariables[`via_${id}`],
      pickVariables[`pick_${id}`],
      epsilonWeight,
    );
    // No arc is free.
    pickVariables[`pick_${id}`].weight += 1;
  }

  // Constrain the net flow from each node.
  for (const node of graph.nodes) {
    const supply = graph.supplies[node] || 0;
    netFlowConstraints[`netOut_${node}`] = { equal: supply / UNIT_SCALE };
  }

  return {
    opType: 'min',
    optimize: 'weight',
    constraints: {
      ...couplingConstraints,
      ...throughputConstraints,
      ...netFlowConstraints,
    },
    binaries: objectMap(pickVariables, () => true),
    ints: {},
    variables: { ...pickVariables, ...flowVariables },
  };
};

/**
 * Refine a coarse model of floating-point major-unit amount values and a
 * corresponding solution into a narrow model of integer minor-unit amount
 * values along only selected arcs.
 */
const refineModel = (
  fullModel: LpModel,
  graph: FlowGraph,
  solution: LpSolution,
): LpModel => {
  const cloned = JSON.parse(JSON.stringify(fullModel));
  cloned.binaries = {};
  cloned.ints = {};
  for (const edge of graph.edges) {
    const { id, capacity, min } = edge;
    const pickVar = `pick_${id}`;
    const flowVar = `via_${id}`;
    if ((solution[flowVar] ?? 0) > 0) {
      cloned.binaries[pickVar] = true;
      cloned.ints[flowVar] = true;
      cloned.constraints[`through_${id}`] = {
        min: min === undefined ? undefined : Number(min),
        max: capacity === undefined ? undefined : Number(capacity),
      };
      cloned.variables[pickVar].weight =
        (cloned.variables[pickVar].weight - 1) * UNIT_SCALE + 1;
    } else {
      delete cloned.variables[pickVar];
      delete cloned.variables[flowVar];
      delete cloned.constraints[`allow_${id}`];
      delete cloned.constraints[`through_${id}`];
    }
  }
  for (const node of graph.nodes) {
    const supply = graph.supplies[node] || 0;
    cloned.constraints[`netOut_${node}`] = { equal: supply };
  }
  return cloned;
};

/**
 * Represent a JSON-serializable object as a spacey single-line literal with
 * identifier-compatible property names unquoted.
 */
const prettyJsonable = (obj: unknown): string => {
  const jsonText = JSON.stringify(obj, null, 1);
  // Capture strings and replace them with JSON-incompatible `#`s.
  const strings = [] as string[];
  const safe = jsonText.replace(/"(\\.|[^\\"])*":?/g, s => {
    strings.push(s);
    return '#';
  });
  // Condense the [now guaranteed-insignificant] whitespace.
  const singleLine = safe.replace(/\s+/g, ' ');
  // Restore the strings, stripping quotes from property names as possible.
  const pretty = singleLine.replaceAll('#', () => {
    const s = strings.shift() as string;
    if (!s.endsWith(':')) return s;
    return s.replace(/^"([\p{ID_Start}$_][\p{ID_Continue}$]*)":$/u, '$1:');
  });
  return pretty;
};

const solveLPModel = (
  model: LpModel,
  graph: FlowGraph,
  { precision = 1e-9 } = {},
): LpSolution => {
  const solution = jsLPSolver.Solve(model, precision);

  // The 'feasible' flag can be overly strict, so we check if we got a result
  // instead. If result is undefined or there are no variable values, it's truly infeasible.
  if (!(solution?.feasible || solution?.result)) {
    if (graph.debug) {
      // Emit richer context only on demand to avoid noisy passing runs
      let msg = formatInfeasibleDiagnostics(graph, model);
      msg += ` | ${prettyJsonable(solution)}`;
      console.error('[solver] No feasible solution. Diagnostics:', msg);
      failUnsolvable(X`No feasible solution: ${msg}`);
    }
    failUnsolvable(X`No feasible solution: ${solution}`);
  }

  return solution;
};

// This operation is async to allow future use of async solvers if needed
export const solveRebalance = async (
  model: LpModel,
  graph: FlowGraph,
): Promise<{ flows: SolvedEdgeFlow[]; detail?: Record<string, unknown> }> => {
  await null;

  // First, use the provided model with major-unit amount values to pick arcs.
  // Then, derive a new model with minor-unit integer amount values against the
  // selected subgraph.
  // This two-step approach seems to dodge some IEEE 754 rounding issues.
  const pickSolution = solveLPModel(model, graph, { precision: 1e-15 });
  const refinedModel = refineModel(model, graph, pickSolution);
  const solution = solveLPModel(refinedModel, graph);

  const flows: SolvedEdgeFlow[] = [];
  for (const edge of graph.edges) {
    const { id } = edge;
    const flowKey = `via_${id}`;
    const rawFlow = solution[flowKey];
    // jsLPSolver returns floating-point values, round to nearest integer
    const flow = rawFlow ? Math.round(rawFlow) : 0;
    if (flow !== 0) flows.push({ edge, flow, used: true });
  }
  return { flows, detail: { solution } };
};

/**
 * Compute partial order from solved flows and initial supplies.
 *
 * For each node, we track available supply (initial + completed inflows).
 * An outflow step depends on the minimum set of inflow steps needed to
 * provide sufficient supply.
 *
 * This approach correctly handles cases like:
 * - Multiple operations to/from the same node with separate dependencies
 * - Initial supplies that satisfy some outflows immediately
 * - Fan-out patterns where multiple outflows depend on the same inflow
 *
 * @param flows - solved flows from the LP solver
 * @param initialSupplies - starting balances at each node
 * @returns prioritized flows in execution order and partial order constraints
 */
export const computePartialOrder = (
  flows: SolvedEdgeFlow[],
  initialSupplies: Map<AssetPlaceRef, number>,
): { prioritized: SolvedEdgeFlow[]; order?: StepOrder } => {
  // Return immediately if there's nothing to do.
  if (flows.length === 0) return { prioritized: [] };

  type FlowIndex = number;
  type Inflow = { stepIdx?: number; unclaimed: number };

  /** Instantaneous supply by node */
  const available = new Map(initialSupplies);

  /** Step indices constituting those supplies (starting with just the initial supply) */
  const inflows = new Map<AssetPlaceRef, Inflow[]>(
    [...initialSupplies.entries()].map(([place, value]) => {
      const nullInflow = { stepIdx: undefined, unclaimed: value };
      return [place, [nullInflow]];
    }),
  );

  const scheduled = new Set<FlowIndex>();
  const order: StepOrder = [];

  // Maintain last chosen originating chain to group sequential operations.
  let lastChain: string | undefined;

  for (let stepIdx = 0; stepIdx < flows.length; stepIdx += 1) {
    /** Flows that can execute with current available supply */
    const candidates: { flowIdx: FlowIndex; flow: SolvedEdgeFlow }[] = [];
    for (let i = 0; i < flows.length; i += 1) {
      if (scheduled.has(i)) continue;
      const flow = flows[i];
      const srcSupply = available.get(flow.edge.src) || 0;
      if (srcSupply >= flow.flow) candidates.push({ flowIdx: i, flow });
    }

    // Fail upon encountering deadlock.
    if (!candidates.length) {
      const remaining = partialMap(flows, (f, idx) => {
        if (scheduled.has(idx)) return;
        const { id, src, dest } = f.edge;
        const srcSupply = available.get(src);
        return `${idx}: ${id} ${src}(${srcSupply}) -> ${dest} needs ${f.flow}`;
      });
      throw failUnsolvable(
        X`Scheduling deadlock: no flows can be executed. Remaining:\n${remaining.join('\n')}`,
      );
    }

    // Prefer continuing with lastChain if possible
    const fromSameChain = lastChain
      ? candidates.filter(c => chainOf(c.flow.edge.src) === lastChain)
      : undefined;
    const chosenGroup = fromSameChain?.length ? fromSameChain : candidates;

    // Pick deterministic smallest edge id within chosen group
    chosenGroup.sort((a, b) => naturalCompare(a.flow.edge.id, b.flow.edge.id));
    const { flowIdx, flow: chosen } = chosenGroup[0];
    const { src, dest } = chosen.edge;
    const srcInflows = inflows.get(src) || [];
    const destInflows = provideLazyMap(inflows, dest, () => []);

    // Identify inflows to consume (partially or completely), drawing from them
    // in the order they were added and marking them as prereqs along the way.
    let unfunded = chosen.flow;
    const prereqs: number[] = [];
    for (const inflow of srcInflows) {
      if (unfunded <= 0) break;
      if (inflow.unclaimed <= 0) continue;
      const claimed = Math.min(inflow.unclaimed, unfunded);
      unfunded -= claimed;
      inflow.unclaimed -= claimed;
      if (inflow.stepIdx !== undefined) prereqs.push(inflow.stepIdx);
    }

    // Record use of `chosen` in outer-scope variables.
    replaceOrInit(available, src, (old = 0) => old - chosen.flow);
    replaceOrInit(available, dest, (old = 0) => old + chosen.flow);
    scheduled.add(flowIdx);
    destInflows.push({ stepIdx, unclaimed: chosen.flow });
    if (prereqs.length > 0) order.push([stepIdx, prereqs]);
    lastChain = chainOf(src);
  }

  // Don't bother returning a trivial `order` in which each step depends upon
  // exactly the previous step.
  const isTrivialOrder = (): boolean => {
    if (order.length !== scheduled.size - 1) return false;
    for (let i = 0; i < order.length; i += 1) {
      const [target, prereqs] = order[i];
      if (target !== i + 1) return false;
      if (prereqs.length !== 1 || prereqs[0] !== i) return false;
    }
    return true;
  };

  const prioritized = [...scheduled].map(idx => flows[idx]);
  return isTrivialOrder() ? { prioritized } : { prioritized, order };
};

export const rebalanceMinCostFlowSteps = async (
  flows: SolvedEdgeFlow[],
  graph: FlowGraph,
  {
    brand,
    feeBrand,
    gasEstimator,
  }: {
    brand: NatAmount['brand'];
    feeBrand: NatAmount['brand'];
    gasEstimator: GasEstimator;
  },
): Promise<FundsFlowPlan> => {
  // XXX Assuming flow values are integer, this filter seems pointless.
  const filteredFlows = flows.filter(f => f.flow > FLOW_EPS);
  const initialSupplies = new Map(
    typedEntries(graph.supplies).filter(([_place, amount]) => amount > 0),
  ) as Map<AssetPlaceRef, number>;

  const { prioritized, order } = computePartialOrder(
    filteredFlows,
    initialSupplies,
  );

  /** Add 20% to a fee estimate as a buffer against short-term variability. */
  const padFeeEstimate = (estimate: bigint): bigint =>
    estimate <= 0n ? estimate : (estimate * 120n - 1n) / 100n + 1n;

  /**
   * Ensure minimum gas is sent for an Axelar GMP transaction, to hopefully
   * prevent "not enough gas" errors.
   * Note: This function returns a `feeBrand` Amount that is appropriate for
   * Axelar GMP transaction fees but not for e.g. EVM gas (with is in ETH).
   */
  const makeGmpFeeAmount = (estimate: bigint): NatAmount => {
    const padded = padFeeEstimate(estimate);
    // cf. https://github.com/Agoric/agoric-private/issues/548#issuecomment-3517683817
    const MINIMUM_GAS = 5_000_000n;
    return AmountMath.make(feeBrand, bigIntMax(MINIMUM_GAS, padded));
  };

  const steps = await Promise.all(
    prioritized.map(async ({ edge, flow }): Promise<MovementDesc> => {
      const { src, dest, variableFeeBps } = edge;
      Number.isSafeInteger(flow) ||
        failUnsolvable(X`flow ${flow} for edge ${edge} is not a safe integer`);
      const amount = AmountMath.make(brand, BigInt(flow));
      const stepBase = { src, dest, amount };

      await null;
      switch (edge.feeMode) {
        case 'makeEvmAccount': {
          const destinationEvmChain = chainOf(dest) as AxelarChain;
          const feeValue =
            await gasEstimator.getFactoryContractEstimate(destinationEvmChain);
          const returnFeeValue =
            await gasEstimator.getReturnFeeEstimate(destinationEvmChain);
          return {
            ...stepBase,
            detail: { evmGas: padFeeEstimate(returnFeeValue) },
            fee: makeGmpFeeAmount(feeValue),
          };
        }
        // XXX: revisit https://github.com/Agoric/agoric-sdk/pull/11953#discussion_r2383034184
        case 'poolToEvm': {
          const poolInfo = PoolPlaces[src as PoolKey];
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(dest) as AxelarChain,
            EvmWalletOperationType.Withdraw,
            poolInfo?.protocol,
          );
          return { ...stepBase, fee: makeGmpFeeAmount(feeValue) };
        }
        case 'evmToPool': {
          const poolInfo = PoolPlaces[dest as PoolKey];
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(dest) as AxelarChain,
            EvmWalletOperationType.Supply,
            poolInfo?.protocol,
          );
          return { ...stepBase, fee: makeGmpFeeAmount(feeValue) };
        }
        case 'evmToNoble': {
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(src) as AxelarChain,
            EvmWalletOperationType.DepositForBurn,
          );
          return { ...stepBase, fee: makeGmpFeeAmount(feeValue) };
        }
        case 'toUSDN': {
          // NOTE USDN transfer incurs a fee on output amount in basis points
          // HACK of subtract 1n in order to avoid rounding errors in Noble
          // See https://github.com/Agoric/agoric-private/issues/415
          const usdnOut =
            (BigInt(flow) * (10000n - BigInt(variableFeeBps))) / 10000n - 1n;
          return { ...stepBase, detail: { usdnOut } };
        }
        default:
          return stepBase;
      }
    }),
  );

  // Validate flow consistency after scheduling (optional, only in debug mode)
  if (graph.debug) {
    const validation = validateSolvedFlows(graph, prioritized);
    if (!validation.ok) {
      console.error('[solver] Flow validation failed:', validation.errors);
      console.error('[solver] Original supplies:', graph.supplies);
      console.error('[solver] All proposed flows in order:', steps);
      failUnsolvable(
        X`Flow validation failed: ${validation.errors.join('; ')}`,
      );
    }
    if (validation.warnings.length > 0) {
      console.warn('[solver] Flow validation warnings:', validation.warnings);
    }
  }

  return harden({ flow: steps, order });
};

// -------------------------- Convenience End-to-End ---------------------------

/**
 * Full pipeline (network required):
 * 1. build graph from NetworkSpec
 * 2. buildModel
 * 3. solveRebalance
 * 4. rebalanceMinCostFlowSteps
 */
export const planRebalanceFlow = async (opts: {
  network: NetworkSpec;
  current: Partial<Record<AssetPlaceRef, NatAmount>>;
  target: Partial<Record<AssetPlaceRef, NatAmount>>;
  brand: NatAmount['brand'];
  feeBrand: NatAmount['brand'];
  mode?: RebalanceMode;
  gasEstimator: GasEstimator;
}) => {
  const {
    network,
    current,
    target,
    brand,
    feeBrand,
    mode = 'fastest',
    gasEstimator,
  } = opts;
  // TODO remove "automatic" values that should be static
  const graph = makeGraphForFlow(network, current, target);
  const model = buildLPModel(graph, mode);
  let result;
  await null;
  try {
    result = await solveRebalance(model, graph);
  } catch (err) {
    const { message } = err;
    try {
      // If the solver says infeasible, try to produce a clearer message
      preflightValidateNetworkPlan(network, current, target);
    } catch (networkValidationErr) {
      // eslint-disable-next-line no-ex-assign
      err = AggregateError([err, networkValidationErr]);
    }
    failUnsolvable(message, err);
  }
  const { flows, detail } = result;
  const plan = await rebalanceMinCostFlowSteps(flows, graph, {
    brand,
    feeBrand,
    gasEstimator,
  });
  return harden({ graph, model, flows, plan, detail });
};
