import test from 'ava';
import { AmountMath } from '@agoric/ertp';
import type { Brand, Amount } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/marshal';
import { planRebalanceFlow } from '../src/plan-solve.js';
import type { GraphNodeId } from '../src/plan-solve.js';

/**
 * Graph / network model specification (declarative)
 *
 * Nodes:
 *   Pools: 'Aave_Arbitrum', 'Beefy_re7_Avalanche', 'Compound_Ethereum'
 *   Chain hubs: '@Arbitrum', '@Avalanche', '@Ethereum', '@noble', '@agoric'
 *   Agoric local leaves: '+agoric', '<Deposit>', '<Cash>'
 *
 * Edges (conceptual attributes):
 *   - Intra-chain (leaf <-> hub): variableFee=1, time=1s
 *   - Noble <-> Agoric: variableFee=2, time=10s
 *   - EVM hub -> Noble (CCTP): time=18 minutes (1080s), cost ~0 (variableFee=0)
 *   - Noble -> EVM hub (CCTP return): time=20s, cost ~0
 *   - FastUSDC EVM hub <-> Noble: variableFee=15bp (0.0015), time=45s
 *
 * For testing path expansion we choose the cheaper/faster multi-step that goes:
 *   Pool -> Hub (intra) -> @noble (FastUSDC from hub) -> DestHub -> DestPool
 * If source and destination are on the same chain, the path simplifies to:
 *   SrcPool -> Hub -> DestPool  (we still route via @noble ONLY IF chains differ)
 */
const MODEL = {
  nodes: [
    'Aave_Arbitrum',
    'Beefy_re7_Avalanche',
    'Compound_Ethereum',
    '@Arbitrum',
    '@Avalanche',
    '@Ethereum',
    '@noble',
    '@agoric',
    '+agoric',
    '<Deposit>',
    '<Cash>',
  ],
  edges: [
    // Intra-chain examples (not enumerating all, conceptual):
    {
      kind: 'intra',
      src: 'Aave_Arbitrum',
      dest: '@Arbitrum',
      fee: 1,
      timeSec: 1,
    },
    {
      kind: 'intra',
      src: 'Beefy_re7_Avalanche',
      dest: '@Avalanche',
      fee: 1,
      timeSec: 1,
    },
    {
      kind: 'intra',
      src: 'Compound_Ethereum',
      dest: '@Ethereum',
      fee: 1,
      timeSec: 1,
    },
    { kind: 'intra', src: '+agoric', dest: '@agoric', fee: 1, timeSec: 1 },
    { kind: 'intra', src: '<Deposit>', dest: '@agoric', fee: 1, timeSec: 1 },
    { kind: 'intra', src: '<Cash>', dest: '@agoric', fee: 1, timeSec: 1 },
    // Noble <-> Agoric
    { kind: 'ibc', src: '@agoric', dest: '@noble', fee: 2, timeSec: 10 },
    { kind: 'ibc', src: '@noble', dest: '@agoric', fee: 2, timeSec: 10 },
    // CCTP (EVM -> Noble slow)
    { kind: 'cctpSlow', src: '@Arbitrum', dest: '@noble', timeSec: 1080 },
    { kind: 'cctpSlow', src: '@Avalanche', dest: '@noble', timeSec: 1080 },
    { kind: 'cctpSlow', src: '@Ethereum', dest: '@noble', timeSec: 1080 },
    // CCTP return (Noble -> EVM)
    { kind: 'cctpReturn', src: '@noble', dest: '@Arbitrum', timeSec: 20 },
    { kind: 'cctpReturn', src: '@noble', dest: '@Avalanche', timeSec: 20 },
    { kind: 'cctpReturn', src: '@noble', dest: '@Ethereum', timeSec: 20 },
    // FastUSDC links
    {
      kind: 'fast',
      src: '@Arbitrum',
      dest: '@noble',
      fee: 0.0015,
      timeSec: 45,
    },
    {
      kind: 'fast',
      src: '@noble',
      dest: '@Arbitrum',
      fee: 0.0015,
      timeSec: 45,
    },
    {
      kind: 'fast',
      src: '@Avalanche',
      dest: '@noble',
      fee: 0.0015,
      timeSec: 45,
    },
    {
      kind: 'fast',
      src: '@noble',
      dest: '@Avalanche',
      fee: 0.0015,
      timeSec: 45,
    },
    {
      kind: 'fast',
      src: '@Ethereum',
      dest: '@noble',
      fee: 0.0015,
      timeSec: 45,
    },
    {
      kind: 'fast',
      src: '@noble',
      dest: '@Ethereum',
      fee: 0.0015,
      timeSec: 45,
    },
  ],
} as const;

// ---------------- Utilities ----------------

const POOL_TO_CHAIN = (pool: string): string => {
  // Heuristic: last segment after '_' is chain name (e.g., Aave_Arbitrum -> Arbitrum)
  const parts = pool.split('_');
  return parts[parts.length - 1];
};

const chainHub = (chain: string) => `@${chain}`;

// MovementDesc-like structure for tests (only used fields)
type MovementStep = {
  src: string;
  dest: string;
  amount: Amount;
  detail?: Record<string, unknown>;
};

const makeIssuerKit = (name: string) => ({ brand: Far(name) as Brand<'nat'> });
const make = (brand: Brand, v: bigint) => AmountMath.make(brand, v);

// Pools
const A = 'Aave_Arbitrum';
const B = 'Beefy_re7_Avalanche';
const C = 'Compound_Ethereum';

// Common assetRefs now derived from MODEL definition (include pools, hubs, and local leaves)
const ALL_REFS = MODEL.nodes as unknown as GraphNodeId[];

// Helper to build current map
const balances = (
  brand: Brand,
  rec: Record<string, bigint>,
): Record<string, Amount<'nat'>> =>
  Object.fromEntries(
    Object.entries(rec).map(([k, v]) => [k, AmountMath.make(brand, v)]),
  );

// Links used for all scenarios (directional). We keep simple symmetric links;
// solver currently produces only leaf->hub and hub->leaf steps (no hub-hub legs in output).
const LINKS = [
  // EVM hubs to noble (cost/time not directly asserted in these tests)
  { srcChain: 'Arbitrum', destChain: 'noble', variableFee: 0, timeFixed: 1080 },
  { srcChain: 'noble', destChain: 'Arbitrum', variableFee: 0, timeFixed: 20 },
  {
    srcChain: 'Avalanche',
    destChain: 'noble',
    variableFee: 0,
    timeFixed: 1080,
  },
  { srcChain: 'noble', destChain: 'Avalanche', variableFee: 0, timeFixed: 20 },
  { srcChain: 'Ethereum', destChain: 'noble', variableFee: 0, timeFixed: 1080 },
  { srcChain: 'noble', destChain: 'Ethereum', variableFee: 0, timeFixed: 20 },
];

test('solver simple 2-pool case (A -> B 30)', async t => {
  const { brand } = makeIssuerKit('Tok');
  const current = balances(brand, { [A]: 80n, [B]: 20n });
  const targetBps = { [A]: 5000n, [B]: 5000n }; // total 100
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        AmountMath.make(brand, (100n * bps) / 10000n),
      ]),
    ),
    brand,
    links: LINKS,
    mode: 'cheapest',
  });

  t.deepEqual(steps, [
    // leaf -> hub
    { src: A, dest: '@Arbitrum', amount: AmountMath.make(brand, 30n) },
    // hub -> hub legs
    { src: '@Arbitrum', dest: '@noble', amount: AmountMath.make(brand, 30n) },
    { src: '@noble', dest: '@Avalanche', amount: AmountMath.make(brand, 30n) },
    // hub -> leaf
    { src: '@Avalanche', dest: B, amount: AmountMath.make(brand, 30n) },
  ]);
});

test('solver 3-pool rounding (A -> B 33, A -> C 33)', async t => {
  const { brand } = makeIssuerKit('Tok');
  const current = balances(brand, { [A]: 100n, [B]: 0n, [C]: 0n });
  const targetBps = { [A]: 3400n, [B]: 3300n, [C]: 3300n };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        AmountMath.make(brand, (100n * bps) / 10000n),
      ]),
    ),
    brand,
    links: LINKS,
    mode: 'cheapest',
  });

  const amt66 = AmountMath.make(brand, 66n);
  const amt33 = AmountMath.make(brand, 33n);
  t.deepEqual(steps, [
    // leaf -> hub (aggregated outflow from A)
    { src: A, dest: '@Arbitrum', amount: amt66 },
    // hub -> hub aggregated then split
    { src: '@Arbitrum', dest: '@noble', amount: amt66 },
    { src: '@noble', dest: '@Avalanche', amount: amt33 },
    { src: '@noble', dest: '@Ethereum', amount: amt33 },
    // hub -> leaf
    { src: '@Avalanche', dest: B, amount: amt33 },
    { src: '@Ethereum', dest: C, amount: amt33 },
  ]);
});

test('solver already balanced => no steps', async t => {
  const { brand } = makeIssuerKit('Tok');
  const current = balances(brand, { [A]: 50n, [B]: 50n });
  const targetBps = { [A]: 5000n, [B]: 5000n };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        AmountMath.make(brand, (100n * bps) / 10000n),
      ]),
    ),
    brand,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, []);
});

test('solver all to one (B + C -> A)', async t => {
  const { brand } = makeIssuerKit('Tok');
  const current = balances(brand, { [A]: 10n, [B]: 20n, [C]: 70n });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: { [A]: AmountMath.make(brand, 100n) },
    brand,
    links: LINKS,
    mode: 'cheapest',
  });

  t.deepEqual(steps, [
    // leaf -> hub sources
    { src: B, dest: '@Avalanche', amount: AmountMath.make(brand, 20n) },
    { src: C, dest: '@Ethereum', amount: AmountMath.make(brand, 70n) },
    // hub -> hub legs (order by edge id: noble->Arbitrum may appear after sources if active; include all with non-zero flow)
    { src: '@noble', dest: '@Arbitrum', amount: AmountMath.make(brand, 90n) },
    { src: '@Avalanche', dest: '@noble', amount: AmountMath.make(brand, 20n) },
    { src: '@Ethereum', dest: '@noble', amount: AmountMath.make(brand, 70n) },
    // hub -> leaf sink
    { src: '@Arbitrum', dest: A, amount: AmountMath.make(brand, 90n) },
  ]);
});

test('solver distribute from one (A -> B 60, A -> C 40)', async t => {
  const { brand } = makeIssuerKit('Tok');
  const current = balances(brand, { [A]: 100n, [B]: 0n, [C]: 0n });
  const target = {
    [B]: AmountMath.make(brand, 60n),
    [C]: AmountMath.make(brand, 40n),
  };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target,
    brand,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: A, dest: '@Arbitrum', amount: AmountMath.make(brand, 100n) },
    { src: '@Arbitrum', dest: '@noble', amount: AmountMath.make(brand, 100n) },
    { src: '@noble', dest: '@Avalanche', amount: AmountMath.make(brand, 60n) },
    { src: '@noble', dest: '@Ethereum', amount: AmountMath.make(brand, 40n) },
    { src: '@Avalanche', dest: B, amount: AmountMath.make(brand, 60n) },
    { src: '@Ethereum', dest: C, amount: AmountMath.make(brand, 40n) },
  ]);
});

test('solver collect to one (B 30 + C 70 -> A)', async t => {
  const { brand } = makeIssuerKit('Tok');
  const current = balances(brand, { [A]: 0n, [B]: 30n, [C]: 70n });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: { [A]: AmountMath.make(brand, 100n) },
    brand,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: B, dest: '@Avalanche', amount: AmountMath.make(brand, 30n) },
    { src: C, dest: '@Ethereum', amount: AmountMath.make(brand, 70n) },
    { src: '@noble', dest: '@Arbitrum', amount: AmountMath.make(brand, 100n) },
    { src: '@Avalanche', dest: '@noble', amount: AmountMath.make(brand, 30n) },
    { src: '@Ethereum', dest: '@noble', amount: AmountMath.make(brand, 70n) },
    { src: '@Arbitrum', dest: A, amount: AmountMath.make(brand, 100n) },
  ]);
});
