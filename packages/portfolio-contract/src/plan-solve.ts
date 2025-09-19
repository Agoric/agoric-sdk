import type { Amount } from '@agoric/ertp';
import { AmountMath } from '@agoric/ertp';
import type { NatAmount } from '@agoric/ertp/src/types.js';

import { Fail } from '@endo/errors';
import jsLPSolver from 'javascript-lp-solver';
import type { IModel, IModelVariableConstraint } from 'javascript-lp-solver';
import { makeTracer, objectMap, typedEntries } from '@agoric/internal';
import { PoolPlaces, type PoolKey } from './type-guards.js';
import type { AssetPlaceRef, MovementDesc } from './type-guards-steps.js';
import type { NetworkSpec } from './network/network-spec.js';
import { makeGraphFromDefinition } from './network/buildGraph.js';
import {
  preflightValidateNetworkPlan,
  formatInfeasibleDiagnostics,
} from './graph-diagnose.js';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
const trace = makeTracer('solve');

// ----------------------------------- Types -----------------------------------

/**
 * A chain hub node id looks like '@agoric', '@noble', '@Arbitrum', etc.
 * Leaf nodes: PoolKey, '<Cash>', '<Deposit>', '+agoric'
 */

/** Internal edge representation */
export interface FlowEdge {
  id: string;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  capacity: number; // numeric for LP; derived from bigint
  variableFee: number; // cost coefficient per unit flow
  fixedFee?: number; // optional fixed cost (cheapest mode)
  timeFixed?: number; // optional time cost (fastest mode)
  via?: string; // annotation (e.g. 'intra-chain', 'cctp', etc.)
}

/** Node supply: positive => must send out; negative => must receive */
export interface SupplyMap {
  [node: string]: number;
}

/** Graph structure */
export interface RebalanceGraph {
  nodes: Set<AssetPlaceRef>;
  edges: FlowEdge[];
  supplies: SupplyMap;
  brand: Amount['brand'];
  scale: number;
  /** When true, print extra diagnostics on solver failure */
  debug?: boolean;
}

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

// --- keep existing type declarations above ---

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

/**
 * Build base graph with:
 * - Hub nodes for each chain discovered in placeRefs (auto-added as '@chain')
 * - Leaf nodes for each placeRef (except hubs already formatted)
 * - Intra-chain bidirectional edges leaf <-> hub (variableFee=1, timeFixed=1)
 * - Supplies = current - target; if target missing, assume unchanged (target=current)
 */
export const buildBaseGraph = (
  placeRefs: AssetPlaceRef[],
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
  brand: Amount['brand'],
  _scale: number = 1,
): RebalanceGraph => {
  const nodes = new Set<AssetPlaceRef>();
  const edges: FlowEdge[] = [];
  const supplies: SupplyMap = {};

  // Collect chains needed
  for (const ref of placeRefs) {
    nodes.add(ref);
    const chain = chainOf(ref);
    nodes.add(`@${chain}` as AssetPlaceRef);
  }

  // Build supplies (signed deltas)
  for (const node of nodes) {
    const currentVal = current[node]?.value ?? 0n;
    const targetSpecified = Object.prototype.hasOwnProperty.call(target, node);
    const targetVal = targetSpecified ? target[node]!.value : currentVal; // unchanged if unspecified
    const delta = currentVal - targetVal;
    // NOTE: Number(bigint) loses precision beyond MAX_SAFE_INTEGER (2^53-1)
    // For USDC amounts (6 decimals), the largest realistic value would be trillions
    // of dollars, which should be well within safe integer range.
    if (delta !== 0n) supplies[node] = Number(delta);
  }

  // Intra-chain edges (leaf <-> hub)
  let eid = 0;
  const vf = 1; // direct variable fee per unit
  const tf = 1; // time cost unit (seconds or abstract)
  for (const node of nodes) {
    if (isHub(node)) continue;

    const hub = `@${chainOf(node)}` as AssetPlaceRef;
    if (node === hub) continue;

    const base: Omit<FlowEdge, 'src' | 'dest' | 'id'> = {
      capacity: (Number.MAX_SAFE_INTEGER + 1) / 4,
      variableFee: vf,
      fixedFee: 0,
      timeFixed: tf,
      via: 'intra-chain',
    };

    // eslint-disable-next-line no-plusplus
    edges.push({ id: `e${eid++}`, src: node, dest: hub, ...base });

    // Skip @agoric → +agoric edge
    if (node === '+agoric') continue;

    // eslint-disable-next-line no-plusplus
    edges.push({ id: `e${eid++}`, src: hub, dest: node, ...base });
  }

  // Return mutable graph (do NOT harden so we can add inter-chain links later)
  return {
    nodes,
    edges,
    supplies,
    brand,
    scale: 1,
    debug: false,
  } as RebalanceGraph;
};

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
  const constraints = {} as Record<string, IModelVariableConstraint>;
  let minPrimaryWeight = Infinity;
  for (const edge of graph.edges) {
    const { id, src, dest } = edge;
    const { capacity, variableFee, fixedFee = 0, timeFixed = 0 } = edge;

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

    const intVar: IntVar = {
      // A negative value for `allow_${id}` forces the solution to include 1
      // `pick_${id}` (and the corresponding fixed costs) in order to satisfy
      // that attribute's min: 0 constraint below.
      [`allow_${id}`]: -1,
      [`through_${id}`]: 1,
      [`netOut_${src}`]: 1,
      [`netOut_${dest}`]: -1,
      magnifiedVariableFee,
      weight: 0, // increased below
    };
    intVariables[`via_${id}`] = intVar;

    constraints[`allow_${id}`] = { min: 0 };
    constraints[`through_${id}`] = { max: capacity };

    const binaryVar = {
      [`allow_${id}`]: Number.MAX_SAFE_INTEGER,
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
  }

  // Constrain the net flow from each node.
  for (const node of graph.nodes) {
    const supply = graph.supplies[node] || 0;
    constraints[`netOut_${node}`] = { equal: supply };
  }

  return {
    optimize: 'weight',
    opType: 'min',
    constraints,
    variables: { ...intVariables, ...binaryVariables },
    binaries: objectMap(binaryVariables, () => true),
    ints: objectMap(intVariables, () => true),
  };
};

// solveRebalance: use javascript-lp-solver directly
// This operation is async to allow future use of async solvers if needed
export const solveRebalance = async (
  model: LpModel,
  graph: RebalanceGraph,
): Promise<SolvedEdgeFlow[]> => {
  const result = jsLPSolver.Solve(model, 1e-6);
  if (result.feasible !== true) {
    if (graph.debug) {
      // Emit richer context only on demand to avoid noisy passing runs
      const msg = formatInfeasibleDiagnostics(graph, model);
      console.error('[solver] No feasible solution. Diagnostics:', msg);
      throw Fail`No feasible solution: ${msg}`;
    }
    throw Fail`No feasible solution`;
  }
  const flows: SolvedEdgeFlow[] = [];
  for (const edge of graph.edges) {
    const { id } = edge;
    const flowKey = `via_${id}`;
    const flow = Object.hasOwn(result, flowKey) ? result[flowKey] : undefined;
    const used = (flow ?? 0) > FLOW_EPS || result[`pick_${id}`];
    if (used) flows.push({ edge, flow, used: true });
  }
  return flows;
};

// Re-add / ensure intact helper (heuristic extraction)
export const rebalanceMinCostFlowSteps = (
  flows: SolvedEdgeFlow[],
  graph: RebalanceGraph,
): MovementDesc[] => {
  const available: Record<string, number> = {};
  for (const [node, sup] of Object.entries(graph.supplies))
    if (sup > 0) available[node] = sup;

  const work = flows
    .filter(f => f.flow > FLOW_EPS)
    .map(f => ({ edge: f.edge, flow: f.flow }));

  const edgeIdNum = (e: FlowEdge) => Number(e.id.slice(1));
  const scheduled: { edge: FlowEdge; flow: number }[] = [];
  const pending = new Set(work.map(w => w.edge.id));
  const edgeById: Record<string, { edge: FlowEdge; flow: number }> = {};
  for (const w of work) edgeById[w.edge.id] = w;

  // Maintain last chosen originating chain to group sequential operations
  let lastChain: string | undefined;

  while (pending.size) {
    const candidates: { edge: FlowEdge; flow: number; chain: string }[] = [];
    for (const id of pending) {
      const { edge, flow } = edgeById[id];
      const avail = available[edge.src] || 0;
      if (avail + 1e-12 >= flow) {
        candidates.push({
          edge,
          flow,
          chain: chainOf(edge.src),
        });
      }
    }
    if (!candidates.length) {
      // Deadlock fallback: schedule by id order regardless of availability
      const fallback = [...pending]
        .map(id => edgeById[id])
        .sort((a, b) => edgeIdNum(a.edge) - edgeIdNum(b.edge));
      for (const w of fallback) {
        scheduled.push(w);
        available[w.edge.src] = (available[w.edge.src] || 0) - w.flow;
        available[w.edge.dest] = (available[w.edge.dest] || 0) + w.flow;
        pending.delete(w.edge.id);
      }
      break;
    }

    // Group by chain; prefer continuing with lastChain if present
    let chosenGroup = candidates;
    if (lastChain) {
      const same = candidates.filter(c => c.chain === lastChain);
      if (same.length) chosenGroup = same;
    }
    // Pick deterministic smallest edge id within chosen group
    chosenGroup.sort((a, b) => edgeIdNum(a.edge) - edgeIdNum(b.edge));
    const chosen = chosenGroup[0];
    scheduled.push(chosen);
    lastChain = chosen.chain; // update grouping chain
    available[chosen.edge.src] =
      (available[chosen.edge.src] || 0) - chosen.flow;
    available[chosen.edge.dest] =
      (available[chosen.edge.dest] || 0) + chosen.flow;
    pending.delete(chosen.edge.id);
  }

  const steps: MovementDesc[] = scheduled.map(({ edge, flow }) => {
    // XXX generate tests for this
    assert(Number.isSafeInteger(flow));
    return {
      src: edge.src as AssetPlaceRef,
      dest: edge.dest as AssetPlaceRef,
      // NOTE: BigInt(number) throws for non-integer/non-finite values
      amount: AmountMath.make(graph.brand, BigInt(flow)),
    };
  });

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
  mode?: RebalanceMode;
}) => {
  const { network, current, target, brand, mode = 'fastest' } = opts;
  // TODO remove "automatic" values that should be static
  const graph = makeGraphFromDefinition(network, current, target, brand);

  const model = buildLPModel(graph, mode);
  let flows;
  await null;
  try {
    flows = await solveRebalance(model, graph);
  } catch (err) {
    // If the solver says infeasible, try to produce a clearer message
    preflightValidateNetworkPlan(network as any, current as any, target as any);
    throw err;
  }
  const steps = rebalanceMinCostFlowSteps(flows, graph);
  return harden({ graph, model, flows, steps });
};

const chainOf = (id: AssetPlaceRef): string => {
  if (id.startsWith('@')) return id.slice(1);
  if (id === '<Cash>' || id === '<Deposit>' || id === '+agoric')
    return 'agoric';
  if (id in PoolPlaces) {
    const pk = id as PoolKey;
    return PoolPlaces[pk].chainName;
  }
  // Fallback: syntactic pool id like "Protocol_Chain" => chain
  // This enables base graph edges for pools even if not listed in PoolPlaces
  const m = /^([A-Za-z0-9]+)_([A-Za-z0-9-]+)$/.exec(id);
  if (m) {
    return m[2];
  }
  throw Fail`Cannot determine chain for ${id}`;
};
const isHub = (id: AssetPlaceRef): boolean => id.startsWith('@');

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
