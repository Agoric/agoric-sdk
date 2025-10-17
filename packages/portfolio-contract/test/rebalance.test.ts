import test from 'ava';
import type { ImplementationFn } from 'ava';
import { AmountMath } from '@agoric/ertp';
import type { Brand } from '@agoric/ertp/src/types.js';
import { objectMap } from '@agoric/internal';
import type {
  SupportedChain,
  YieldProtocol,
} from '@agoric/portfolio-api/src/constants.js';
import { Far } from '@endo/marshal';
import type { PoolKey } from '../src/type-guards.js';
import type { AssetPlaceRef } from '../src/type-guards-steps.js';
import type {
  NetworkSpec,
  TransferProtocol,
} from '../tools/network/network-spec.js';
import type { FlowEdge } from '../tools/network/buildGraph.js';
import { planRebalanceFlow } from '../tools/plan-solve.js';
import type { RebalanceMode } from '../tools/plan-solve.js';
import { TEST_NETWORK } from './network/test-network.js';
import { gasEstimator } from './mocks.js';

// eslint-disable-next-line no-nested-ternary
const strcmp = (a: string, b: string) => (a > b ? 1 : a < b ? -1 : 0);
const compareFlowEdges = (a: FlowEdge, b: FlowEdge) =>
  strcmp(a.src.toLowerCase(), b.src.toLowerCase()) ||
  strcmp(a.dest.toLowerCase(), b.dest.toLowerCase());

// Use realistic flow values (e.g., millions of uUSDC) but format for
// readability (e.g., in full USDC).
const USCALE = 1_000_000n;

// Shared Tok brand + helper
const { brand: TOK_BRAND } = (() => ({ brand: Far('USD*') as Brand<'nat'> }))();
const { brand: FEE_BRAND } = (() => ({ brand: Far('BLD') as Brand<'nat'> }))();
const token = (v: bigint) => AmountMath.make(TOK_BRAND, v * USCALE);
const ZERO = token(0n);
const fixedFee = AmountMath.make(FEE_BRAND, 11n * USCALE);
const evmGas = 220000000n * USCALE;
const subtract5bps = (scaled: bigint) =>
  // HACK subtract an extra 1n to match `rebalanceMinCostFlowSteps`.
  // See https://github.com/Agoric/agoric-private/issues/415
  (scaled * USCALE * 9995n) / 10000n - 1n;

const formatAmount = ({ brand, value }) => {
  const intPart = Number(value / USCALE);
  const fracPart = Number(value - BigInt(intPart) * USCALE) / Number(USCALE);
  const scaledValue = intPart + fracPart;
  if (brand === TOK_BRAND) return `$${scaledValue}`;
  const prettyBrand = brand[Symbol.toStringTag].replace(/^Alleged: /, '');
  return `${scaledValue} ${prettyBrand}`;
};

// Pools
const A = 'Aave_Arbitrum';
const B = 'Beefy_re7_Avalanche';
const C = 'Compound_Ethereum';

// Helper to build current map (use shared token)
const balances = (rec: Record<string, bigint>) => objectMap(rec, v => token(v));

// Helper for comprehensible ava outputs.
const readableSteps = steps =>
  steps.map(step => {
    const { src, dest, amount, fee } = step;
    const prettyAmount = formatAmount(amount);
    const feeSuffix = fee ? ` [fee ${formatAmount(fee)}]` : '';
    return `${src} -> ${dest} ${prettyAmount}${feeSuffix}`;
  });
const assertSteps = async (t, actual, expected) => {
  const fullResult = await t.try(tt => tt.deepEqual(actual, expected));
  if (fullResult.passed) {
    fullResult.commit();
    return;
  }
  // Try for a simple diff, but if that doesn't exhibit the failure then commit
  // to the full result after all.
  const summaryResult = await t.try(tt =>
    tt.deepEqual(readableSteps(actual), readableSteps(expected)),
  );
  if (!summaryResult.passed) {
    fullResult.discard();
    summaryResult.commit();
    return;
  }
  summaryResult.discard();
  fullResult.commit();
};

const testWithModes = (
  titlePrefix: string,
  modes: RebalanceMode[],
  callback: ImplementationFn<[mode: RebalanceMode]>,
) => {
  for (const mode of modes) {
    test(`${titlePrefix} [${mode}]`, async t => {
      await callback(t, mode);
    });
  }
};

const testWithAllModes = (
  titlePrefix: string,
  callback: ImplementationFn<[mode: string]>,
) => testWithModes(titlePrefix, ['cheapest', 'fastest'], callback);

testWithAllModes('solver simple 2-pool case (A -> B 30)', async (t, mode) => {
  const current = balances({ [A]: 80n, [B]: 20n });
  const targetBps = { [A]: 5000n, [B]: 5000n };
  const { steps } = await planRebalanceFlow({
    mode: mode as RebalanceMode,
    network: TEST_NETWORK,
    current,
    target: objectMap(targetBps, bps => token((100n * bps) / 10000n)),
    brand: TOK_BRAND,
    feeBrand: FEE_BRAND,
    gasEstimator,
  });

  await assertSteps(t, steps, [
    // leaf -> hub
    { src: A, dest: '@Arbitrum', amount: token(30n), fee: fixedFee },
    // hub -> hub legs
    { src: '@Arbitrum', dest: '@agoric', amount: token(30n), fee: fixedFee },
    { src: '@agoric', dest: '@noble', amount: token(30n) },
    {
      src: '@noble',
      dest: '@Avalanche',
      amount: token(30n),
      fee: fixedFee,
      detail: {
        evmGas,
      },
    },
    // hub -> leaf
    { src: '@Avalanche', dest: B, amount: token(30n), fee: fixedFee },
  ]);
});

testWithAllModes(
  'solver 3-pool rounding (A -> B 33, A -> C 33)',
  async (t, mode) => {
    const current = balances({ [A]: 100n, [B]: 0n, [C]: 0n });
    const targetBps = { [A]: 3400n, [B]: 3300n, [C]: 3300n };
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target: objectMap(targetBps, bps => token((100n * bps) / 10000n)),
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });

    const amt66 = token(66n);
    const amt33 = token(33n);
    await assertSteps(t, steps, [
      // leaf -> hub (aggregated outflow from A)
      { src: A, dest: '@Arbitrum', amount: amt66, fee: fixedFee },
      // hub -> hub aggregated then split
      { src: '@Arbitrum', dest: '@agoric', amount: amt66, fee: fixedFee },
      { src: '@agoric', dest: '@noble', amount: amt66 },
      {
        src: '@noble',
        dest: '@Avalanche',
        amount: amt33,
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      {
        src: '@noble',
        dest: '@Ethereum',
        amount: amt33,
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      // hub -> leaf
      { src: '@Avalanche', dest: B, amount: amt33, fee: fixedFee },
      { src: '@Ethereum', dest: C, amount: amt33, fee: fixedFee },
    ]);
  },
);

testWithAllModes('solver already balanced => no steps', async (t, mode) => {
  const current = balances({ [A]: 50n, [B]: 50n });
  const targetBps = { [A]: 5000n, [B]: 5000n };
  const { steps } = await planRebalanceFlow({
    mode: mode as RebalanceMode,
    network: TEST_NETWORK,
    current,
    target: objectMap(targetBps, bps => token((100n * bps) / 10000n)),
    brand: TOK_BRAND,
    feeBrand: FEE_BRAND,
    gasEstimator,
  });
  await assertSteps(t, steps, []);
});

testWithAllModes('solver all to one (B + C -> A)', async (t, mode) => {
  const current = balances({ [A]: 10n, [B]: 20n, [C]: 70n });
  const { steps } = await planRebalanceFlow({
    mode: mode as RebalanceMode,
    network: TEST_NETWORK,
    current,
    target: { [A]: token(100n), [B]: ZERO, [C]: ZERO },
    brand: TOK_BRAND,
    feeBrand: FEE_BRAND,
    gasEstimator,
  });
  await assertSteps(t, steps, [
    { src: B, dest: '@Avalanche', amount: token(20n), fee: fixedFee },
    { src: '@Avalanche', dest: '@agoric', amount: token(20n), fee: fixedFee },
    { src: C, dest: '@Ethereum', amount: token(70n), fee: fixedFee },
    { src: '@Ethereum', dest: '@agoric', amount: token(70n), fee: fixedFee },
    { src: '@agoric', dest: '@noble', amount: token(90n) },
    {
      src: '@noble',
      dest: '@Arbitrum',
      amount: token(90n),
      fee: fixedFee,
      detail: {
        evmGas,
      },
    },
    { src: '@Arbitrum', dest: A, amount: token(90n), fee: fixedFee },
  ]);
});

testWithAllModes(
  'solver distribute from one (A -> B 60, A -> C 40)',
  async (t, mode) => {
    const current = balances({ [A]: 100n, [B]: 0n, [C]: 0n });
    const target = { [A]: ZERO, [B]: token(60n), [C]: token(40n) };
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target,
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: A, dest: '@Arbitrum', amount: token(100n), fee: fixedFee },
      { src: '@Arbitrum', dest: '@agoric', amount: token(100n), fee: fixedFee },
      { src: '@agoric', dest: '@noble', amount: token(100n) },
      {
        src: '@noble',
        dest: '@Avalanche',
        amount: token(60n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      {
        src: '@noble',
        dest: '@Ethereum',
        amount: token(40n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Avalanche', dest: B, amount: token(60n), fee: fixedFee },
      { src: '@Ethereum', dest: C, amount: token(40n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver collect to one (B 30 + C 70 -> A)',
  async (t, mode) => {
    const current = balances({ [A]: 0n, [B]: 30n, [C]: 70n });
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target: { [A]: token(100n), [B]: ZERO, [C]: ZERO },
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: B, dest: '@Avalanche', amount: token(30n), fee: fixedFee },
      { src: '@Avalanche', dest: '@agoric', amount: token(30n), fee: fixedFee },
      { src: C, dest: '@Ethereum', amount: token(70n), fee: fixedFee },
      { src: '@Ethereum', dest: '@agoric', amount: token(70n), fee: fixedFee },
      { src: '@agoric', dest: '@noble', amount: token(100n) },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: token(100n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Arbitrum', dest: A, amount: token(100n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver deposit redistribution (+agoric 100 -> A 70, B 30)',
  async (t, mode) => {
    const current = balances({ '+agoric': 100n, [A]: 0n, [B]: 0n });
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target: { '+agoric': ZERO, [A]: token(70n), [B]: token(30n) },
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: '+agoric', dest: '@agoric', amount: token(100n) },
      { src: '@agoric', dest: '@noble', amount: token(100n) },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: token(70n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      {
        src: '@noble',
        dest: '@Avalanche',
        amount: token(30n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Arbitrum', dest: A, amount: token(70n), fee: fixedFee },
      { src: '@Avalanche', dest: B, amount: token(30n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver deposit redistribution (Deposit 100 -> A 70, B 30)',
  async (t, mode) => {
    const current = balances({ '<Deposit>': 100n, [A]: 0n, [B]: 0n });
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target: { '<Deposit>': ZERO, [A]: token(70n), [B]: token(30n) },
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: '<Deposit>', dest: '@agoric', amount: token(100n) },
      { src: '@agoric', dest: '@noble', amount: token(100n) },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: token(70n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      {
        src: '@noble',
        dest: '@Avalanche',
        amount: token(30n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Arbitrum', dest: A, amount: token(70n), fee: fixedFee },
      { src: '@Avalanche', dest: B, amount: token(30n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver withdraw to cash (A 50 + B 30 -> Cash)',
  async (t, mode) => {
    const current = balances({ [A]: 50n, [B]: 30n, '<Cash>': 0n });
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target: { [A]: ZERO, [B]: ZERO, '<Cash>': token(80n) },
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: A, dest: '@Arbitrum', amount: token(50n), fee: fixedFee },
      { src: '@Arbitrum', dest: '@agoric', amount: token(50n), fee: fixedFee },
      { src: B, dest: '@Avalanche', amount: token(30n), fee: fixedFee },
      { src: '@Avalanche', dest: '@agoric', amount: token(30n), fee: fixedFee },
      { src: '@agoric', dest: '<Cash>', amount: token(80n) },
    ]);
  },
);

testWithAllModes(
  'solver hub balances into pools (hubs supply -> pool targets)',
  async (t, mode) => {
    const current = balances({
      [A]: 20n,
      [B]: 10n,
      [C]: 0n,
      '@Arbitrum': 30n,
      '@Avalanche': 20n,
      '@noble': 20n,
    });
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
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
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: '@Arbitrum', dest: A, amount: token(30n), fee: fixedFee },
      { src: '@Avalanche', dest: B, amount: token(20n), fee: fixedFee },
      {
        src: '@noble',
        dest: '@Ethereum',
        amount: token(20n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Ethereum', dest: C, amount: token(20n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver deposit split across three pools (Deposit 1000 -> USDN 500, A 300, C 200)',
  async (t, mode) => {
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
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target,
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: '<Deposit>', dest: '@agoric', amount: token(1000n) },
      { src: '@agoric', dest: '@noble', amount: token(1000n) },
      {
        src: '@noble',
        dest: USDN,
        amount: token(500n),
        detail: { usdnOut: subtract5bps(500n) },
      },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: token(300n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      {
        src: '@noble',
        dest: '@Ethereum',
        amount: token(200n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Arbitrum', dest: A, amount: token(300n), fee: fixedFee },
      { src: '@Ethereum', dest: C, amount: token(200n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver deposit with existing balances to meet targets',
  async (t, mode) => {
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
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target,
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    // Expect deposit 500 to route to fill deficits: USDN 120, A 220, C 160
    await assertSteps(t, steps, [
      { src: '<Deposit>', dest: '@agoric', amount: token(500n) },
      { src: '@agoric', dest: '@noble', amount: token(500n) },
      {
        src: '@noble',
        dest: USDN,
        amount: token(120n),
        detail: { usdnOut: subtract5bps(120n) },
      },
      {
        src: '@noble',
        dest: '@Arbitrum',
        amount: token(220n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      {
        src: '@noble',
        dest: '@Ethereum',
        amount: token(160n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Arbitrum', dest: A, amount: token(220n), fee: fixedFee },
      { src: '@Ethereum', dest: C, amount: token(160n), fee: fixedFee },
    ]);
  },
);

testWithAllModes(
  'solver single-target deposit (Deposit 1000 -> USDN 1000)',
  async (t, mode) => {
    // Mirrors planDepositTransfers case 5: one target asset
    const USDN = 'USDN';
    const current = balances({ '<Deposit>': 1000n, [USDN]: 500n });
    const target = { '<Deposit>': ZERO, [USDN]: token(1500n) };
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target,
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });
    await assertSteps(t, steps, [
      { src: '<Deposit>', dest: '@agoric', amount: token(1000n) },
      { src: '@agoric', dest: '@noble', amount: token(1000n) },
      {
        src: '@noble',
        dest: USDN,
        amount: token(1000n),
        detail: { usdnOut: subtract5bps(1000n) },
      },
    ]);
  },
);

testWithAllModes(
  'solver leaves unmentioned pools unchanged',
  async (t, mode) => {
    const current = balances({ [A]: 80n, [B]: 20n, [C]: 7n }); // C present in current
    const target = { [A]: token(50n), [B]: token(50n) }; // C omitted from target
    const { steps } = await planRebalanceFlow({
      mode: mode as RebalanceMode,
      network: TEST_NETWORK,
      current,
      target,
      brand: TOK_BRAND,
      feeBrand: FEE_BRAND,
      gasEstimator,
    });

    // Identical to the 2-pool case; no steps to/from C
    await assertSteps(t, steps, [
      { src: A, dest: '@Arbitrum', amount: token(30n), fee: fixedFee },
      { src: '@Arbitrum', dest: '@agoric', amount: token(30n), fee: fixedFee },
      { src: '@agoric', dest: '@noble', amount: token(30n) },
      {
        src: '@noble',
        dest: '@Avalanche',
        amount: token(30n),
        fee: fixedFee,
        detail: {
          evmGas,
        },
      },
      { src: '@Avalanche', dest: B, amount: token(30n), fee: fixedFee },
    ]);
  },
);

test('solver differentiates cheapest vs. fastest', async t => {
  const network: NetworkSpec = {
    debug: true,
    environment: 'test',
    chains: [
      { name: 'agoric', control: 'local' },
      { name: 'External' as SupportedChain, control: 'ibc' },
    ],
    pools: [
      {
        pool: 'Sink_External' as PoolKey,
        chain: 'external' as SupportedChain,
        protocol: 'sink' as YieldProtocol,
      },
    ],
    localPlaces: [{ id: '+agoric', chain: 'agoric' }],
    links: [
      {
        src: '@agoric',
        dest: '@External' as AssetPlaceRef,
        transfer: 'cheap' as TransferProtocol,
        variableFeeBps: 5,
        timeSec: 60,
        feeMode: 'evmToPool',
      },
      {
        src: '@agoric',
        dest: '@External' as AssetPlaceRef,
        transfer: 'fast' as TransferProtocol,
        variableFeeBps: 6,
        timeSec: 59,
        feeMode: 'evmToPool',
      },
    ],
  };
  const current = balances({ '+agoric': 100n, Sink_External: 0n });
  const target = balances({ '+agoric': 0n, Sink_External: 100n });

  const cheapResult = await planRebalanceFlow({
    mode: 'cheapest',
    network,
    current,
    target,
    brand: TOK_BRAND,
    feeBrand: FEE_BRAND,
    gasEstimator,
  });
  t.like(cheapResult.flows.map(flow => flow.edge).sort(compareFlowEdges), [
    { src: '+agoric', dest: '@agoric', via: 'local' },
    { src: '@agoric', dest: '@External', via: 'cheap' },
    { src: '@External', dest: 'Sink_External', via: 'local' },
  ]);
  await assertSteps(t, cheapResult.steps, [
    { src: '+agoric', dest: '@agoric', amount: token(100n) },
    {
      src: '@agoric',
      dest: '@External',
      amount: token(100n),
      fee: fixedFee,
    },
    { src: '@External', dest: 'Sink_External', amount: token(100n) },
  ]);

  const fastResult = await planRebalanceFlow({
    mode: 'fastest',
    network,
    current,
    target,
    brand: TOK_BRAND,
    feeBrand: FEE_BRAND,
    gasEstimator,
  });
  t.like(fastResult.flows.map(flow => flow.edge).sort(compareFlowEdges), [
    { src: '+agoric', dest: '@agoric', via: 'local' },
    { src: '@agoric', dest: '@External', via: 'fast' },
    { src: '@External', dest: 'Sink_External', via: 'local' },
  ]);
  await assertSteps(t, fastResult.steps, [
    { src: '+agoric', dest: '@agoric', amount: token(100n) },
    {
      src: '@agoric',
      dest: '@External',
      amount: token(100n),
      fee: fixedFee,
    },
    { src: '@External', dest: 'Sink_External', amount: token(100n) },
  ]);
});
