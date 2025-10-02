import test from 'ava';
import { Far } from '@endo/marshal';
import type { Brand } from '@agoric/ertp/src/types.js';
import {
  AxelarChain,
  SupportedChain,
} from '@agoric/portfolio-api/src/constants.js';

import {
  makeGraphFromDefinition,
  type RebalanceGraph,
} from '../../tools/network/buildGraph.js';
import PROD_NETWORK, {
  PROD_NETWORK as NAMED_PROD,
} from '../../tools/network/network.prod.js';
import { PoolPlaces } from '../../src/type-guards.js';
import type { AssetPlaceRef } from '../../src/type-guards-steps.js';
import type {
  PoolKey,
  TransferProtocol,
} from '../../tools/network/network-spec.js';

const brand = Far('TestBrand') as Brand<'nat'>;
const feeBrand = Far('TestFeeBrand') as Brand<'nat'>;

const toSet = <T>(iter: Iterable<T>) => new Set(iter);

// Shared expectations (precisely typed)
type HubKey = `@${(typeof SupportedChain)[keyof typeof SupportedChain]}`;
type EvmHubKey = `@${(typeof AxelarChain)[keyof typeof AxelarChain]}`;

const HUBS: ReadonlyArray<HubKey> = [
  '@agoric',
  '@noble',
  '@Arbitrum',
  '@Avalanche',
  '@Base',
  '@Ethereum',
  '@Optimism',
];

const EVM_HUBS: ReadonlyArray<EvmHubKey> = [
  '@Arbitrum',
  '@Avalanche',
  '@Base',
  '@Ethereum',
  '@Optimism',
];

const POOLS: ReadonlyArray<PoolKey> = [
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
  edges: RebalanceGraph['edges'],
  src: AssetPlaceRef,
  dest: AssetPlaceRef,
  via?: TransferProtocol,
) =>
  edges.some(
    e => e.src === src && e.dest === dest && (via ? e.via === via : true),
  );

const isReachable = (
  edges: RebalanceGraph['edges'],
  start: AssetPlaceRef,
  goal: AssetPlaceRef,
) => {
  const q = [start];
  const seen = new Set<AssetPlaceRef>([start]);
  while (q.length) {
    const cur = q.shift()!;
    if (cur === goal) return true;
    for (const e of edges) {
      if (e.src !== cur) continue;
      if (!seen.has(e.dest)) {
        seen.add(e.dest);
        q.push(e.dest);
      }
    }
  }
  return false;
};

// Map a pool key to its hub based on naming convention (or noble for USDN)
const poolToHub = (pool: PoolKey): AssetPlaceRef =>
  `@${PoolPlaces[pool].chainName}`;

// Derived intra-chain validation pairs
const INTRA_PAIRS: Array<[PoolKey, AssetPlaceRef]> = POOLS.map(p => [
  p,
  poolToHub(p),
]);

// Tests

// Parity checks with source definitions
test('HUBS matches SupportedChain values', t => {
  t.deepEqual(
    Object.keys(SupportedChain).sort(),
    HUBS.map(h => h.slice(1)).sort(),
  );
});

test('EVM_HUBS matches AxelarChain values', t => {
  t.deepEqual(
    Object.keys(AxelarChain).sort(),
    EVM_HUBS.map(h => h.slice(1)).sort(),
  );
});

test('POOLS entries are valid PoolKeys and match PROD pools', t => {
  t.deepEqual(Object.keys(PoolPlaces).sort(), [...POOLS].sort());
});

test('PROD_NETWORK has the expected hubs', t => {
  // Ensure both default and named export refer to the same object
  t.is(PROD_NETWORK, NAMED_PROD);

  const graph = getGraph();
  const nodes = toSet(graph.nodes.values());
  for (const hub of HUBS) t.true(nodes.has(hub), `missing hub ${hub}`);
});

test('PROD_NETWORK has the expected pools', t => {
  const graph = getGraph();
  const nodes = toSet(graph.nodes.values());
  for (const p of POOLS) t.true(nodes.has(p), `missing pool ${p}`);
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
