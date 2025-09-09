import test from 'ava';
import { AmountMath } from '@agoric/ertp';
import type { Brand, Amount } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/marshal';
import { planRebalanceFlow } from '../src/plan-solve.js';
import type { AssetPlaceRef } from '../src/type-guards-steps.js';

// Shared Tok brand + helper
const { brand: TOK_BRAND } = (() => ({ brand: Far('Tok') as Brand<'nat'> }))();
const token = (v: bigint) => AmountMath.make(TOK_BRAND, v);
const ZERO = token(0n);

/**
 * Graph / network model specification (declarative)
 *
 * Nodes:
 *   Pools: 'Aave_Arbitrum', 'Beefy_re7_Avalanche', 'Compound_Ethereum'
 *   Chain hubs: '@Arbitrum', '@Avalanche', '@Ethereum', '@noble', '@agoric'
 *   Agoric local leaves: '+agoric', '<Deposit>', '<Cash>'
 *
 * Edges (conceptual attributes):
 *   - Intra-chain (leaf <-> hub): variableFee=1, time=1 (seconds)
 *   - Noble <-> Agoric: variableFee=2, time=10 (seconds)
 *   - EVM hub -> Noble (CCTP): time=1080 (18 minutes), variableFee≈0
 *   - Noble -> EVM hub (CCTP return): time=20 (seconds), variableFee≈0
 *   - FastUSDC (unidirectional EVM -> Noble): variableFee=0.0015, time=45 (seconds)
 * Note: time values are in seconds; fractional (sub-second) values are supported if needed.
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
      time: 1,
    },
    {
      kind: 'intra',
      src: 'Beefy_re7_Avalanche',
      dest: '@Avalanche',
      fee: 1,
      time: 1,
    },
    {
      kind: 'intra',
      src: 'Compound_Ethereum',
      dest: '@Ethereum',
      fee: 1,
      time: 1,
    },
    { kind: 'intra', src: '+agoric', dest: '@agoric', fee: 1, time: 1 },
    { kind: 'intra', src: '<Deposit>', dest: '@agoric', fee: 1, time: 1 },
    { kind: 'intra', src: '<Cash>', dest: '@agoric', fee: 1, time: 1 },
    // Noble <-> Agoric
    { kind: 'ibc', src: '@agoric', dest: '@noble', fee: 2, time: 10 },
    { kind: 'ibc', src: '@noble', dest: '@agoric', fee: 2, time: 10 },
    // CCTP (EVM -> Noble slow)
    { kind: 'cctpSlow', src: '@Arbitrum', dest: '@noble', time: 1080 },
    { kind: 'cctpSlow', src: '@Avalanche', dest: '@noble', time: 1080 },
    { kind: 'cctpSlow', src: '@Ethereum', dest: '@noble', time: 1080 },
    // CCTP return (Noble -> EVM)
    { kind: 'cctpReturn', src: '@noble', dest: '@Arbitrum', time: 20 },
    { kind: 'cctpReturn', src: '@noble', dest: '@Avalanche', time: 20 },
    { kind: 'cctpReturn', src: '@noble', dest: '@Ethereum', time: 20 },
    // FastUSDC unidirectional (EVM -> Noble only)
    { kind: 'fast', src: '@Arbitrum', dest: '@noble', fee: 0.0015, time: 45 },
    { kind: 'fast', src: '@Avalanche', dest: '@noble', fee: 0.0015, time: 45 },
    { kind: 'fast', src: '@Ethereum', dest: '@noble', fee: 0.0015, time: 45 },
  ],
} as const;

// ---------------- Utilities ----------------

const POOL_TO_CHAIN = (pool: string): string => {
  // Heuristic: last segment after '_' is chain name (e.g., Aave_Arbitrum -> Arbitrum)
  const parts = pool.split('_');
  return parts[parts.length - 1];
};

// Pools
const A = 'Aave_Arbitrum';
const B = 'Beefy_re7_Avalanche';
const C = 'Compound_Ethereum';

// Common assetRefs now derived from MODEL definition (include pools, hubs, and local leaves)
const ALL_REFS = MODEL.nodes as unknown as AssetPlaceRef[];

// Helper to build current map (use shared token)
const balances = (rec: Record<string, bigint>): Record<string, Amount<'nat'>> =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, token(v)]));

// Links used for all scenarios (directional). We keep simple symmetric links;
// solver currently produces only leaf->hub and hub->leaf steps (no hub-hub legs in output).
const LINKS = [
  // EVM hubs to noble (CCTP slow)
  { srcChain: 'Arbitrum', destChain: 'noble', variableFee: 0, timeFixed: 1080 },
  {
    srcChain: 'Avalanche',
    destChain: 'noble',
    variableFee: 0,
    timeFixed: 1080,
  },
  { srcChain: 'Ethereum', destChain: 'noble', variableFee: 0, timeFixed: 1080 },
  // CCTP return (Noble -> EVM)
  { srcChain: 'noble', destChain: 'Arbitrum', variableFee: 0, timeFixed: 20 },
  { srcChain: 'noble', destChain: 'Avalanche', variableFee: 0, timeFixed: 20 },
  { srcChain: 'noble', destChain: 'Ethereum', variableFee: 0, timeFixed: 20 },
  // FastUSDC unidirectional (EVM -> Noble only)
  {
    srcChain: 'Arbitrum',
    destChain: 'noble',
    variableFee: 0.0015,
    timeFixed: 45,
  },
  {
    srcChain: 'Avalanche',
    destChain: 'noble',
    variableFee: 0.0015,
    timeFixed: 45,
  },
  {
    srcChain: 'Ethereum',
    destChain: 'noble',
    variableFee: 0.0015,
    timeFixed: 45,
  },
  // Added Agoric <-> Noble IBC for deposit/cash flows
  { srcChain: 'agoric', destChain: 'noble', variableFee: 2, timeFixed: 10 },
  { srcChain: 'noble', destChain: 'agoric', variableFee: 2, timeFixed: 10 },
];

test('solver simple 2-pool case (A -> B 30)', async t => {
  const current = balances({ [A]: 80n, [B]: 20n });
  const targetBps = { [A]: 5000n, [B]: 5000n };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        token((100n * bps) / 10000n),
      ]),
    ),
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });

  t.deepEqual(steps, [
    // leaf -> hub
    { src: A, dest: '@Arbitrum', amount: token(30n) },
    // hub -> hub legs
    { src: '@Arbitrum', dest: '@noble', amount: token(30n) },
    { src: '@noble', dest: '@Avalanche', amount: token(30n) },
    // hub -> leaf
    { src: '@Avalanche', dest: B, amount: token(30n) },
  ]);
});

test('solver 3-pool rounding (A -> B 33, A -> C 33)', async t => {
  const current = balances({ [A]: 100n, [B]: 0n, [C]: 0n });
  const targetBps = { [A]: 3400n, [B]: 3300n, [C]: 3300n };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        token((100n * bps) / 10000n),
      ]),
    ),
    brand: TOK_BRAND,
    links: LINKS, // fixed: was a string literal
    mode: 'cheapest',
  });

  const amt66 = token(66n);
  const amt33 = token(33n);
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
  const current = balances({ [A]: 50n, [B]: 50n });
  const targetBps = { [A]: 5000n, [B]: 5000n };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        token((100n * bps) / 10000n),
      ]),
    ),
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, []);
});

test('solver all to one (B + C -> A)', async t => {
  const current = balances({ [A]: 10n, [B]: 20n, [C]: 70n });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: { [A]: token(100n), [B]: ZERO, [C]: ZERO },
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: B, dest: '@Avalanche', amount: token(20n) },
    { src: '@Avalanche', dest: '@noble', amount: token(20n) },
    { src: C, dest: '@Ethereum', amount: token(70n) },
    { src: '@Ethereum', dest: '@noble', amount: token(70n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(90n) },
    { src: '@Arbitrum', dest: A, amount: token(90n) },
  ]);
});

test('solver distribute from one (A -> B 60, A -> C 40)', async t => {
  const current = balances({ [A]: 100n, [B]: 0n, [C]: 0n });
  const target = { [A]: ZERO, [B]: token(60n), [C]: token(40n) };
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target,
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: A, dest: '@Arbitrum', amount: token(100n) },
    { src: '@Arbitrum', dest: '@noble', amount: token(100n) },
    { src: '@noble', dest: '@Avalanche', amount: token(60n) },
    { src: '@noble', dest: '@Ethereum', amount: token(40n) },
    { src: '@Avalanche', dest: B, amount: token(60n) },
    { src: '@Ethereum', dest: C, amount: token(40n) },
  ]);
});

test('solver collect to one (B 30 + C 70 -> A)', async t => {
  const current = balances({ [A]: 0n, [B]: 30n, [C]: 70n });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: { [A]: token(100n), [B]: ZERO, [C]: ZERO },
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: B, dest: '@Avalanche', amount: token(30n) },
    { src: '@Avalanche', dest: '@noble', amount: token(30n) },
    { src: C, dest: '@Ethereum', amount: token(70n) },
    { src: '@Ethereum', dest: '@noble', amount: token(70n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(100n) },
    { src: '@Arbitrum', dest: A, amount: token(100n) },
  ]);
});

test('solver deposit redistribution (Deposit 100 -> A 70, B 30)', async t => {
  const current = balances({ '<Deposit>': 100n, [A]: 0n, [B]: 0n });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: { '<Deposit>': ZERO, [A]: token(70n), [B]: token(30n) },
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '<Deposit>', dest: '@agoric', amount: token(100n) },
    { src: '@agoric', dest: '@noble', amount: token(100n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(70n) },
    { src: '@noble', dest: '@Avalanche', amount: token(30n) },
    { src: '@Arbitrum', dest: A, amount: token(70n) },
    { src: '@Avalanche', dest: B, amount: token(30n) },
  ]);
});

test('solver move pools to cash (A 50 + B 30 -> Cash)', async t => {
  const current = balances({ [A]: 50n, [B]: 30n, '<Cash>': 0n });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: { [A]: ZERO, [B]: ZERO, '<Cash>': token(80n) },
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: A, dest: '@Arbitrum', amount: token(50n) },
    { src: '@Arbitrum', dest: '@noble', amount: token(50n) },
    { src: B, dest: '@Avalanche', amount: token(30n) },
    { src: '@Avalanche', dest: '@noble', amount: token(30n) },
    { src: '@noble', dest: '@agoric', amount: token(80n) },
    { src: '@agoric', dest: '<Cash>', amount: token(80n) },
  ]);
});

test('solver hub balances into pools (hubs supply -> pool targets)', async t => {
  const current = balances({
    [A]: 20n,
    [B]: 10n,
    [C]: 0n,
    '@Arbitrum': 30n,
    '@Avalanche': 20n,
    '@noble': 20n,
  });
  const { steps } = await planRebalanceFlow({
    assetRefs: ALL_REFS,
    current,
    target: {
      [A]: token(50n),
      [B]: token(30n),
      [C]: token(20n),
      '@Arbitrum': ZERO,
      '@Avalanche': ZERO,
      '@noble': ZERO,
    },
    brand: TOK_BRAND,
    links: LINKS,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '@Arbitrum', dest: A, amount: token(30n) },
    { src: '@Avalanche', dest: B, amount: token(20n) },
    { src: '@noble', dest: '@Ethereum', amount: token(20n) },
    { src: '@Ethereum', dest: C, amount: token(20n) },
  ]);
});
