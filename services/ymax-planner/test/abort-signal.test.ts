import test from 'ava';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { createMockPendingTxOpts } from './mocks.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxData } from '@aglocal/portfolio-contract/tools/mocks.ts';

test('handlePendingTx aborts CCTP watcher in live mode when signal is aborted', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;
  const chainId = 'eip155:42161';

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  mockProvider.getLogs = async () => [];

  // Track calls to executeOffer (used by resolvePendingTx)
  let resolveAttempts = 0;
  const originalExecuteOffer = opts.signingSmartWalletKit.executeOffer;
  opts.signingSmartWalletKit.executeOffer = async (...args) => {
    resolveAttempts++;
    return originalExecuteOffer(...args);
  };

  // Track event listener cleanup
  let offCallCount = 0;
  const originalOff = mockProvider.off;
  mockProvider.off = (...args) => {
    offCallCount++;
    return originalOff(...args);
  };

  const abortController = new AbortController();

  const watchPromise = handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      timeoutMs: 5000,
      signal: abortController.signal,
    },
  );

  setTimeout(() => {
    mockLog('[TEST] Aborting signal');
    abortController.abort();
  }, 100);

  await watchPromise;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${recipientAddress} with amount: ${txAmount}`,
    '[TEST] Aborting signal',
  ]);

  t.is(resolveAttempts, 0, 'Transaction should not be resolved after abort');
  t.is(offCallCount, 1, 'Should remove the Transfer event listener');
});

test('handlePendingTx aborts GMP watcher in live mode when signal is aborted', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${contractAddress}`;
  const txId = 'tx2' as `tx${number}`;

  const gmpTx = createMockPendingTxData({
    type: TxType.GMP,
    destinationAddress,
  });

  const chainId = 'eip155:42161';
  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  mockProvider.getLogs = async () => [];

  // Track calls to executeOffer (used by resolvePendingTx)
  let resolveAttempts = 0;
  const originalExecuteOffer = opts.signingSmartWalletKit.executeOffer;
  opts.signingSmartWalletKit.executeOffer = async (...args) => {
    resolveAttempts++;
    return originalExecuteOffer(...args);
  };

  // Track event listener cleanup
  let offCallCount = 0;
  const originalOff = mockProvider.off;
  mockProvider.off = (...args) => {
    offCallCount++;
    return originalOff(...args);
  };

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (url: string) => {
      return {
        ok: true,
        json: async () => ({
          data: [],
        }),
      } as Response;
    },
  });

  const abortController = new AbortController();

  const watchPromise = handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
      timeoutMs: 5000,
      signal: abortController.signal,
    },
  ).catch(err => {
    // GMP watcher can throw WATCH_GMP_ABORTED when aborted, which is expected
    if (err !== 'WATCH_GMP_ABORTED') {
      throw err;
    }
  });

  setTimeout(() => {
    mockLog('[TEST] Aborting signal');
    abortController.abort();
  }, 100);

  await watchPromise;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    '[TEST] Aborting signal',
  ]);

  // Assert that the watcher actually aborted
  t.is(resolveAttempts, 0, 'Transaction should not be resolved after abort');
  t.is(
    offCallCount,
    2,
    'Should remove both event listeners (MulticallStatus and MulticallExecuted)',
  );
});

test('handlePendingTx exits early if signal is already aborted before starting', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const abortController = new AbortController();

  // Abort BEFORE starting the watcher
  abortController.abort();

  await handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      timeoutMs: 3000,
      signal: abortController.signal,
    },
  );

  // Should log that it's handling the tx and then abort immediately
  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] CCTP watch aborted before starting`,
  ]);
});

test('handlePendingTx aborts CCTP watcher in lookback mode when signal is aborted', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx1';
  const txAmount = 1_000_000n;
  const recipientAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${recipientAddress}`;
  const chainId = 'eip155:42161';

  const cctpTx = createMockPendingTxData({
    type: TxType.CCTP_TO_EVM,
    amount: txAmount,
    destinationAddress,
  });

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000;
  const txTimestampMs = currentTimeMs - 31 * 60 * 1000; // 31 min ago
  const avgBlockTimeMs = 300;
  const latestBlock = 1_450_031;

  mockProvider.getBlockNumber = async () => latestBlock;
  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Make getLogs take a long time to simulate scanning many blocks
  mockProvider.getLogs = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [];
  };

  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const abortController = new AbortController();

  const watchPromise = handlePendingTx(
    { txId, ...cctpTx },
    {
      ...opts,
      log: mockLog,
      timeoutMs: 10000,
      txTimestampMs,
      signal: abortController.signal,
    },
  );

  // Abort after 150ms - should interrupt the lookback scan
  setTimeout(() => {
    mockLog('[TEST] Aborting signal');
    abortController.abort();
  }, 150);

  await watchPromise;

  const fromBlock = 1442834;
  const toBlock = latestBlock;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.CCTP_TO_EVM} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${recipientAddress} with amount: ${txAmount}`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for Transfer to ${recipientAddress} with amount ${txAmount}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${fromBlock + 9}`,
    '[TEST] Aborting signal',
    `[${txId}] [LogScan] Aborted`,
    `[${txId}] No matching transfer found`,
    `[${txId}] Lookback completed without finding transaction, waiting for live mode`,
  ]);
});

test('handlePendingTx aborts GMP watcher in lookback mode when signal is aborted', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationAddress = `eip155:42161:${contractAddress}`;
  const txId = 'tx2' as `tx${number}`;

  const gmpTx = createMockPendingTxData({
    type: TxType.GMP,
    destinationAddress,
  });

  const chainId = 'eip155:42161';
  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chainId] as any;

  const currentTimeMs = 1700000000;
  const txTimestampMs = currentTimeMs - 10 * 1000; // 10 seconds ago
  const avgBlockTimeMs = 300;
  const latestBlock = 1_450_031;

  mockProvider.getBlockNumber = async () => latestBlock;
  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  mockProvider.getLogs = async () => {
    await new Promise(resolve => setTimeout(resolve, 200));
    return [];
  };

  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  const ctxWithFetch = harden({
    ...opts,
    fetch: async (url: string) => {
      return {
        ok: true,
        json: async () => ({
          data: [],
        }),
      } as Response;
    },
  });

  const abortController = new AbortController();

  const watchPromise = handlePendingTx(
    { txId, ...gmpTx },
    {
      ...ctxWithFetch,
      log: mockLog,
      timeoutMs: 10000,
      txTimestampMs,
      signal: abortController.signal,
    },
  ).catch(err => {
    // GMP watcher can throw WATCH_GMP_ABORTED when aborted, which is expected
    if (err !== 'WATCH_GMP_ABORTED') {
      throw err;
    }
  });

  setTimeout(() => {
    mockLog('[TEST] Aborting signal');
    abortController.abort();
  }, 150);

  await watchPromise;

  const fromBlock = 1449000;
  const toBlock = latestBlock;

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.GMP} tx`,
    `[${txId}] Watching for MulticallStatus and MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] Searching blocks ${fromBlock}/${fromBlock} → ${toBlock} for MulticallStatus or MulticallExecuted with txId ${txId} at ${contractAddress}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${fromBlock + 9}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${fromBlock + 9}`,
    '[TEST] Aborting signal',
    `[${txId}] [LogScan] Aborted`,
    `[${txId}] No matching MulticallStatus or MulticallExecuted found`,
    `[${txId}] Lookback completed without finding transaction, waiting for live mode`,
  ]);
});
