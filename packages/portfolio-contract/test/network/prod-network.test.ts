import test from 'ava';
import { Far } from '@endo/marshal';

import { makeGraphFromDefinition } from '../../tools/network/buildGraph.js';
import PROD_NETWORK, {
  PROD_NETWORK as NAMED_PROD,
} from '../../tools/network/network.prod.js';
import type { AssetPlaceRef } from '../../src/type-guards-steps.js';

const brand = Far('TestBrand') as any;
const feeBrand = Far('TestFeeBrand') as any;

const toSet = <T>(iter: Iterable<T>) => new Set(iter);

// Shared expectations
const HUBS = [
  '@agoric',
  '@noble',
  '@Arbitrum',
  '@Avalanche',
  '@Base',
  '@Ethereum',
  '@Optimism',
];

const EVM_HUBS = ['@Arbitrum', '@Avalanche', '@Ethereum', '@Base', '@Optimism'];

const POOLS = [
  // Aave pools
  'Aave_Arbitrum',
  'Aave_Avalanche',
  'Aave_Base',
  'Aave_Ethereum',
  'Aave_Optimism',
  // Beefy pools
  'Beefy_re7_Avalanche',
  'Beefy_morphoGauntletUsdc_Ethereum',
  'Beefy_morphoSmokehouseUsdc_Ethereum',
  'Beefy_morphoSeamlessUsdc_Base',
  'Beefy_compoundUsdc_Optimism',
  'Beefy_compoundUsdc_Arbitrum',
  // Compound pools
  'Compound_Arbitrum',
  'Compound_Base',
  'Compound_Ethereum',
  'Compound_Optimism',
  // USDN pools
  'USDN',
  'USDNVault',
];

// Helpers
const getGraph = () =>
  makeGraphFromDefinition(PROD_NETWORK, {}, {}, brand, feeBrand);

const hasEdge = (
  edges: ReturnType<typeof getGraph>['edges'],
  src: string,
  dest: string,
  via?: string,
) =>
  edges.some(
    e =>
      e.src === (src as any) &&
      e.dest === (dest as any) &&
      (via ? e.via === (via as any) : true),
  );

const isReachable = (
  edges: ReturnType<typeof getGraph>['edges'],
  start: string,
  goal: string,
) => {
  const q = [start as any];
  const seen = new Set<string>([start]);
  while (q.length) {
    const cur = q.shift() as any;
    if (cur === goal) return true;
    for (const e of edges) {
      if (e.src !== cur) continue;
      if (!seen.has(e.dest as any)) {
        seen.add(e.dest as any);
        q.push(e.dest as any);
      }
    }
  }
  return false;
};

// Map a pool key to its hub based on naming convention (or noble for USDN)
const poolToHub = (pool: string): AssetPlaceRef => {
  if (pool === 'USDN' || pool === 'USDNVault') return '@noble';
  const parts = pool.split('_');
  const chain = parts[parts.length - 1];
  return `@${chain}` as AssetPlaceRef;
};

// Derived intra-chain validation pairs
const INTRA_PAIRS: Array<[string, AssetPlaceRef]> = POOLS.map(p => [
  p,
  poolToHub(p),
]);

// Tests

test('PROD_NETWORK has the expected hubs', t => {
  // Ensure both default and named export refer to the same object
  t.is(PROD_NETWORK, NAMED_PROD);

  const graph = getGraph();
  const nodes = toSet(graph.nodes.values());
  for (const hub of HUBS)
    t.true(nodes.has(hub as AssetPlaceRef), `missing hub ${hub}`);
});

test('PROD_NETWORK has the expected pools', t => {
  const graph = getGraph();
  const nodes = toSet(graph.nodes.values());
  for (const p of POOLS)
    t.true(nodes.has(p as AssetPlaceRef), `missing pool ${p}`);
});

test('PROD_NETWORK has the right connections', t => {
  const graph = getGraph();
  const { edges } = graph;

  // IBC connectivity between @agoric and @noble
  t.true(hasEdge(edges, '@agoric', '@noble', 'ibc'));
  t.true(hasEdge(edges, '@noble', '@agoric', 'ibc'));

  // Each EVM hub should have links to @noble and a return path
  for (const hub of EVM_HUBS) {
    t.true(
      hasEdge(edges, hub, '@noble', 'cctpSlow') ||
        hasEdge(edges, hub, '@noble', 'fastusdc'),
      `no inbound EVM->@noble link for ${hub}`,
    );
    t.true(
      hasEdge(edges, '@noble', hub, 'cctpReturn'),
      `no @noble->${hub} return link`,
    );
  }

  // Intra-chain edges for pools (derived)
  for (const [leaf, hub] of INTRA_PAIRS) {
    t.true(hasEdge(edges, leaf, hub), `missing intra edge ${leaf}->${hub}`);
    if (hub !== '@agoric')
      t.true(hasEdge(edges, hub, leaf), `missing intra edge ${hub}->${leaf}`);
  }

  // Basic reachability from pools to @agoric
  for (const start of POOLS) {
    t.true(
      isReachable(edges, start, '@agoric'),
      `no route from ${start} to @agoric`,
    );
  }
});
