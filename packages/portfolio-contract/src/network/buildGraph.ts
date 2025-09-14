import type { NetworkDefinition } from './types.js';
import type { NatAmount, Amount } from '@agoric/ertp/src/types.js';

import { buildBaseGraph } from '../plan-solve.js';
import { PoolPlaces, type PoolKey } from '../type-guards.js';
import type { AssetPlaceRef } from '../type-guards-steps.js';

import type { NetworkSpec } from './network-spec.js';

/** Build a RebalanceGraph from a NetworkDefinition.
 * Adds intra-chain leaf<->hub edges via buildBaseGraph; then applies inter-hub edges.
 */
export const makeGraphFromDefinition = (
  def: NetworkDefinition,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
  brand: Amount['brand'],
) => {
  // Determine hubs explicitly present in the definition (nodes or edges).
  const hubsFromNodes = new Set<string>(
    (def.nodes ?? []).filter(n => n.startsWith('@')),
  );
  const hubsFromEdges = new Set<string>();
  for (const e of def.edges) {
    if (e.src.startsWith('@')) hubsFromEdges.add(e.src);
    if (e.dest.startsWith('@')) hubsFromEdges.add(e.dest);
  }
  const presentHubs = new Set<string>([...hubsFromNodes, ...hubsFromEdges]);

  // PoolKeys whose hub is in spec. Do NOT auto-add hubs.
  const filteredPoolKeys = Object.keys(PoolPlaces).filter(k =>
    presentHubs.has(`@${PoolPlaces[k].chainName}`),
  );

  // Declared universe for validation: def.nodes + present hubs + filtered pools.
  const declared = new Set<string>([
    ...def.nodes,
    ...presentHubs,
    ...filteredPoolKeys,
  ]);
  const missingRefs: string[] = [];
  for (const e of def.edges) {
    if (!declared.has(e.src)) missingRefs.push(`edge src ${e.src}`);
    if (!declared.has(e.dest)) missingRefs.push(`edge dest ${e.dest}`);
  }
  if (missingRefs.length) {
    throw Fail`NetworkDefinition has edges referencing undefined nodes: ${missingRefs.join(
      ', ',
    )}`;
  }
  // Hubs (declared in definition) must have at least one inter-hub arc in the definition
  const hubDegree = new Map<string, number>();
  for (const n of presentHubs) hubDegree.set(n, 0);
  for (const e of def.edges) {
    if (e.src.startsWith('@'))
      hubDegree.set(e.src, (hubDegree.get(e.src) || 0) + 1);
    if (e.dest.startsWith('@'))
      hubDegree.set(e.dest, (hubDegree.get(e.dest) || 0) + 1);
  }
  const hubsWithoutArcs = Array.from(hubDegree.entries())
    .filter(([, deg]) => deg === 0)
    .map(([n]) => n);
  if (hubsWithoutArcs.length) {
    throw Fail`NetworkDefinition has hub nodes with no inter-hub arcs: ${hubsWithoutArcs.join(
      ', ',
    )}`;
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
      if (!presentHubs.has(n)) dynErrors.push(`undeclared hub ${n}`);
    } else if (Object.hasOwn(PoolPlaces, n)) {
      // Known PoolKey; require its hub to be present.
      const hub = `@${PoolPlaces[n as PoolKey].chainName}`;
      if (!presentHubs.has(hub)) {
        dynErrors.push(`pool ${n} requires missing hub ${hub}`);
      }
    }
  }
  if (dynErrors.length) {
    throw Fail`NetworkDefinition is missing required hubs for dynamic nodes: ${dynErrors.join(
      ', ',
    )}`;
  }

  const assetRefs = Array.from(
    new Set<string>([
      ...def.nodes,
      ...filteredPoolKeys,
      ...presentHubs,
      ...dynamicNodes,
    ]),
  ] as AssetPlaceRef[];
  const graph = buildBaseGraph(assetRefs, current, target, brand, 1);
  // Propagate optional debug from definition only (edge tags do not control debug)
  if (def.debug) {
    (graph as any).debug = true;
  }
  // Add/override intra-Agoric links with 0 fee / 0 time.
  // Nodes: +agoric, <Cash>, <Deposit> on @agoric.
  const agoricHub: AssetPlaceRef = '@agoric';
  const seats: AssetPlaceRef[] = ['<Cash>', '<Deposit>'];
  const staging: AssetPlaceRef = '+agoric';
  const capacityDefault = 9_007_199_254_740_000; // slightly less than MAX_SAFE_INTEGER
  const addOrReplaceEdge = (src: AssetPlaceRef, dest: AssetPlaceRef) => {
    if (!graph.nodes.has(src) || !graph.nodes.has(dest)) return;

    // Remove any existing edge for exact src->dest
    graph.edges = graph.edges.filter(
      edge => edge.src !== src || edge.dest !== dest,
    );

    graph.edges.push({
      id: 'TBD',
      src,
      dest,
      capacity: capacityDefault,
      variableFee: 1,
      fixedFee: 0,
      timeFixed: 1,
      via: 'agoric-local',
    });
  };

  // +agoric <-> @agoric
  addOrReplaceEdge(staging, agoricHub);
  addOrReplaceEdge(agoricHub, staging);

  // seats <-> @agoric and seats <-> +agoric
  for (const seat of seats) {
    addOrReplaceEdge(seat, agoricHub);
    addOrReplaceEdge(agoricHub, seat);
    addOrReplaceEdge(seat, staging);
    addOrReplaceEdge(staging, seat);
  }
  // Add definition edges (allow any src/dest). If an edge duplicates a base one, override it.
  for (const e of def.edges) {
    const src = e.src as AssetPlaceRef;
    const dest = e.dest as AssetPlaceRef;
    if (!graph.nodes.has(src) || !graph.nodes.has(dest)) {
      throw Fail`Graph missing nodes for link ${src}->${dest}`;
    }
    graph.edges = graph.edges.filter(
      edge => edge.src !== src || edge.dest !== dest,
    );
    const capacity =
      typeof e.capacity === 'number' ? Math.floor(e.capacity) : capacityDefault;
    graph.edges.push({
      id: 'TBD',
      src,
      dest,
      capacity,
      variableFee: e.variableFee ?? 0,
      fixedFee: e.fixedFee,
      timeFixed: e.timeSec,
      via:
        e.tags?.join(',') ||
        (src.startsWith('@') && dest.startsWith('@')
          ? 'inter-chain'
          : 'override'),
    });
  }

  // Force unique sequential edge IDs for avoiding collisions in the solver.
  graph.edges = graph.edges.map((edge, i) => ({ ...edge, id: `e${i}` }));

  return graph;
};
