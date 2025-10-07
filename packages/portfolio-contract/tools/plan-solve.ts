import makeHighsSolver from 'highs';
import jsLPSolver from 'javascript-lp-solver';
import type { IModel, IModelVariableConstraint } from 'javascript-lp-solver';

import { Fail } from '@endo/errors';

import { AmountMath } from '@agoric/ertp';
import type { Amount, NatAmount } from '@agoric/ertp/src/types.js';
import {
  makeTracer,
  naturalCompare,
  objectMap,
  partialMap,
  provideLazyMap,
  typedEntries,
} from '@agoric/internal';
import type { AxelarChain } from '@agoric/portfolio-api/src/constants.js';

import type { AssetPlaceRef, MovementDesc } from '../src/type-guards-steps.js';
import {
  preflightValidateNetworkPlan,
  formatInfeasibleDiagnostics,
} from './graph-diagnose.js';
import { chainOf, makeGraphFromDefinition } from './network/buildGraph.js';
import type { FlowEdge, RebalanceGraph } from './network/buildGraph.js';
import type { NetworkSpec } from './network/network-spec.js';

const highsSolverP = makeHighsSolver();

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
  getWalletEstimate: (chainName: AxelarChain) => Promise<bigint>;
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
    const { capacity, variableFee, fixedFee = 0, timeFixed = 0 } = edge;

    throughputConstraints[`through_${id}`] = { min: 0, max: capacity };

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

const cplexLpOpForName = { min: '>=', max: '<=', equal: '=' };

/**
 * Convert a javascript-lp-solver Model into CPLEX LP format.
 * https://lim.univ-reunion.fr/staff/fred/Enseignement/Optim/doc/CPLEX-LP/CPLEX-LP-file-format.html
 */
const toCplexLpText = (model: LpModel) => {
  const variableEntries = typedEntries(model.variables);
  const makeSumExpr = attr =>
    partialMap(variableEntries, ([varName, attrs]) => {
      const attrValue = Object.hasOwn(attrs, attr) ? attrs[attr] : 0;
      if (attrValue) return `${attrValue === 1 ? '' : attrValue} ${varName}`;
    }).join(' + ');
  // Variables [and constraints] can be named anything provided that the
  // **name does not exceed 16 characters**.
  const mappedAttrs = new Map();
  const mode: 'MIN' | 'MAX' = model.opType.toUpperCase();
  const text = `
${mode}
  ${model.optimize}: ${makeSumExpr(model.optimize)}
SUBJECT TO
  ${typedEntries(model.constraints)
    .flatMap(([attr, constraint]) => {
      let attrParts = attr.split('_');
      if (attrParts[0] === 'through') {
        attrParts[0] = 'thru';
      } else if (attrParts[0] !== 'allow') {
        // Replace everything after the first "_" with a unique counter.
        attrParts = [
          attrParts[0],
          provideLazyMap(mappedAttrs, attr, () => mappedAttrs.size + 1),
        ];
      }
      const prefix = attrParts.join('_');
      const lines = [`\\# ${attr} ${prettyJsonable(constraint)}`];
      for (const [opName, value] of Object.entries(constraint)) {
        const label = `${prefix}_${opName.slice(0, 3)}`;
        const op = cplexLpOpForName[opName];
        lines.push(`${label}: ${makeSumExpr(attr)} ${op} ${value}`);
      }
      return lines;
    })
    .join('\n  ')}
BINARY
  ${Object.keys(model.binaries).join(' ')}
GENERAL
  ${Object.keys(model.ints).join(' ')}
END`.trim();
  return `${text}\n`;
};

// This operation is async to allow future use of async solvers if needed
export const solveRebalance = async (
  model: LpModel,
  graph: RebalanceGraph,
): Promise<{ flows: SolvedEdgeFlow[]; detail?: Record<string, unknown> }> => {
  const cplexLpText = toCplexLpText(model);
  const matrixResult = await Promise.resolve(highsSolverP)
    .then(solver => solver.solve(cplexLpText))
    .catch(error => ({ Status: undefined, error }));
  if (matrixResult.Status !== 'Optimal') {
    // Switch to javascript-lp-solver for diagnostics.
    const jsResult = jsLPSolver.Solve(model, 1e-9);
    if (graph.debug) {
      // Emit richer context only on demand to avoid noisy passing runs
      const { error } = matrixResult as any;
      if (error) {
        console.error('[CPLEX LP solver] Error:', error.message, cplexLpText);
        throw Fail`Invalid CPLEX LP model: ${error.message}`;
      }
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
    const flow = matrixResult.Columns[flowKey]?.Primal;
    const used = (flow ?? 0) > FLOW_EPS;
    if (used) flows.push({ edge, flow, used: true });
  }
  return { flows, detail: { cplexLpText, matrixResult } };
};

export const rebalanceMinCostFlowSteps = async (
  flows: SolvedEdgeFlow[],
  graph: RebalanceGraph,
  gasEstimator: GasEstimator,
): Promise<MovementDesc[]> => {
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
    const candidates = [...pendingFlows.values()].filter(
      f => (supplies.get(f.edge.src) || 0) >= f.flow,
    );

    if (!candidates.length) {
      // Deadlock mitigation: pick by edge id order regardless of availability.
      const sorted = [...pendingFlows.values()].sort((a, b) =>
        naturalCompare(a.edge.id, b.edge.id),
      );
      for (const f of sorted) {
        prioritized.push(f);
        replaceOrInit(supplies, f.edge.src, (old = 0) => old - f.flow);
        replaceOrInit(supplies, f.edge.dest, (old = 0) => old + f.flow);
        pendingFlows.delete(f.edge.id);
      }
      break;
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
   * execution.
   */
  const padFeeEstimate = (estimate: bigint): bigint => estimate * 3n;

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
        case 'poolToEvm':
        case 'evmToPool': {
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(edge.dest) as AxelarChain,
          );
          details = {
            fee: AmountMath.make(graph.feeBrand, padFeeEstimate(feeValue)),
          };
          break;
        }
        case 'evmToNoble': {
          const feeValue = await gasEstimator.getWalletEstimate(
            chainOf(edge.src) as AxelarChain,
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
