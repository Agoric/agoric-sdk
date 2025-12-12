import { Fail } from '@endo/errors';

import { zeroPad } from '@endo/marshal';

import type { NatAmount } from '@agoric/ertp/src/types.js';
import { partialMap, typedEntries } from '@agoric/internal/src/js-utils.js';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';

import { PoolPlaces } from '../../src/type-guards.js';
import type { PoolKey } from '../../src/type-guards.js';
import type { AssetPlaceRef } from '../../src/type-guards-steps.js';

import type { FeeMode, LinkSpec, NetworkSpec } from './network-spec.js';

/** Node supply: positive => must send out; negative => must receive */
export interface SupplyMap {
  [node: string]: number;
}

/** Internal edge representation */
export type FlowEdge = LinkSpec & { id: string };

/**
 * Graph structure.
 * Leaf nodes look like PoolKey, `<$SeatName>` (e.g. "<Deposit>" or "<Cash>"),
 * or "+agoric".
 * Interior nodes represent chains and start with "@" ("@agoric", "@noble",
 * "@Arbitrum", etc.).
 */
export interface FlowGraph {
  /** When true, print extra diagnostics on solver failure */
  debug?: boolean;
  nodes: Set<AssetPlaceRef>;
  edges: FlowEdge[];
  supplies: SupplyMap;
}

export const chainOf = (id: AssetPlaceRef): string => {
  if (id.startsWith('<') || id === '+agoric') return 'agoric';
  if (id.startsWith('@')) return id.slice(1);
  if (Object.hasOwn(PoolPlaces, id)) return PoolPlaces[id as PoolKey].chainName;

  // Fallback: syntactic pool id like "Protocol_Chain" => chain
  // This enables base graph edges for pools even if not listed in PoolPlaces
  const m = /^([A-Za-z0-9]+)_([A-Za-z0-9-]+)$/.exec(id);
  if (m) return m[2];

  throw Fail`Cannot determine chain for ${id}`;
};

const localFlowEdgeBase: Omit<FlowEdge, 'src' | 'dest' | 'id'> = {
  variableFeeBps: 1,
  flatFee: 0n,
  timeSec: 1,
  transfer: 'local',
};

/**
 * Build the base of a FlowGraph for current/target Amounts.
 * Guarantees a "@$chain" hub node for each AssetPlaceRef and minimal-cost
 * intra-chain leaf <-> hub edges (unidirectional within the Agoric chain and
 * bidirectional otherwise).
 */
const makeGraphBase = (
  placeRefs: AssetPlaceRef[],
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
): FlowGraph => {
  const nodes = new Set<AssetPlaceRef>();
  const supplies: SupplyMap = {};
  const edges: FlowEdge[] = [];
  const addEdge = (
    src: AssetPlaceRef,
    dest: AssetPlaceRef,
    feeMode?: FeeMode,
  ) => {
    const overrides = feeMode && { feeMode };
    edges.push({ id: 'TBD', src, dest, ...localFlowEdgeBase, ...overrides });
  };

  // Collect chains needed
  for (const ref of placeRefs) {
    nodes.add(ref);
    const chain = chainOf(ref);
    nodes.add(`@${chain}` as AssetPlaceRef);
  }

  // Build supplies (signed deltas)
  for (const node of nodes) {
    const currentVal = current[node]?.value ?? 0n;
    const targetSpecified = Object.hasOwn(target, node);
    const targetVal = targetSpecified ? target[node]!.value : currentVal; // unchanged if unspecified
    const delta = currentVal - targetVal;
    // NOTE: Number(bigint) loses precision beyond MAX_SAFE_INTEGER (2^53-1)
    // For USDC amounts (6 decimals), the largest realistic value would be trillions
    // of dollars, which should be well within safe integer range.
    if (delta !== 0n) supplies[node] = Number(delta);
  }

  // Ensure non-Agoric intra-chain edges (leaf <-> hub)
  for (const node of nodes) {
    const chainName = chainOf(node);
    const hub = `@${chainName}` as AssetPlaceRef;

    // Skip hubs and agoric-local places (which are connected unidirectionally).
    if (node === hub || hub === '@agoric') continue;

    const chainIsEvm = Object.keys(AxelarChain).includes(chainName);
    addEdge(node, hub, chainIsEvm ? 'poolToEvm' : undefined);
    addEdge(hub, node, chainIsEvm ? 'evmToPool' : undefined);
  }

  // Ensure unidirectional <Deposit> -> +agoric -> @agoric -> <Cash>
  // intra-Agoric links, plus a special <Deposit> -> @agoric bypass.
  addEdge('<Deposit>', '+agoric');
  addEdge('+agoric', '@agoric');
  addEdge('@agoric', '<Cash>');
  addEdge('<Deposit>', '@agoric');

  // Return a mutable object in anticipation of further overrides.
  return { debug: false, nodes, edges, supplies };
};

/**
 * Build a FlowGraph from a NetworkSpec and current/target Amounts.
 * Guarantees intra-chain leaf <-> hub edges (unidirectional within the Agoric
 * chain and bidirectional otherwise).
 */
export const makeGraphForFlow = (
  network: NetworkSpec,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
): FlowGraph => {
  const hubs = new Set<string>(network.chains.map(c => `@${c.name}`));
  const dynamicNodes = new Set<string>([
    ...Object.keys(current ?? {}),
    ...Object.keys(target ?? {}),
  ]);

  // Minimal validation: each hub mentioned by a link must exist and each
  // current/target node must be connected to a hub.
  const errors: string[] = [];
  for (const link of network.links) {
    const { src, dest } = link;
    if (src.startsWith('@') && !hubs.has(src)) {
      errors.push(`missing link src hub ${src}`);
    }
    if (dest.startsWith('@') && !hubs.has(dest)) {
      errors.push(`missing link dest hub ${dest}`);
    }
  }
  for (const placeRef of dynamicNodes) {
    // Nothing to validate for an Agoric-local place.
    if (placeRef.startsWith('<') || placeRef.startsWith('+')) continue;

    if (placeRef.startsWith('@')) {
      if (!hubs.has(placeRef)) errors.push(`undeclared hub ${placeRef}`);
    } else if (Object.hasOwn(PoolPlaces, placeRef)) {
      // Known PoolKey; require its hub to be present.
      const hub = `@${PoolPlaces[placeRef as PoolKey].chainName}`;
      if (!hubs.has(hub)) {
        errors.push(`pool ${placeRef} requires missing hub ${hub}`);
      }
    }
  }
  errors.length === 0 || Fail`Unable to build graph: ${errors}`;

  /** PoolKeys connected to a hub in this network. */
  const possiblePoolKeys = partialMap(
    typedEntries(PoolPlaces),
    ([k, info]) => hubs.has(`@${info.chainName}`) && k,
  );

  const placeRefs = new Set([
    ...hubs,
    ...network.pools.map(p => p.pool),
    ...possiblePoolKeys,
    ...(network.localPlaces ?? []).map(localPlace => localPlace.id),
    ...dynamicNodes,
  ]) as Set<AssetPlaceRef>;
  const graph = makeGraphBase([...placeRefs], current, target);
  if (network.debug) graph.debug = true;

  // Override edges as specified.
  const dynamicEdges = [...graph.edges] as Array<FlowEdge | undefined>;
  for (const link of network.links) {
    const { src, dest, transfer } = link;
    (graph.nodes.has(src) && graph.nodes.has(dest)) ||
      Fail`Graph missing nodes for link ${src}->${dest}`;

    // Remove any existing edge that matches on (src, dest, transfer?).
    for (let i = 0; i < dynamicEdges.length; i += 1) {
      const edge = dynamicEdges[i];
      if (!edge || edge.src !== src || edge.dest !== dest) continue;
      if (transfer !== undefined && edge.transfer !== transfer) continue;
      dynamicEdges[i] = undefined;
    }

    dynamicEdges.push({ id: 'TBD', ...link });
  }

  // Define sequential edge IDs for avoiding collisions in the solver.
  const edges = dynamicEdges.filter(x => x) as FlowEdge[];
  const idWidth = `${edges.length - 1}`.length;
  const zeroPadId = (id: number) => zeroPad(id, idWidth);
  graph.edges = edges.map((edge, i) => ({ ...edge, id: `e${zeroPadId(i)}` }));

  return graph;
};
