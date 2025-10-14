import { Fail } from '@endo/errors';

import type { NatAmount, Amount } from '@agoric/ertp/src/types.js';
import { partialMap } from '@agoric/internal/src/js-utils.js';
import { AxelarChain } from '@agoric/portfolio-api/src/constants.js';

import { PoolPlaces } from '../../src/type-guards.js';
import type { PoolKey } from '../../src/type-guards.js';
import type { AssetPlaceRef } from '../../src/type-guards-steps.js';

import type { FeeMode, NetworkSpec, TransferProtocol } from './network-spec.js';

/** Node supply: positive => must send out; negative => must receive */
export interface SupplyMap {
  [node: string]: number;
}

/** Internal edge representation */
export interface FlowEdge {
  id: string;
  src: AssetPlaceRef;
  dest: AssetPlaceRef;
  capacity?: number; // numeric for LP; derived from bigint
  min?: number; // numeric for LP; derived from bigint
  variableFee: number; // cost coefficient per unit flow in basis points
  fixedFee?: number; // optional fixed cost (cheapest mode)
  timeFixed?: number; // optional time cost (fastest mode)
  via?: TransferProtocol; // annotation (e.g. 'intra-chain', 'cctp', etc.)
  feeMode?: FeeMode;
}

/**
 * Graph structure.
 * Leaf nodes look like PoolKey, `<$SeatName>` (e.g. "<Deposit>" or "<Cash>"),
 * or "+agoric".
 * Interior nodes represent chains and start with "@" ("@agoric", "@noble",
 * "@Arbitrum", etc.).
 */
export interface RebalanceGraph {
  nodes: Set<AssetPlaceRef>;
  edges: FlowEdge[];
  supplies: SupplyMap;
  brand: Amount['brand'];
  feeBrand: Amount['brand'];
  /** When true, print extra diagnostics on solver failure */
  debug?: boolean;
}

export const chainOf = (id: AssetPlaceRef): string => {
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
  feeBrand: Amount['brand'],
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

  // Ensure intra-chain edges (leaf <-> hub)
  let eid = 0;
  const vf = 1; // direct variable fee per unit
  const tf = 1; // time cost unit (seconds or abstract)
  for (const node of nodes) {
    const chainName = chainOf(node);
    const hub = `@${chainName}` as AssetPlaceRef;
    // Skip hubs and agoric-local places (which are connected unidirectionally).
    if (node === hub || hub === '@agoric') continue;

    const chainIsEvm = Object.keys(AxelarChain).includes(chainName);
    const base: Omit<FlowEdge, 'src' | 'dest' | 'id'> = {
      variableFee: vf,
      fixedFee: 0,
      timeFixed: tf,
      via: 'local',
    };

    edges.push({
      // eslint-disable-next-line no-plusplus
      id: `e${eid++}`,
      src: node,
      dest: hub,
      ...base,
      ...(chainIsEvm ? { feeMode: 'poolToEvm' } : {}),
    });

    // Skip @agoric → +agoric edge
    if (node === '+agoric') continue;

    edges.push({
      // eslint-disable-next-line no-plusplus
      id: `e${eid++}`,
      src: hub,
      dest: node,
      ...base,
      ...(chainIsEvm ? { feeMode: 'evmToPool' } : {}),
    });
  }

  // Return mutable graph (do NOT harden so we can add inter-chain links later)
  return {
    nodes,
    edges,
    supplies,
    brand,
    feeBrand,
    debug: false,
  } as RebalanceGraph;
};

/**
 * Build a RebalanceGraph from a NetworkSpec.
 * Adds intra-chain leaf<->hub edges via buildBaseGraph; then applies inter-hub links.
 */
export const makeGraphFromDefinition = (
  spec: NetworkSpec,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
  brand: Amount['brand'],
  feeBrand: Amount['brand'],
) => {
  // Hubs from spec.
  const hubs = new Set<string>(spec.chains.map(c => `@${c.name}`));

  // PoolKeys whose hub is in spec. Do NOT auto-add hubs.
  const knownPoolKeys = Object.keys(PoolPlaces).filter(k =>
    hubs.has(`@${PoolPlaces[k].chainName}`),
  );

  // Minimal validation: ensure links reference present hubs.
  for (const link of spec.links) {
    hubs.has(link.src) ||
      !link.src.startsWith('@') ||
      Fail`missing link src hub ${link.src}`;
    hubs.has(link.dest) ||
      !link.dest.startsWith('@') ||
      Fail`missing link dest hub ${link.dest}`;
  }

  // Each current/target node must be connected to a hub.
  const dynamicNodes = new Set<string>([
    ...Object.keys(current ?? {}),
    ...Object.keys(target ?? {}),
  ]);
  const dynErrors: string[] = [];
  for (const n of dynamicNodes) {
    // Nothing to validate for a local place.
    if (n.startsWith('<') || n.startsWith('+')) continue;
    if (n.startsWith('@')) {
      if (!hubs.has(n)) dynErrors.push(`undeclared hub ${n}`);
    } else if (Object.hasOwn(PoolPlaces, n)) {
      // Known PoolKey; require its hub to be present.
      const hub = `@${PoolPlaces[n as PoolKey].chainName}`;
      if (!hubs.has(hub)) {
        dynErrors.push(`pool ${n} requires missing hub ${hub}`);
      }
    }
  }
  dynErrors.length === 0 ||
    Fail`NetworkSpec is missing required hubs for dynamic nodes: ${dynErrors}`;

  const placeRefs = new Set([
    ...hubs,
    ...spec.pools.map(p => p.pool),
    ...knownPoolKeys,
    ...(spec.localPlaces ?? []).map(lp => lp.id),
    ...dynamicNodes,
  ]) as Set<AssetPlaceRef>;
  const graph = buildBaseGraph(
    [...placeRefs],
    current,
    target,
    brand,
    feeBrand,
  );
  if (spec.debug) graph.debug = true;

  // Force the presence of particular edges.
  const edges = [...graph.edges] as Array<FlowEdge | undefined>;
  const addOrReplaceEdge = (
    src: AssetPlaceRef,
    dest: AssetPlaceRef,
    customAttrs?: Omit<FlowEdge, 'id' | 'src' | 'dest'>,
  ) => {
    (graph.nodes.has(src) && graph.nodes.has(dest)) ||
      Fail`Graph missing nodes for link ${src}->${dest}`;

    // Remove any existing edge that matches on (src, dest, via?).
    for (let i = 0; i < edges.length; i += 1) {
      const edge = edges[i];
      if (!edge || edge.src !== src || edge.dest !== dest) continue;
      if (customAttrs?.via === undefined || edge.via === customAttrs.via) {
        edges[i] = undefined;
      }
    }

    const dataAttrs = customAttrs || {
      variableFee: 1,
      fixedFee: 0,
      timeFixed: 1,
      via: 'local',
    };
    edges.push({ id: 'TBD', src, dest, ...dataAttrs });
  };

  // Ensure unidirectional intra-Agoric links with 0 fee / 0 time:
  // <Deposit> -> +agoric -> @agoric -> <Cash>
  // plus a special <Deposit> -> @agoric bypass.
  const agoricLinks = (
    ['<Deposit>', '+agoric', '@agoric', '<Cash>'] as AssetPlaceRef[]
  ).map((dest, i, arr) => (i === 0 ? [dest, arr[2]] : [arr[i - 1], dest]));
  for (const [src, dest] of agoricLinks) {
    if (!graph.nodes.has(src) || !graph.nodes.has(dest)) continue;
    addOrReplaceEdge(src, dest);
  }

  // Override the base graph with inter-hub links from spec.
  for (const link of spec.links) {
    addOrReplaceEdge(link.src, link.dest, {
      capacity: link.capacity === undefined ? undefined : Number(link.capacity),
      min: link.min === undefined ? undefined : Number(link.min),
      variableFee: link.variableFeeBps ?? 0,
      fixedFee: link.flatFee === undefined ? undefined : Number(link.flatFee),
      timeFixed: link.timeSec,
      via: link.transfer,
      feeMode: link.feeMode,
    });
  }

  // Force unique sequential edge IDs for avoiding collisions in the solver.
  graph.edges = partialMap(edges, edge => (edge ? { ...edge } : undefined));
  const width = `${graph.edges.length - 1}`.length;
  for (let i = 0; i < graph.edges.length; i += 1) {
    const iPadded = `${i}`.padStart(width, '0');
    graph.edges[i].id = `e${iPadded}`;
  }

  return graph;
};
