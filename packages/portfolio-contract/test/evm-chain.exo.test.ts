import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { makeHeapZone } from '@agoric/zone';
import { prepareVowTools } from '@agoric/vow';
import { Far } from '@endo/marshal';
import { prepareEvmChainKit } from '../src/evm-chain.exo.ts';

// Minimal GMPAccountInfo stub
const makeAccountInfo = (n: number) => ({
  namespace: 'eip155' as const,
  chainName: 'arbitrum' as any, // AxelarChain stub
  chainId: `eip155:42161:${n}` as any,
  remoteAddress:
    `0xdeadbeef${n.toString(16).padStart(2, '0')}` as `0x${string}`,
});

// Remotable gmpChain stub to satisfy passability when included in provision context
const makeFakeGmpChain = () =>
  Far('FakeGmpChain', {
    getChainId: () => ({ chainId: '42161' }),
  });

// Minimal LocalAccount stub satisfying type via cast
const makeFakeLocalAccount = () => {
  // Declare as Remotable to satisfy passability requirements when methods are
  // passed through provisioning contexts.
  // We keep methods minimal and no-op.
  const acct: any = Far('FakeLocalAccount', {
    getAddress: () => ({ value: 'cosmos:feeacct' }),
    send: async () => {},
    getBalance: async () => 0n,
    getBalances: async () => [],
    sendAll: async () => {},
    transfer: async () => {},
    makeChild: () => acct,
  });
  return acct as any;
};

// Shared test context builder.
type TestCtx = {
  zone: ReturnType<typeof makeHeapZone>;
  vowTools: ReturnType<typeof prepareVowTools>;
  provisionBase: any; // simplified for test scope
  makeKit: (
    provisionOneImpl?: (base: any, label: string) => Promise<void>,
  ) => ReturnType<ReturnType<typeof prepareEvmChainKit>>;
};

// Common per-attempt parameters (chosen for easy log visibility)
const TEST_FEE = { denom: 'atest', value: 1234n } as const;
const TEST_GAS = 5432n;

const makeTestContext = (): TestCtx => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
  };
  // Base kit preparation (unused directly; each test injects its own provisionOneImpl).
  const makeKit = (
    provisionOneImpl: (
      base: any,
      label: string,
      fee: { denom: string; value: bigint },
      evmGas: bigint,
    ) => Promise<void> = async () => {},
  ) =>
    prepareEvmChainKit(zone, {
      publishStatus: () => {},
      vowTools,
      provisionOneImpl,
    })('arbitrum' as any, ['status'], 'store', provisionBase);
  return { zone, vowTools, provisionBase, makeKit };
};

test.beforeEach(t => {
  t.context = makeTestContext();
});

test('evm-chain: requestAccount returns ready immediately when pre-populated', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  let provisionCalls = 0;
  const { account, manager } = makeKit(async () => {
    provisionCalls += 1;
  });
  manager.handleReady(makeAccountInfo(1));
  const vow = account.requestAccount(TEST_FEE, TEST_GAS);
  const value = await vowTools.when(vow);
  t.is(value.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(provisionCalls, 0, 'no provisioning triggered when ready available');
});

test('evm-chain: waits and resolves FIFO', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  const provisioned: string[] = [];
  const { account, manager, admin } = makeKit(async (_base, label) => {
    provisioned.push(label);
  });

  const v1 = account.requestAccount(TEST_FEE, TEST_GAS);
  const v2 = account.requestAccount(TEST_FEE, TEST_GAS);
  t.is(admin.getStateSnapshot().waiterCount, 2);
  t.is(provisioned.length, 2, 'two provisioning attempts started');

  // Resolve first waiter
  manager.handleReady(makeAccountInfo(1));
  const r1 = await vowTools.when(v1);
  t.is(r1.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(admin.getStateSnapshot().waiterCount, 1);

  // Resolve second waiter
  manager.handleReady(makeAccountInfo(2));
  const r2 = await vowTools.when(v2);
  t.is(r2.remoteAddress, makeAccountInfo(2).remoteAddress);
  t.is(admin.getStateSnapshot().waiterCount, 0);
});

test('evm-chain: ready buffering when extra accounts arrive', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  const { account, manager, admin } = makeKit(async () => {});

  // Arrive two accounts before any request
  manager.handleReady(makeAccountInfo(1));
  manager.handleReady(makeAccountInfo(2));
  t.is(admin.getStateSnapshot().ready.length, 2, 'two buffered ready accounts');
  t.is(admin.getStateSnapshot().waiterCount, 0);

  const v1 = account.requestAccount(TEST_FEE, TEST_GAS);
  const r1 = await vowTools.when(v1);
  t.is(r1.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(admin.getStateSnapshot().ready.length, 1);

  const v2 = account.requestAccount(TEST_FEE, TEST_GAS);
  const r2 = await vowTools.when(v2);
  t.is(r2.remoteAddress, makeAccountInfo(2).remoteAddress);
  t.is(admin.getStateSnapshot().ready.length, 0);
});

test('evm-chain: multiple waiters resolved FIFO', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  const { account, manager, admin } = makeKit(async () => {});
  const qty = 5;
  const vows = Array.from({ length: qty }, () =>
    account.requestAccount(TEST_FEE, TEST_GAS),
  );
  t.is(admin.getStateSnapshot().waiterCount, qty);
  for (let i = 0; i < qty; i += 1) {
    manager.handleReady(makeAccountInfo(i + 1));
    const resolved = await vowTools.when(vows[i]);
    t.is(
      resolved.remoteAddress,
      makeAccountInfo(i + 1).remoteAddress,
      `waiter ${i} resolved in order`,
    );
  }
  t.is(admin.getStateSnapshot().waiterCount, 0);
});

test('evm-chain: partial pool consumption with extra requests', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  const calls: string[] = [];
  const { account, manager, admin } = makeKit(async (_base, label) => {
    calls.push(label);
  });
  // Pre-fill two ready accounts
  manager.handleReady(makeAccountInfo(1));
  manager.handleReady(makeAccountInfo(2));
  t.is(admin.getStateSnapshot().ready.length, 2);

  const v1 = account.requestAccount(TEST_FEE, TEST_GAS);
  const v2 = account.requestAccount(TEST_FEE, TEST_GAS);
  const v3 = account.requestAccount(TEST_FEE, TEST_GAS);
  const r1 = await vowTools.when(v1);
  const r2 = await vowTools.when(v2);
  t.is(r1.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(r2.remoteAddress, makeAccountInfo(2).remoteAddress);
  t.is(admin.getStateSnapshot().ready.length, 0);
  t.is(admin.getStateSnapshot().waiterCount, 1, 'third request waiting');
  manager.handleReady(makeAccountInfo(3));
  const r3 = await vowTools.when(v3);
  t.is(r3.remoteAddress, makeAccountInfo(3).remoteAddress);
});

test('evm-chain: failure triggers retry provisioning', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  let attempts = 0;
  const { account, manager, admin } = makeKit(async () => {
    attempts += 1;
  });
  const v = account.requestAccount(TEST_FEE, TEST_GAS);
  t.is(attempts, 1);
  manager.handleFailure(new Error('net glitch'));
  t.is(attempts, 2, 'retry triggered');
  manager.handleReady(makeAccountInfo(7));
  const r = await vowTools.when(v);
  t.is(r.remoteAddress, makeAccountInfo(7).remoteAddress);
  t.is(admin.getStateSnapshot().waiterCount, 0);
});

test('evm-chain: outstanding counter consistency', async t => {
  const { vowTools, makeKit } = t.context as TestCtx;
  const { account, manager, admin } = makeKit(async () => {});
  const v1 = account.requestAccount(TEST_FEE, TEST_GAS);
  const v2 = account.requestAccount(TEST_FEE, TEST_GAS);
  const snap1 = admin.getStateSnapshot();
  t.is(snap1.outstanding, 2, 'two outstanding after two requests');
  manager.handleReady(makeAccountInfo(10));
  await vowTools.when(v1);
  const mid = admin.getStateSnapshot();
  t.is(mid.outstanding, 1, 'one outstanding after one resolve');
  manager.handleFailure(new Error('boom'));
  const afterFail = admin.getStateSnapshot();
  t.true(
    afterFail.outstanding >= 1,
    'retry increments outstanding (implementation-specific)',
  );
  manager.handleReady(makeAccountInfo(11));
  await vowTools.when(v2);
  t.is(admin.getStateSnapshot().waiterCount, 0);
});
