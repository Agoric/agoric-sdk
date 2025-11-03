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

test('evm-chain: requestAccount returns ready immediately when pre-populated', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);

  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };

  let provisionCalls = 0;
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async () => {
      provisionCalls += 1;
    },
  });
  const { account, manager } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );

  // Simulate a provisioned account arriving before any request
  manager.handleReady(makeAccountInfo(1));
  const vow = account.requestAccount();
  const value = await vowTools.when(vow);
  t.is(value.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(provisionCalls, 0, 'no provisioning triggered when ready available');
});

test('evm-chain: waits and resolves FIFO', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };
  const provisioned: any[] = [];
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async ctx => {
      provisioned.push(ctx.label);
    },
  });
  const { account, manager, tester } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );

  const v1 = account.requestAccount();
  const v2 = account.requestAccount();
  t.is(tester.getStateSnapshot().waiterCount, 2);
  t.is(provisioned.length, 2, 'two provisioning attempts started');

  // Resolve first waiter
  manager.handleReady(makeAccountInfo(1));
  const r1 = await vowTools.when(v1);
  t.is(r1.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(tester.getStateSnapshot().waiterCount, 1);

  // Resolve second waiter
  manager.handleReady(makeAccountInfo(2));
  const r2 = await vowTools.when(v2);
  t.is(r2.remoteAddress, makeAccountInfo(2).remoteAddress);
  t.is(tester.getStateSnapshot().waiterCount, 0);
});

test('evm-chain: ready buffering when extra accounts arrive', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async () => {},
  });
  const { account, manager, tester } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );

  // Arrive two accounts before any request
  manager.handleReady(makeAccountInfo(1));
  manager.handleReady(makeAccountInfo(2));
  t.is(
    tester.getStateSnapshot().ready.length,
    2,
    'two buffered ready accounts',
  );
  t.is(tester.getStateSnapshot().waiterCount, 0);

  const v1 = account.requestAccount();
  const r1 = await vowTools.when(v1);
  t.is(r1.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(tester.getStateSnapshot().ready.length, 1);

  const v2 = account.requestAccount();
  const r2 = await vowTools.when(v2);
  t.is(r2.remoteAddress, makeAccountInfo(2).remoteAddress);
  t.is(tester.getStateSnapshot().ready.length, 0);
});

test('evm-chain: multiple waiters resolved FIFO', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async () => {},
  });
  const { account, manager, tester } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );
  const qty = 5;
  const vows = Array.from({ length: qty }, () => account.requestAccount());
  t.is(tester.getStateSnapshot().waiterCount, qty);
  for (let i = 0; i < qty; i += 1) {
    manager.handleReady(makeAccountInfo(i + 1));
    const resolved = await vowTools.when(vows[i]);
    t.is(
      resolved.remoteAddress,
      makeAccountInfo(i + 1).remoteAddress,
      `waiter ${i} resolved in order`,
    );
  }
  t.is(tester.getStateSnapshot().waiterCount, 0);
});

test('evm-chain: partial pool consumption with extra requests', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };
  const calls: string[] = [];
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async ctx => {
      calls.push(ctx.label);
    },
  });
  const { account, manager, tester } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );
  // Pre-fill two ready accounts
  manager.handleReady(makeAccountInfo(1));
  manager.handleReady(makeAccountInfo(2));
  t.is(tester.getStateSnapshot().ready.length, 2);

  const v1 = account.requestAccount();
  const v2 = account.requestAccount();
  const v3 = account.requestAccount();
  const r1 = await vowTools.when(v1);
  const r2 = await vowTools.when(v2);
  t.is(r1.remoteAddress, makeAccountInfo(1).remoteAddress);
  t.is(r2.remoteAddress, makeAccountInfo(2).remoteAddress);
  t.is(tester.getStateSnapshot().ready.length, 0);
  t.is(tester.getStateSnapshot().waiterCount, 1, 'third request waiting');
  manager.handleReady(makeAccountInfo(3));
  const r3 = await vowTools.when(v3);
  t.is(r3.remoteAddress, makeAccountInfo(3).remoteAddress);
});

test('evm-chain: failure triggers retry provisioning', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };
  let attempts = 0;
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async () => {
      attempts += 1;
    },
  });
  const { account, manager, tester } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );
  const v = account.requestAccount();
  t.is(attempts, 1);
  manager.handleFailure(new Error('net glitch'));
  t.is(attempts, 2, 'retry triggered');
  manager.handleReady(makeAccountInfo(7));
  const r = await vowTools.when(v);
  t.is(r.remoteAddress, makeAccountInfo(7).remoteAddress);
  t.is(tester.getStateSnapshot().waiterCount, 0);
});

test('evm-chain: outstanding counter consistency', async t => {
  const zone = makeHeapZone();
  const vowTools = prepareVowTools(zone);
  const provisionBase = {
    label: 'base',
    lca: makeFakeLocalAccount(),
    feeAccountP: Promise.resolve(makeFakeLocalAccount()),
    fee: { brand: null as any, value: 1n, denom: 'atest' },
    target: {
      axelarId: 'axelar-arbitrum',
      remoteAddress: '0xabc' as `0x${string}`,
    },
    gmpChain: makeFakeGmpChain() as any,
    gmpAddresses: {} as any,
    evmGas: 1n,
  };
  const makeKit = prepareEvmChainKit(zone, {
    publishStatus: () => {},
    vowTools,
    provisionOneImpl: async () => {},
  });
  const { account, manager, tester } = makeKit(
    'arbitrum' as any,
    ['status'],
    'store',
    provisionBase,
  );
  const v1 = account.requestAccount();
  const v2 = account.requestAccount();
  const snap1 = tester.getStateSnapshot();
  t.is(snap1.outstanding, 2, 'two outstanding after two requests');
  manager.handleReady(makeAccountInfo(10));
  await vowTools.when(v1);
  const mid = tester.getStateSnapshot();
  t.is(mid.outstanding, 1, 'one outstanding after one resolve');
  manager.handleFailure(new Error('boom'));
  const afterFail = tester.getStateSnapshot();
  t.true(
    afterFail.outstanding >= 1,
    'retry increments outstanding (implementation-specific)',
  );
  manager.handleReady(makeAccountInfo(11));
  await vowTools.when(v2);
  t.is(tester.getStateSnapshot().waiterCount, 0);
});
