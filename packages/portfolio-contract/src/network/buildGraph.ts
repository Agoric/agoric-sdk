import { Fail } from '@endo/errors';
import type { NatAmount, Amount } from '@agoric/ertp/src/types.js';

import { buildBaseGraph, type FlowEdge } from '../plan-solve.js';
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
  const hubs = new Set<string>(spec.chains.map(c => `@${c.name}`));

  // PoolKeys whose hub is in spec. Do NOT auto-add hubs.
  const knownPoolKeys = Object.keys(PoolPlaces).filter(k =>
    hubs.has(`@${PoolPlaces[k].chainName}`),
  );

  // Minimal validation: ensure links reference present hubs.
  for (const link of spec.links) {
    hubs.has(`@${link.src}`) || Fail`missing link src hub ${link.src}`;
    hubs.has(`@${link.dest}`) || Fail`missing link dest hub ${link.dest}`;
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
  const graph = buildBaseGraph([...placeRefs], current, target, brand, 1);
  if (spec.debug) graph.debug = true;

  // Ensure intra-Agoric links with 0 fee / 0 time.
  // Nodes: +agoric, <Cash>, <Deposit> on @agoric.
  const agoricHub: AssetPlaceRef = '@agoric';
  const seats: AssetPlaceRef[] = ['<Cash>', '<Deposit>'];
  const staging: AssetPlaceRef = '+agoric';
  const capacityDefault = 9_007_199_254_740_000; // slightly less than MAX_SAFE_INTEGER
  const addOrReplaceEdge = (
    src: AssetPlaceRef,
    dest: AssetPlaceRef,
    customAttrs?: Omit<FlowEdge, 'id' | 'src' | 'dest'>,
  ) => {
    if (!graph.nodes.has(src) || !graph.nodes.has(dest)) return;

    // Remove any existing edge for exact src->dest
    graph.edges = graph.edges.filter(
      edge => edge.src !== src || edge.dest !== dest,
    );

    const dataAttrs = customAttrs || {
      capacity: capacityDefault,
      variableFee: 1,
      fixedFee: 0,
      timeFixed: 1,
      via: 'agoric-local',
    };
    graph.edges.push({ id: 'TBD', src, dest, ...dataAttrs });
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
  for (const link of spec.links) {
    const src = `@${link.src}` as AssetPlaceRef;
    const dest = `@${link.dest}` as AssetPlaceRef;
    (graph.nodes.has(src) && graph.nodes.has(dest)) ||
      Fail`Graph missing nodes for link ${src}->${dest}`;

    addOrReplaceEdge(src, dest, {
      capacity: Number(link.capacity ?? capacityDefault),
      variableFee: link.variableFeeBps ?? 0,
      fixedFee: link.flatFee === undefined ? undefined : Number(link.flatFee),
      timeFixed: link.timeSec,
      via: link.transfer,
    });
  }

  // Force unique sequential edge IDs for avoiding collisions in the solver.
  graph.edges = graph.edges.map((edge, i) => ({ ...edge, id: `e${i}` }));

  return graph;
};
