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
import { solve as yalpsSolve } from 'yalps';
import type {
  Model as YalpsModel,
  // Constraint,
  // Coefficients,
  // OptimizationDirection,
  // Options,
  // Solution,
} from 'yalps';

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
export type GraphNodeId = AssetPlaceRef | PoolKey;

/** Internal edge representation */
export interface FlowEdge {
  id: string;
  src: GraphNodeId;
  dest: GraphNodeId;
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
  nodes: Set<GraphNodeId>;
  edges: FlowEdge[];
  supplies: SupplyMap;
  brand: Amount['brand'];
  scale: number;
}

/** Options for adding an inter-chain edge */
export interface InterchainLinkSpec {
  srcChain: string; // without leading @
  destChain: string; // without leading @
  capacity?: bigint;
  variableFee?: number;
  fixedFee?: number;
  timeFixed?: number;
  via?: string;
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
const AMOUNT_SCALE = 1e3;
const FLOW_EPS = 1e-6;

// Added helper for signed bigint delta scaling (distinct from scaleAmountBigInt for clarity)
const scaleBigInt = (n: bigint): number => {
  const num = Number(n);
  if (!Number.isFinite(num)) {
    throw Fail`BigInt ${n} exceeds numeric range for solver`;
  }
  return num / AMOUNT_SCALE; // preserves sign
};
const scaleAmountBigInt = (n: bigint): number => {
  const num = Number(n);
  if (!Number.isFinite(num)) {
    throw Fail`BigInt ${n} exceeds numeric range for solver`;
  }
  return num / AMOUNT_SCALE;
};
const scaleAmount = (a: NatAmount): number => scaleAmountBigInt(a.value);
const scaleVariableFee = (feeNative: number): number =>
  feeNative / AMOUNT_SCALE;
const scaleLatency = (seconds?: number) =>
  seconds === undefined ? undefined : seconds / 60;

// --------------------------- Helpers ---------------------------

const chainOf = (id: GraphNodeId): string => {
  if (id.startsWith('@')) return id.slice(1);
  if (id === '<Cash>' || id === '<Deposit>' || id === '+agoric')
    return 'agoric';
  if (id in PoolPlaces) {
    const pk = id as PoolKey;
    return PoolPlaces[pk].chainName;
  }
  throw Fail`Cannot determine chain for ${id}`;
};

// Identify if node is chain hub
const isHub = (id: GraphNodeId): boolean => id.startsWith('@');

// --------------------------- Graph Construction ---------------------------

/**
 * Build base graph with:
 * - Hub nodes for each chain discovered in placeRefs (auto-added as '@chain')
 * - Leaf nodes for each placeRef (except hubs already formatted)
 * - Intra-chain bidirectional edges leaf <-> hub (variableFee=1, timeFixed=1)
 * - Supplies = current - target (scaled to numbers)
 *
 * @param placeRefs nodes (leaves + any explicit hubs)
 * @param current current balances (NatAmount)
 * @param target target balances (NatAmount)
 * @param brand common brand
 * @param scale numeric scaling divisor (default 1)
 */
export const buildBaseGraph = (
  placeRefs: GraphNodeId[],
  current: Partial<Record<GraphNodeId, NatAmount>>,
  target: Partial<Record<GraphNodeId, NatAmount>>,
  brand: Amount['brand'],
  scale = AMOUNT_SCALE,
): RebalanceGraph => {
  const nodes = new Set<GraphNodeId>();
  const edges: FlowEdge[] = [];
  const supplies: SupplyMap = {};

  // Collect chains needed
  for (const ref of placeRefs) {
    nodes.add(ref);
    const chain = chainOf(ref);
    nodes.add(`@${chain}` as GraphNodeId);
  }

  // Build supplies (signed deltas)
  for (const node of nodes) {
    const currentVal = current[node]?.value ?? 0n;
    const targetVal = target[node]?.value ?? 0n;
    const delta = currentVal - targetVal; // signed bigint
    if (delta !== 0n) supplies[node] = scaleBigInt(delta);
  }

  // Intra-chain edges (leaf <-> hub)
  let eid = 0;
  const vf = scaleVariableFee(1); // $1 per native unit, scaled
  const tf = scaleLatency(60); // 1 minute latency
  for (const node of nodes) {
    if (isHub(node)) continue;
    const hub = `@${chainOf(node)}` as GraphNodeId;
    if (node === hub) continue;

    const base: Omit<FlowEdge, 'src' | 'dest' | 'id'> = {
      capacity: Number.MAX_SAFE_INTEGER / 4, // large capacity
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
  return { nodes, edges, supplies, brand, scale } as RebalanceGraph;
};

/**
 * Add a directed inter-chain link between hub nodes (and optional reverse if needed externally).
 */
export const addInterchainLink = (
  graph: RebalanceGraph,
  spec: InterchainLinkSpec,
) => {
  const {
    srcChain,
    destChain,
    capacity = 9_007_199_254_740_000n,
    variableFee = 0,
    fixedFee,
    timeFixed,
    via = 'inter-chain',
  } = spec;
  const src = `@${srcChain}` as GraphNodeId;
  const dest = `@${destChain}` as GraphNodeId;
  if (!graph.nodes.has(src) || !graph.nodes.has(dest)) {
    throw Fail`Chain hubs missing for link ${src}->${dest}`;
  }
  const cap = scaleAmountBigInt(capacity);
  const vFeeModel = scaleVariableFee(variableFee);
  const tFixedModel = scaleLatency(timeFixed);
  graph.edges.push({
    id: `e${graph.edges.length}`,
    src,
    dest,
    capacity: cap,
    variableFee: vFeeModel,
    fixedFee,
    timeFixed: tFixedModel,
    via,
  });
};

// ------------------------------ Model Building -------------------------------

/**
 * Build LP/MIP model for javascript-lp-solver.
 */
export const buildModel = (
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
    ensureConstraint(capName)[flowVar] = 1;
    constraints[capName].max = edge.capacity;
    const needsFixed =
      (mode === 'cheapest' && edge.fixedFee && edge.fixedFee > 0) ||
      (mode === 'fastest' && edge.timeFixed && edge.timeFixed > 0);
    if (needsFixed) {
      variables[flowVar][useVar] = 0;
      binaries[useVar] = 1;
      const linkName = `link_${edge.id}`;
      ensureConstraint(linkName)[flowVar] = 1;
      ensureConstraint(linkName)[useVar] = -edge.capacity;
      constraints[linkName].max = 0;
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

// NEW: translate intermediate LpModel to YALPS model (remove unsupported bounds)
const toYalpsModel = (lp: LpModel): YalpsModel => {
  // YALPS model (as used here) supports: objective, constraints, binaries
  const constraints: YalpsModel['constraints'] = [];
  const binaries = new Set<string>();
  const objectiveTerms: Record<string, number> = {};

  // Extract objective coefficients (skip the synthetic 'obj' key)
  const objVars = lp.variables.obj;
  for (const [k, v] of Object.entries(objVars)) {
    if (k === 'obj') continue;
    objectiveTerms[k] = v;
  }

  // Translate constraints
  for (const [, cSpec] of Object.entries(lp.constraints)) {
    const terms: Record<string, number> = {};
    let sense: 'eq' | 'leq' = 'leq';
    let rhs = 0;
    for (const [v, coeff] of Object.entries(cSpec)) {
      if (v === 'max' || v === 'equal' || v === 'min') continue;
      terms[v] = coeff;
    }
    if ('equal' in cSpec) {
      sense = 'eq';
      rhs = cSpec.equal!;
    } else if ('max' in cSpec) {
      sense = 'leq';
      rhs = cSpec.max!;
    } else {
      continue;
    }
    constraints.push({ terms, sense, rhs });
  }

  if (lp.binaries) {
    for (const b of Object.keys(lp.binaries)) {
      binaries.add(b);
    }
  }

  return {
    objective: { direction: 'min', terms: objectiveTerms },
    constraints,
    binaries,
  };
};

// Adjusted runYalps (no bounds handling)
type YalpsResult = {
  status: string;
  objective: number;
  values: Record<string, number>;
};

const runYalps = (model: YalpsModel): YalpsResult => {
  const res = yalpsSolve(model) as any;
  return {
    status: res.status || res.result || 'unknown',
    objective: res.objective,
    values: res.variables || res.values || {},
  };
};

// REPLACED: solveRebalance now uses YALPS (static import, no dynamic import)
export const solveRebalance = async (
  model: LpModel,
  graph: RebalanceGraph,
): Promise<SolvedEdgeFlow[]> => {
  const yalpsModel = toYalpsModel(model);
  const result = runYalps(yalpsModel);
  if (result.status !== 'optimal') {
    throw Fail`No feasible solution (status: ${result.status})`;
  }
  const flows: SolvedEdgeFlow[] = [];
  for (const edge of graph.edges) {
    const vName = `f_${edge.id}`;
    const flowVal = result.values[vName];
    if (flowVal !== undefined && Math.abs(flowVal) > FLOW_EPS) {
      const used = result.values[`y_${edge.id}`] === 1 || flowVal > FLOW_EPS;
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
  const isHub = (n: string) => n.startsWith('@');

  // Categorize for deterministic ordering
  // 0: leaf->hub, 1: hub->hub, 2: hub->leaf
  type Cat = 0 | 1 | 2;
  const catOf = (e: FlowEdge): Cat =>
    !isHub(e.src) && isHub(e.dest)
      ? 0
      : isHub(e.src) && isHub(e.dest)
        ? 1
        : 2;

  const active = flows
    .filter(f => f.flow > FLOW_EPS)
    .map(f => ({
      edge: f.edge,
      amt: BigInt(Math.round(f.flow * graph.scale)),
      cat: catOf(f.edge),
    }));

  active.sort((a, b) => {
    if (a.cat !== b.cat) return a.cat - b.cat;
    const ai = Number(a.edge.id.slice(1));
    const bi = Number(b.edge.id.slice(1));
    return ai - bi;
  });

  const steps: MovementDesc[] = active.map(({ edge, amt }) => ({
    src: edge.src as AssetPlaceRef,
    dest: edge.dest as AssetPlaceRef,
    amount: AmountMath.make(graph.brand, amt),
  }));

  return harden(steps);
};

// -------------------------- Convenience End-to-End ---------------------------

/**
 * Full pipeline:
 * 1. buildBaseGraph
 * 2. add inter-chain links (caller)
 * 3. buildModel
 * 4. solveRebalance
 * 5. rebalanceMinCostFlowSteps
 */
export const planRebalanceFlow = async (opts: {
  placeRefs: GraphNodeId[];
  current: Partial<Record<GraphNodeId, NatAmount>>;
  target: Partial<Record<GraphNodeId, NatAmount>>;
  brand: Amount['brand'];
  links?: InterchainLinkSpec[];
  mode?: RebalanceMode;
  scale?: number;
}) => {
  const {
    placeRefs,
    current,
    target,
    brand,
    links = [],
    mode = 'cheapest',
    scale = 1,
  } = opts;

  const graph = buildBaseGraph(placeRefs, current, target, brand, scale);
  // Ensure hubs referenced only in links (e.g. noble) are present before adding edges
  for (const { srcChain, destChain } of links) {
    graph.nodes.add(`@${srcChain}` as GraphNodeId);
    graph.nodes.add(`@${destChain}` as GraphNodeId);
  }
  for (const l of links) addInterchainLink(graph, l);

  const model = buildModel(graph, mode);
  const flows = await solveRebalance(model, graph);
  const steps = rebalanceMinCostFlowSteps(flows, graph);
  return harden({ graph, model, flows, steps });
};

// --------------------------- Example (commented) ---------------------------
/*
Example usage:

const { steps } = await planRebalanceFlow({
  placeRefs: ['Aave_Arbitrum', 'Compound_Arbitrum', 'USDN', '<Deposit>', '@agoric'],
  current: {
    Aave_Arbitrum: AmountMath.make(brand, 1_000n),
    Compound_Arbitrum: AmountMath.make(brand, 100n),
  },
  target: {
    Aave_Arbitrum: AmountMath.make(brand, 800n),
    Compound_Arbitrum: AmountMath.make(brand, 300n),
  },
  brand,
  links: [
    { srcChain: 'agoric', destChain: 'Arbitrum', variableFee: 5, timeFixed: 2 },
    { srcChain: 'Arbitrum', destChain: 'agoric', variableFee: 5, timeFixed: 2 },
  ],
  mode: 'cheapest',
});

console.log(steps);
*/
