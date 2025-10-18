import jsLPSolver from 'javascript-lp-solver';
import type { IModel, IModelVariableConstraint } from 'javascript-lp-solver';

import { Fail } from '@endo/errors';

import { AmountMath } from '@agoric/ertp';
import type { Amount, NatAmount } from '@agoric/ertp/src/types.js';
import {
  makeTracer,
  naturalCompare,
  objectMap,
  typedEntries,
} from '@agoric/internal';
import { EvmWalletOperationType } from '@agoric/portfolio-api/src/constants.js';
import type {
  AxelarChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';

import type { AssetPlaceRef, MovementDesc } from '../src/type-guards-steps.js';
import { PoolPlaces } from '../src/type-guards.js';
import type { PoolKey } from '../src/type-guards.js';
import {
  preflightValidateNetworkPlan,
  formatInfeasibleDiagnostics,
  validateSolvedFlows,
} from './graph-diagnose.js';
import { chainOf, makeGraphFromDefinition } from './network/buildGraph.js';
import type { FlowEdge, RebalanceGraph } from './network/buildGraph.js';
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

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trace = makeTracer('solve');

/** Mode of optimization */
export type RebalanceMode = 'cheapest' | 'fastest';

/** Solver result edge */
export interface SolvedEdgeFlow {
  edge: FlowEdge;
  flow: number;
  used: boolean;
}

/** Model shape for javascript-lp-solver */
export type LpModel = IModel<string, string>;

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
// Tolerance for supply availability checks during scheduling.
// Needs to be larger than FLOW_EPS to handle:
// 1. Floating-point rounding accumulation from arithmetic operations
// 2. Integer division rounding in target allocation computations
// Use both absolute tolerance (for small flows) and relative tolerance (for large flows).
// For USDC (6 decimals), values are in micro-USDC.
const SCHEDULING_EPS_ABS = 10;
const SCHEDULING_EPS_REL = 1e-6; // 1 part per million relative error tolerance

// ------------------------------ Model Building -------------------------------

type IntVar = Record<
  | `allow_${string}`
  | `through_${string}`
  | `netOut_${string}`
  | 'magnifiedVariableFee'
  | 'weight',
  number
>;
type BinaryVar = Record<
  `allow_${string}` | 'magnifiedFlatFee' | 'timeFixed' | 'weight',
  number
>;
type WeightFns = {
  getPrimaryWeights: (intVar: IntVar, binaryVar: BinaryVar) => number[];
  setWeights: (intVar: IntVar, binaryVar: BinaryVar, epsilon: number) => void;
};

const modeFns = new Map(
  typedEntries({
    cheapest: {
      getPrimaryWeights: (intVar, binaryVar) => [
        intVar.magnifiedVariableFee,
        binaryVar.magnifiedFlatFee,
      ],
      setWeights: (intVar, binaryVar, epsilon) => {
        // Fees have full weight; time is weighted by epsilon.
        intVar.weight = intVar.magnifiedVariableFee;
        binaryVar.weight =
          binaryVar.magnifiedFlatFee + binaryVar.timeFixed * epsilon;
      },
    },
    fastest: {
      getPrimaryWeights: (_intVar, binaryVar) => [binaryVar.timeFixed],
      setWeights: (intVar, binaryVar, epsilon) => {
        // Fees are weighted by epsilon; time has full weight.
        intVar.weight = intVar.magnifiedVariableFee * epsilon;
        binaryVar.weight =
          binaryVar.timeFixed + binaryVar.magnifiedFlatFee * epsilon;
      },
    },
  } as Record<RebalanceMode, WeightFns>),
);

/**
 * Build LP/MIP model for javascript-lp-solver.
 */
export const buildLPModel = (
  graph: RebalanceGraph,
  mode: RebalanceMode,
): LpModel => {
  const { getPrimaryWeights, setWeights } =
    modeFns.get(mode) || Fail`unknown mode ${mode}`;

  const intVariables = {} as Record<`via_${string}`, IntVar>;
  const binaryVariables = {} as Record<`pick_${string}`, BinaryVar>;
  const couplingConstraints = {} as Record<string, IModelVariableConstraint>;
  const throughputConstraints = {} as Record<string, IModelVariableConstraint>;
  const netFlowConstraints = {} as Record<string, IModelVariableConstraint>;
  let minPrimaryWeight = Infinity;
  for (const edge of graph.edges) {
    const { id, src, dest } = edge;
    const { capacity, min, variableFee, fixedFee = 0, timeFixed = 0 } = edge;

    throughputConstraints[`through_${id}`] = {
      min: min || 0,
      max: capacity,
    };

    // The numbers in graph.supplies should use the same units as fixedFee, but
    // variableFee is in basis points relative to some scaling of those other
    // values.
    // We also want fee attributes large enough to avoid IEEE 754 rounding
    // issues.
    // Assume that scaling to be 1e6 (i.e., 100 bp = 1% of supplies[key]/1e6)
    // and scale the fee attributes accordingly such that variableFee 100 will
    // contribute a weight of 0.01 for each `via_$edge` atomic unit of payload
    // (i.e., magnified by 1e6 if the scaling is actually 1e6) and fixedFee 1
    // will contribute a weight of 1e6 if the corresponding edge is used (i.e.,
    // also magnified by 1e6 if the scaling is actually 1e6).
    // The solution may be disrupted by either over- or under-weighting
    // variableFee w.r.t. fixedFee, but not otherwise, and we accept the risk.
    // TODO: Define RebalanceGraph['scale'] to eliminate this guesswork.
    const magnifiedVariableFee = variableFee / 10_000;
    const magnifiedFlatFee = fixedFee * 1e6;

    // Dynamic costs for this edge are associated with the numeric `via_${id}`
    // variable, and fixed costs are associated with the binary `pick_${id}`.
    // We couple them together with a shared `allow_${id}` attribute that has a
    // tiny negative value for the former and an enormous positive value for the
    // latter, and a constraint that the total sum be non-negative.
    // So any `via_${id}` dynamic flow requires activation of `pick_${id}`,
    // which adds enough `allow_${id}` to cover all of the flow.
    couplingConstraints[`allow_${id}`] = { min: 0 };
    const FORCE_PICK = -1e-6;
    const COVER_FLOW = 1e9;

    const intVar: IntVar = {
      [`allow_${id}`]: FORCE_PICK,
      [`through_${id}`]: 1,
      [`netOut_${src}`]: 1,
      [`netOut_${dest}`]: -1,
      magnifiedVariableFee,
      weight: 0, // increased below
    };
    intVariables[`via_${id}`] = intVar;

    const binaryVar = {
      [`allow_${id}`]: COVER_FLOW,
      magnifiedFlatFee,
      timeFixed,
      weight: 0, // increased below
    };
    binaryVariables[`pick_${id}`] = binaryVar;

    // Keep track of the lowest non-zero primary weight for `mode`.
    minPrimaryWeight = Math.min(
      minPrimaryWeight,
      ...getPrimaryWeights(intVar, binaryVar).map(n => n || Infinity),
    );
  }

  // Finalize the weights.
  const epsilonWeight = Number.isFinite(minPrimaryWeight)
    ? minPrimaryWeight / 1e6
    : 1e-9;
  for (const { id } of graph.edges) {
    setWeights(
      intVariables[`via_${id}`],
      binaryVariables[`pick_${id}`],
      epsilonWeight,
    );
    // No arc is free.
    binaryVariables[`pick_${id}`].weight += 1;
  }

  // Constrain the net flow from each node.
  for (const node of graph.nodes) {
    const supply = graph.supplies[node] || 0;
    netFlowConstraints[`netOut_${node}`] = { equal: supply };
  }

  return {
    opType: 'min',
    optimize: 'weight',
    constraints: {
      ...couplingConstraints,
      ...throughputConstraints,
      ...netFlowConstraints,
    },
    binaries: objectMap(binaryVariables, () => true),
    ints: objectMap(intVariables, () => true),
    variables: { ...binaryVariables, ...intVariables },
  };
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

// This operation is async to allow future use of async solvers if needed
export const solveRebalance = async (
  model: LpModel,
  graph: RebalanceGraph,
): Promise<{ flows: SolvedEdgeFlow[]; detail?: Record<string, unknown> }> => {
  await null;
  const jsResult = jsLPSolver.Solve(model, 1e-9);

  // jsLPSolver returns an object with variable values
  // The 'feasible' flag can be overly strict, so we check if we got a result
  // instead. If result is undefined or there are no variable values, it's truly infeasible.
  if (
    !jsResult ||
    (jsResult.feasible === false && jsResult.result === undefined)
  ) {
    if (graph.debug) {
      // Emit richer context only on demand to avoid noisy passing runs
      let msg = formatInfeasibleDiagnostics(graph, model);
      msg += ` | ${prettyJsonable(jsResult)}`;
      console.error('[solver] No feasible solution. Diagnostics:', msg);
      throw Fail`No feasible solution: ${msg}`;
    }
    throw Fail`No feasible solution: ${jsResult}`;
  }

  const flows: SolvedEdgeFlow[] = [];
  for (const edge of graph.edges) {
    const { id } = edge;
    const flowKey = `via_${id}`;
    const rawFlow = jsResult[flowKey];
    // jsLPSolver returns floating-point values, round to nearest integer
    const flow = rawFlow ? Math.round(rawFlow) : 0;
    const used = flow > FLOW_EPS;
    if (used) flows.push({ edge, flow, used: true });
  }
  return { flows, detail: { jsResult } };
};

export const rebalanceMinCostFlowSteps = async (
  flows: SolvedEdgeFlow[],
  graph: RebalanceGraph,
  gasEstimator: GasEstimator,
): Promise<MovementDesc[]> => {
  // Initialize supplies with all nodes including transit hubs (netSupply = 0).
  // This ensures proper tracking of funds as they flow through intermediate nodes.
  // const supplies = new Map(typedEntries(graph.supplies));
  const supplies = new Map(
    typedEntries(graph.supplies).filter(([_place, amount]) => amount > 0),
  );

  type AnnotatedFlow = SolvedEdgeFlow & { srcChain: string };
  const pendingFlows = new Map<string, AnnotatedFlow>(
    flows
      .filter(f => f.flow > FLOW_EPS)
      .map(f => [f.edge.id, { ...f, srcChain: chainOf(f.edge.src) }]),
  );
  const prioritized = [] as AnnotatedFlow[];

  // Maintain last chosen originating chain to group sequential operations.
  let lastChain: string | undefined;

  while (pendingFlows.size) {
    // Find flows that can be executed based on current supplies.
    // Use tolerance to avoid spurious deadlocks from:
    // - Floating-point rounding accumulated during supply tracking
    // - Integer division rounding in target allocation computations
    // Apply both absolute and relative tolerance - take the larger of the two.
    const candidates = [...pendingFlows.values()].filter(f => {
      const supply = supplies.get(f.edge.src) || 0;
      const tolerance = Math.max(
        SCHEDULING_EPS_ABS,
        f.flow * SCHEDULING_EPS_REL,
      );
      return supply >= f.flow - tolerance;
    });

    if (!candidates.length) {
      // Deadlock detected: cannot schedule remaining flows.
      // This indicates a solver bug or rounding error that produced an infeasible flow.
      const diagnostics = [...pendingFlows.values()].map(f => {
        const srcSupply = supplies.get(f.edge.src) || 0;
        const shortage = f.flow - srcSupply;
        return `${f.edge.id}: ${f.edge.src}(${srcSupply}) -> ${f.edge.dest} needs ${f.flow} (short ${shortage})`;
      });
      throw Fail`Scheduling deadlock: no flows can be executed. Remaining flows:\n${diagnostics.join('\n')}`;
    }
    // Prefer continuing with lastChain if possible.
    const fromSameChain = lastChain
      ? candidates.filter(c => c.srcChain === lastChain)
      : undefined;
    const chosenGroup = fromSameChain?.length ? fromSameChain : candidates;

    // Pick deterministic smallest edge id within chosen group.
    chosenGroup.sort((a, b) => naturalCompare(a.edge.id, b.edge.id));
    const chosen = chosenGroup[0];
    prioritized.push(chosen);
    replaceOrInit(supplies, chosen.edge.src, (old = 0) => old - chosen.flow);
    replaceOrInit(supplies, chosen.edge.dest, (old = 0) => old + chosen.flow);
    pendingFlows.delete(chosen.edge.id);
    lastChain = chosen.srcChain;
  }
  /**
   * Pad each fee estimate in case the landscape changes between estimation and
   * execution. Add 10%
   */
  const padFeeEstimate = (estimate: bigint): bigint => (estimate * 110n) / 100n;

  const steps: MovementDesc[] = await Promise.all(
    prioritized.map(async ({ edge, flow }) => {
      Number.isSafeInteger(flow) ||
        Fail`flow ${flow} for edge ${edge} is not a safe integer`;
      const amount = AmountMath.make(graph.brand, BigInt(flow));

      await null;
      let details = {};
      switch (edge.feeMode) {
        case 'makeEvmAccount': {
          const destinationEvmChain = chainOf(edge.dest) as AxelarChain;
          const feeValue =
            await gasEstimator.getFactoryContractEstimate(destinationEvmChain);
          const returnFeeValue =
            await gasEstimator.getReturnFeeEstimate(destinationEvmChain);
          details = {
            detail: { evmGas: padFeeEstimate(returnFeeValue) },
            fee: AmountMath.make(graph.feeBrand, padFeeEstimate(feeValue)),
          };
          break;
        }
        // XXX: revisit https://github.com/Agoric/agoric-sdk/pull/11953#discussion_r2383034184
        case 'poolToEvm': {
          const poolInfo = PoolPlaces[edge.src as PoolKey];
          const protocol = poolInfo?.protocol;
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(edge.dest) as AxelarChain,
            EvmWalletOperationType.Withdraw,
            protocol,
          );
          details = {
            fee: AmountMath.make(graph.feeBrand, padFeeEstimate(feeValue)),
          };
          break;
        }
        case 'evmToPool': {
          const poolInfo = PoolPlaces[edge.dest as PoolKey];
          const protocol = poolInfo?.protocol;
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(edge.dest) as AxelarChain,
            EvmWalletOperationType.Supply,
            protocol,
          );
          details = {
            fee: AmountMath.make(graph.feeBrand, padFeeEstimate(feeValue)),
          };
          break;
        }
        case 'evmToNoble': {
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(edge.src) as AxelarChain,
            EvmWalletOperationType.DepositForBurn,
          );
          details = {
            fee: AmountMath.make(graph.feeBrand, padFeeEstimate(feeValue)),
          };
          break;
        }
        case 'toUSDN': {
          // NOTE USDN transfer incurs a fee on output amount in basis points
          // HACK of subtract 1n in order to avoid rounding errors in Noble
          // See https://github.com/Agoric/agoric-private/issues/415
          const usdnOut =
            (BigInt(flow) * (10000n - BigInt(edge.variableFee))) / 10000n - 1n;
          details = { detail: { usdnOut } };
          break;
        }
        default:
          break;
      }

      return { src: edge.src, dest: edge.dest, amount, ...details };
    }),
  );

  // Validate flow consistency after scheduling (optional, only in debug mode)
  if (graph.debug) {
    const validation = validateSolvedFlows(graph, prioritized, FLOW_EPS);
    if (!validation.ok) {
      console.error('[solver] Flow validation failed:', validation.errors);
      console.log('[solver] Original supplies:', graph.supplies);
      console.log('[solver] Scheduling deadlock. Final supplies:', supplies);
      console.log(
        '[solver] All proposed flows in order:',
        JSON.stringify(
          steps,
          (k, v) => (typeof v === 'bigint' ? v.toString() : v),
          2,
        ),
      );
      throw Fail`Flow validation failed: ${validation.errors.join('; ')}`;
    }
    if (validation.warnings.length > 0) {
      console.warn('[solver] Flow validation warnings:', validation.warnings);
    }
  }

  return harden(steps);
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
  brand: Amount['brand'];
  feeBrand: Amount['brand'];
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
  const graph = makeGraphFromDefinition(
    network,
    current,
    target,
    brand,
    feeBrand,
  );
  console.log({ current, target });

  const model = buildLPModel(graph, mode);
  let result;
  await null;
  try {
    result = await solveRebalance(model, graph);
  } catch (err) {
    // If the solver says infeasible, try to produce a clearer message
    preflightValidateNetworkPlan(network as any, current as any, target as any);
    throw err;
  }
  const { flows, detail } = result;
  const steps = await rebalanceMinCostFlowSteps(flows, graph, gasEstimator);
  return harden({ graph, model, flows, steps, detail });
};

// ---------------------------- Example (commented) ----------------------------
/*
Example usage:

const { steps } = await planRebalanceFlow(
  {
    nodes: ['Aave_Arbitrum', 'Compound_Arbitrum', 'USDN', '<Deposit>', '@agoric'],
    edges,
  },
  {
    Aave_Arbitrum: AmountMath.make(brand, 1_000n),
    Compound_Arbitrum: AmountMath.make(brand, 100n),
  },
  {
    Aave_Arbitrum: AmountMath.make(brand, 800n),
    Compound_Arbitrum: AmountMath.make(brand, 300n),
  },
  brand,
  'cheapest',
});

console.log(steps);
*/
