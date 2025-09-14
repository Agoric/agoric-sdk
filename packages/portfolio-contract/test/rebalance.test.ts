import test from 'ava';
import { AmountMath } from '@agoric/ertp';
import type { Brand, Amount } from '@agoric/ertp/src/types.js';
import { Far } from '@endo/marshal';
import { planRebalanceFlow } from '../src/plan-solve.js';
import { TEST_NETWORK } from './network/test-network.js';

// Shared Tok brand + helper
const { brand: TOK_BRAND } = (() => ({ brand: Far('Tok') as Brand<'nat'> }))();
const token = (v: bigint) => AmountMath.make(TOK_BRAND, v);
const ZERO = token(0n);

// Pools
const A = 'Aave_Arbitrum';
const B = 'Beefy_re7_Avalanche';
const C = 'Compound_Ethereum';

// Helper to build current map (use shared token)
const balances = (rec: Record<string, bigint>): Record<string, Amount<'nat'>> =>
  Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, token(v)]));

test('solver simple 2-pool case (A -> B 30)', async t => {
  const current = balances({ [A]: 80n, [B]: 20n });
  const targetBps = { [A]: 5000n, [B]: 5000n };
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        token((100n * bps) / 10000n),
      ]),
    ),
    brand: TOK_BRAND,
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
    network: TEST_NETWORK,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        token((100n * bps) / 10000n),
      ]),
    ),
    brand: TOK_BRAND,
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
    network: TEST_NETWORK,
    current,
    target: Object.fromEntries(
      Object.entries(targetBps).map(([k, bps]) => [
        k,
        token((100n * bps) / 10000n),
      ]),
    ),
    brand: TOK_BRAND,
    mode: 'cheapest',
  });
  t.deepEqual(steps, []);
});

test('solver all to one (B + C -> A)', async t => {
  const current = balances({ [A]: 10n, [B]: 20n, [C]: 70n });
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target: { [A]: token(100n), [B]: ZERO, [C]: ZERO },
    brand: TOK_BRAND,
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
    network: TEST_NETWORK,
    current,
    target,
    brand: TOK_BRAND,
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
    network: TEST_NETWORK,
    current,
    target: { [A]: token(100n), [B]: ZERO, [C]: ZERO },
    brand: TOK_BRAND,
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

test('solver deposit redistribution (+agoric 100 -> A 70, B 30)', async t => {
  const current = balances({ '+agoric': 100n, [A]: 0n, [B]: 0n });
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target: { '+agoric': ZERO, [A]: token(70n), [B]: token(30n) },
    brand: TOK_BRAND,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '+agoric', dest: '@agoric', amount: token(100n) },
    { src: '@agoric', dest: '@noble', amount: token(100n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(70n) },
    { src: '@noble', dest: '@Avalanche', amount: token(30n) },
    { src: '@Arbitrum', dest: A, amount: token(70n) },
    { src: '@Avalanche', dest: B, amount: token(30n) },
  ]);
});

test('solver deposit redistribution (Deposit 100 -> A 70, B 30)', async t => {
  const current = balances({ '<Deposit>': 100n, [A]: 0n, [B]: 0n });
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target: { '<Deposit>': ZERO, [A]: token(70n), [B]: token(30n) },
    brand: TOK_BRAND,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '<Deposit>', dest: '@agoric', amount: token(100n) },
    // TODO dckc should this  go through +agoric?
    // { src: '+agoric', dest: '@agoric', amount: token(100n) },
    { src: '@agoric', dest: '@noble', amount: token(100n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(70n) },
    { src: '@noble', dest: '@Avalanche', amount: token(30n) },
    { src: '@Arbitrum', dest: A, amount: token(70n) },
    { src: '@Avalanche', dest: B, amount: token(30n) },
  ]);
});

test('solver withdraw to cash (A 50 + B 30 -> Cash)', async t => {
  const current = balances({ [A]: 50n, [B]: 30n, '<Cash>': 0n });
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target: { [A]: ZERO, [B]: ZERO, '<Cash>': token(80n) },
    brand: TOK_BRAND,
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
    network: TEST_NETWORK,
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
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '@Arbitrum', dest: A, amount: token(30n) },
    { src: '@Avalanche', dest: B, amount: token(20n) },
    { src: '@noble', dest: '@Ethereum', amount: token(20n) },
    { src: '@Ethereum', dest: C, amount: token(20n) },
  ]);
});
