import type { Amount } from '@agoric/ertp';
import { AmountMath } from '@agoric/ertp';
import type { NatAmount } from '@agoric/ertp/src/types.js';
import type { AssetPlaceRef, MovementDesc } from './type-guards-steps.js';
import { PoolPlaces, type PoolKey } from './type-guards.js';
import type {
  AxelarChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import { Fail } from '@endo/errors';
import jsLPSolver from 'javascript-lp-solver';
import { makeTracer } from '@agoric/internal';
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

const provideRecord = <
  K1 extends PropertyKey,
  C extends Record<K1, Record<PropertyKey, unknown>>,
>(
  container: C,
  key: K1,
): C[K1] => (container[key] ??= {} as C[K1]);

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

/** Model shape for javascript-lp-solver (loosely typed) */
export interface LpModel {
  optimize: string;
  opType: 'min' | 'max';
  constraints: Record<string, Record<string, number>>;
  variables: Record<
    string,
    Record<string, number> & {
      int?: Record<string, 1>;
      binary?: Record<string, 1>;
    }
  >;
  ints?: Record<string, 1>;
  binaries?: Record<string, 1>;
}

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

// Simplified helpers (identity conversions)
const scaleBigInt = (n: bigint): number => Number(n);

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
    if (delta !== 0n) supplies[node] = scaleBigInt(delta);
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

/**
 * Add a directed inter-chain link between hub nodes (and optional reverse if needed externally).
 */
// addInterchainLink removed; inter-hub edges are added directly in makeGraphFromDefinition

// ------------------------------ Model Building -------------------------------

/**
 * Build LP/MIP model for javascript-lp-solver.
 */
export const buildLPModel = (
  graph: RebalanceGraph,
  mode: RebalanceMode,
): LpModel => {
  const model: LpModel = {
    optimize: 'goal',
    opType: 'min',
    constraints: {},
    variables: {},
  };
  const { constraints, variables, binaries = {} } = model;
  const primaryObj: Record<string, number> = {};
  const secondaryObj: Record<string, number> = {};

  // Compute a conservative total positive supply bound (S) for flows
  const totalPositiveSupply = Object.values(graph.supplies)
    .filter(s => s > 0)
    .reduce((a, b) => a + b, 0);
  for (const edge of graph.edges) {
    const flowVar = `f_${edge.id}`;
    const useVar = `y_${edge.id}`;
    variables[flowVar] = { [flowVar]: 1 };
    const capName = `cap_${edge.id}`;
    constraints[capName] = { [flowVar]: 1, max: edge.capacity };
    // Non-negativity: f_e >= 0
    const lbName = `lb_${edge.id}`;
    constraints[lbName] = { [flowVar]: 1, min: 0 };
    const needsFixed =
      (mode === 'cheapest' && edge.fixedFee && edge.fixedFee > 0) ||
      (mode === 'fastest' && edge.timeFixed && edge.timeFixed > 0);
    if (needsFixed) {
      variables[flowVar][useVar] = 0;
      binaries[useVar] = 1;
      const linkName = `link_${edge.id}`;
      constraints[linkName] = {
        [flowVar]: 1,
        [useVar]: -edge.capacity,
        max: 0,
      };
      if (mode === 'cheapest' && edge.fixedFee) {
        objectiveTerm[useVar] = (objectiveTerm[useVar] || 0) + edge.fixedFee;
      }
      if (mode === 'fastest' && edge.timeFixed) {
        objectiveTerm[useVar] = (objectiveTerm[useVar] || 0) + edge.timeFixed;
      }
    }
    if (mode === 'cheapest' && edge.variableFee) {
      objectiveTerm[flowVar] = (objectiveTerm[flowVar] || 0) + edge.variableFee;
    }
    const outC = provideRecord(constraints, `node_${edge.src}`);
    outC[flowVar] = (outC[flowVar] || 0) + 1;
    const inC = provideRecord(constraints, `node_${edge.dest}`);
    inC[flowVar] = (inC[flowVar] || 0) - 1;
  }
  for (const node of graph.nodes) {
    const cname = `node_${node}`;
    const supply = graph.supplies[node] || 0;
    if (!constraints[cname]) continue;
    constraints[cname].equal = supply;
  }
  const model: LpModel = {
    optimize: 'obj',
    opType: 'min',
    constraints,
    variables: {
      // objective variable collects coefficients
      obj: { obj: 1, ...objectiveTerm },
      ...variables,
    },
  };
  if (Object.keys(binaries).length) model.binaries = binaries;
  return model;
};

// NEW: translate intermediate LpModel to js-lp-solver compatible model
export interface JsSolverModel {
  optimize: string;
  opType: 'min' | 'max';
  constraints: Record<string, { equal?: number; max?: number; min?: number }>;
  variables: Record<string, Record<string, number>>;
  binaries?: Record<string, 1>;
  ints?: Record<string, 1>;
}

const toJsSolverModel = (lp: LpModel): JsSolverModel => {
  const optimizeKey = 'cost';
  // Extract objective coefficients from synthetic obj variable
  const objectiveTerms: Record<string, number> = {};
  const objVar = lp.variables.obj || {};
  for (const [k, v] of Object.entries(objVar)) {
    if (k === 'obj') continue;
    if (typeof v === 'number') objectiveTerms[k] = v;
  }
  // Build constraints bounds only + accumulate variable coefficients
  const constraints: JsSolverModel['constraints'] = {};
  const variables: Record<string, Record<string, number>> = {};
  for (const [cName, spec] of Object.entries(lp.constraints)) {
    const bounds: { equal?: number; max?: number; min?: number } = {};
    if (typeof (spec as any).equal === 'number')
      bounds.equal = (spec as any).equal;
    if (typeof (spec as any).max === 'number') bounds.max = (spec as any).max;
    if (typeof (spec as any).min === 'number') bounds.min = (spec as any).min;
    constraints[cName] = bounds;
    for (const [vName, coeff] of Object.entries(spec)) {
      if (vName === 'equal' || vName === 'max' || vName === 'min') continue;
      provideRecord(variables, vName)[cName] = coeff as number;
    }
  }
  // Apply objective coefficients under optimizeKey
  for (const [vName, coeff] of Object.entries(objectiveTerms)) {
    provideRecord(variables, vName)[optimizeKey] = coeff;
  }
  const jsModel: JsSolverModel = {
    optimize: optimizeKey,
    opType: 'min',
    constraints,
    variables,
  };
  if (lp.binaries && Object.keys(lp.binaries).length)
    jsModel.binaries = lp.binaries;
  if (lp.ints && Object.keys(lp.ints).length) jsModel.ints = lp.ints;
  return jsModel;
};

const runJsSolver = (model: JsSolverModel) => {
  const res = (jsLPSolver as any).Solve(model);
  return res as {
    result: number;
    feasible: boolean;
    bounded: boolean;
  } & Record<string, number | unknown>;
};

// solveRebalance: use javascript-lp-solver directly
// This operation is async to allow future use of async solvers if needed
export const solveRebalance = async (
  model: LpModel,
  graph: RebalanceGraph,
): Promise<SolvedEdgeFlow[]> => {
  const jsModel = toJsSolverModel(model);
  // Use trace() sparingly; keep commented unless deep debugging is needed
  const result = runJsSolver(jsModel);
  // js-lp-solver returns feasible flag; treat absence as failure
  if ((result as any).feasible === false) {
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
    const vName = `f_${edge.id}`;
    const flowVal = (result as any)[vName];
    if (typeof flowVal === 'number' && Math.abs(flowVal) > FLOW_EPS) {
      const used = (result as any)[`y_${edge.id}`] === 1 || flowVal > FLOW_EPS;
      flows.push({ edge, flow: flowVal, used });
    }
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
      amount: AmountMath.make(graph.brand, BigInt(flow)),
    };
  });

  return harden(steps);
};

// -------------------------- Convenience End-to-End ---------------------------

/**
 * Full pipeline (network required):
 * 1. build graph from NetworkDefinition
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
  // TODO remove "automatic" values that shoudl be static
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

// Helpers reinstated after scaling removal
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
