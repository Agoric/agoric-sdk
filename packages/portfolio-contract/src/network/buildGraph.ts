import type { NetworkDefinition } from './types.js';
import type { NatAmount, Amount } from '@agoric/ertp/src/types.js';
import { buildBaseGraph, addInterchainLink } from '../plan-solve.js';
import type { AssetPlaceRef } from '../type-guards-steps.js';

/** Build a RebalanceGraph from a NetworkDefinition.
 * Adds intra-chain leaf<->hub edges via buildBaseGraph; then applies inter-hub edges.
 */
export const makeGraphFromDefinition = (
  def: NetworkDefinition,
  current: Partial<Record<AssetPlaceRef, NatAmount>>,
  target: Partial<Record<AssetPlaceRef, NatAmount>>,
  brand: Amount['brand'],
) => {
  // Use all nodes as assetRefs (buildBaseGraph auto-adds hubs again harmlessly)
  const graph = buildBaseGraph(
    def.nodes as AssetPlaceRef[],
    current,
    target,
    brand,
    1,
  );
  // Add inter-chain edges (only hub->hub expected but allow any)
  for (const e of def.edges) {
    // Only treat as inter-chain if both ends look like hubs
    if (e.src.startsWith('@') && e.dest.startsWith('@')) {
      addInterchainLink(graph, {
        srcChain: e.src.slice(1),
        destChain: e.dest.slice(1),
        variableFee: e.variableFee,
        timeFixed: e.timeSec,
        fixedFee: e.fixedFee,
        capacity: e.capacity ? BigInt(Math.floor(e.capacity)) : undefined,
        via: e.tags?.join(',') || 'inter-chain',
      });
    }
  }
  return graph;
};
