import { Fail } from '@endo/errors';
import type { NatAmount, Amount } from '@agoric/ertp/src/types.js';

import { buildBaseGraph } from '../plan-solve.js';
import { PoolPlaces, type PoolKey } from '../type-guards.js';
import type { AssetPlaceRef } from '../type-guards-steps.js';

import type { NetworkSpec } from './network-spec.js';

/**
 * Build a RebalanceGraph from a NetworkSpec.
 * Adds intra-chain leaf<->hub edges via buildBaseGraph; then applies inter-hub links.
 */
export const makeGraphFromDefinition = (
  spec: NetworkSpec,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
  brand: Amount['brand'],
) => {
  // Hubs from spec.
  const presentHubs = new Set<string>(spec.chains.map(c => `@${c.name}`));

  // PoolKeys whose hub is in spec. Do NOT auto-add hubs.
  const filteredPoolKeys = Object.keys(PoolPlaces).filter(k =>
    presentHubs.has(`@${PoolPlaces[k].chainName}`),
  );

  // Minimal validation: ensure links reference present hubs.
  for (const l of spec.links) {
    presentHubs.has(`@${l.src}`) || Fail`missing link src hub ${l.src}`;
    presentHubs.has(`@${l.dest}`) || Fail`missing link dest hub ${l.dest}`;
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
  dynErrors.length === 0 ||
    Fail`NetworkSpec is missing required hubs for dynamic nodes: ${dynErrors}`;

  const assetRefs = [
    ...new Set([
      ...presentHubs,
      ...spec.pools.map(p => p.pool),
      ...(spec.localPlaces ?? []).map(lp => lp.id),
      ...filteredPoolKeys,
      ...dynamicNodes,
    ]),
  ] as AssetPlaceRef[];
  const graph = buildBaseGraph(assetRefs, current, target, brand, 1);
  if (spec.debug) graph.debug = true;

  // Ensure intra-Agoric links with 0 fee / 0 time.
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

  // Override the base graph with inter-hub links from spec.
  for (const l of spec.links) {
    const src = `@${l.src}` as AssetPlaceRef;
    const dest = `@${l.dest}` as AssetPlaceRef;
    (graph.nodes.has(src) && graph.nodes.has(dest)) ||
      Fail`Graph missing nodes for link ${src}->${dest}`;

    graph.edges = graph.edges.filter(
      edge => edge.src !== src || edge.dest !== dest,
    );

    graph.edges.push({
      id: 'TBD',
      src,
      dest,
      capacity: Number(l.capacity ?? capacityDefault),
      variableFee: l.variableFeeBps ?? 0,
      fixedFee: l.flatFee === undefined ? undefined : Number(l.flatFee),
      timeFixed: l.timeSec,
      via: l.transfer,
    });
  }

  // Force unique sequential edge IDs for avoiding collisions in the solver.
  graph.edges = graph.edges.map((edge, i) => ({ ...edge, id: `e${i}` }));

  return graph;
};
