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

test('solver deposit split across three pools (Deposit 1000 -> USDN 500, A 300, C 200)', async t => {
  // Mirrors planDepositTransfers case 1 proportions
  const USDN = 'USDN';
  const current = balances({
    '<Deposit>': 1000n,
    [USDN]: 0n,
    [A]: 0n,
    [C]: 0n,
  });
  const target = {
    '<Deposit>': ZERO,
    [USDN]: token(500n),
    [A]: token(300n),
    [C]: token(200n),
  };
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target,
    brand: TOK_BRAND,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '<Deposit>', dest: '@agoric', amount: token(1000n) },
    { src: '@agoric', dest: '@noble', amount: token(1000n) },
    { src: '@noble', dest: USDN, amount: token(500n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(300n) },
    { src: '@noble', dest: '@Ethereum', amount: token(200n) },
    { src: '@Arbitrum', dest: A, amount: token(300n) },
    { src: '@Ethereum', dest: C, amount: token(200n) },
  ]);
});

test('solver deposit with existing balances to meet targets', async t => {
  // Mirrors planDepositTransfers case 2: existing balances + deposit 500 -> targets
  // current: USDN 200, A 100, C 0; deposit 500; targets USDN 320, A 320, C 160
  const USDN = 'USDN';
  const current = balances({
    [USDN]: 200n,
    [A]: 100n,
    [C]: 0n,
    '<Deposit>': 500n,
  });
  const target = {
    [USDN]: token(320n),
    [A]: token(320n),
    [C]: token(160n),
    '<Deposit>': ZERO,
  };
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target,
    brand: TOK_BRAND,
    mode: 'cheapest',
  });
  // Expect deposit 500 to route to fill deficits: USDN 120, A 220, C 160
  t.deepEqual(steps, [
    { src: '<Deposit>', dest: '@agoric', amount: token(500n) },
    { src: '@agoric', dest: '@noble', amount: token(500n) },
    { src: '@noble', dest: USDN, amount: token(120n) },
    { src: '@noble', dest: '@Arbitrum', amount: token(220n) },
    { src: '@noble', dest: '@Ethereum', amount: token(160n) },
    { src: '@Arbitrum', dest: A, amount: token(220n) },
    { src: '@Ethereum', dest: C, amount: token(160n) },
  ]);
});

test('solver single-target deposit (Deposit 1000 -> USDN 1000)', async t => {
  // Mirrors planDepositTransfers case 5: one target asset
  const USDN = 'USDN';
  const current = balances({ '<Deposit>': 1000n, [USDN]: 500n });
  const target = { '<Deposit>': ZERO, [USDN]: token(1500n) };
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target,
    brand: TOK_BRAND,
    mode: 'cheapest',
  });
  t.deepEqual(steps, [
    { src: '<Deposit>', dest: '@agoric', amount: token(1000n) },
    { src: '@agoric', dest: '@noble', amount: token(1000n) },
    { src: '@noble', dest: USDN, amount: token(1000n) },
  ]);
});

test('solver leaves unmentioned pools unchanged', async t => {
  const current = balances({ [A]: 80n, [B]: 20n, [C]: 7n }); // C present in current
  const target = { [A]: token(50n), [B]: token(50n) }; // C omitted from target
  const { steps } = await planRebalanceFlow({
    network: TEST_NETWORK,
    current,
    target,
    brand: TOK_BRAND,
    mode: 'cheapest',
  });

  // Identical to the 2-pool case; no steps to/from C
  t.deepEqual(steps, [
    { src: A, dest: '@Arbitrum', amount: token(30n) },
    { src: '@Arbitrum', dest: '@noble', amount: token(30n) },
    { src: '@noble', dest: '@Avalanche', amount: token(30n) },
    { src: '@Avalanche', dest: B, amount: token(30n) },
  ]);
});
