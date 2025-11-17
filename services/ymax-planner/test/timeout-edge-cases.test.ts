/** @file Quick wins: Timeout and async operation edge cases */
import test from 'ava';

import { ethers, id, zeroPadValue, toBeHex } from 'ethers';
import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';

import {
  watchCctpTransfer,
  lookBackCctp,
} from '../src/watchers/cctp-watcher.ts';
import { watchGmp, lookBackGmp } from '../src/watchers/gmp-watcher.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { scanEvmLogsInChunks, waitForBlock } from '../src/support.ts';
import {
  createMockProvider,
  createMockPendingTxOpts,
  mockFetch,
} from './mocks.ts';

// ============================================================================
// 1. CCTP Watcher Timeout Scenarios
// ============================================================================

test('watchCctpTransfer resolves false on timeout without transfer', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());

  const result = await watchCctpTransfer({
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    provider,
    toAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    expectedAmount: 1_000_000n,
    timeoutMs: 100, // Very short timeout
    kvStore,
    txId: 'tx1',
  });

  t.false(result);
});

test('watchCctpTransfer resolves true before timeout when transfer arrives', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const toAddress = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';
  const expectedAmount = 1_000_000n;
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 5000,
    kvStore,
    txId: 'tx1',
  });

  // Emit transfer after short delay
  setTimeout(() => {
    const mockLog = {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: zeroPadValue(toBeHex(expectedAmount), 32),
      transactionHash: '0x123abc',
      blockNumber: 1005,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchPromise;
  t.true(result);
});

test('watchCctpTransfer handles abort signal', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const abortController = new AbortController();

  const watchPromise = watchCctpTransfer({
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    provider,
    toAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    expectedAmount: 1_000_000n,
    timeoutMs: 5000,
    signal: abortController.signal,
    kvStore,
    txId: 'tx1',
  });

  // Abort after short delay
  setTimeout(() => abortController.abort(), 50);

  const result = await watchPromise;
  t.false(result);
});

test('watchCctpTransfer ignores transfers after abort', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const abortController = new AbortController();
  const toAddress = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';
  const expectedAmount = 1_000_000n;
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 5000,
    signal: abortController.signal,
    kvStore,
    txId: 'tx1',
  });

  // Abort immediately
  abortController.abort();

  // Try to emit transfer after abort
  setTimeout(() => {
    const mockLog = {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: zeroPadValue(toBeHex(expectedAmount), 32),
      transactionHash: '0x123abc',
      blockNumber: 1005,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 100);

  const result = await watchPromise;
  t.false(result); // Should be false due to abort, not true from transfer
});

test('watchCctpTransfer with pre-aborted signal returns immediately', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const abortController = new AbortController();
  abortController.abort(); // Pre-abort

  const result = await watchCctpTransfer({
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    provider,
    toAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    expectedAmount: 1_000_000n,
    timeoutMs: 5000,
    signal: abortController.signal,
    kvStore,
    txId: 'tx1',
  });

  t.false(result);
});

// ============================================================================
// 2. GMP Watcher Timeout Scenarios
// ============================================================================

test('watchGmp resolves false on timeout without execution', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const makeAbortController = (timeout?: number) => {
    const controller = new AbortController();
    if (timeout) setTimeout(() => controller.abort(), timeout);
    return { abort: () => controller.abort(), signal: controller.signal };
  };

  const result = await watchGmp({
    provider,
    contractAddress: '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
    txId: 'tx1',
    timeoutMs: 100,
    log: () => {},
    kvStore,
    makeAbortController,
  });

  t.false(result);
});

test('watchGmp resolves true on MulticallExecuted event', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const makeAbortController = (timeout?: number) => {
    const controller = new AbortController();
    if (timeout) setTimeout(() => controller.abort(), timeout);
    return { abort: () => controller.abort(), signal: controller.signal };
  };
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx1';

  const watchPromise = watchGmp({
    provider,
    contractAddress,
    txId,
    timeoutMs: 5000,
    log: () => {},
    kvStore,
    makeAbortController,
  });

  // Emit MulticallExecuted event
  setTimeout(() => {
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedIdTopic],
      data: '0x',
      transactionHash: '0x123abc',
      blockNumber: 1005,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchPromise;
  t.true(result);
});

test('watchGmp resolves true on MulticallStatus event', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const makeAbortController = (timeout?: number) => {
    const controller = new AbortController();
    if (timeout) setTimeout(() => controller.abort(), timeout);
    return { abort: () => controller.abort(), signal: controller.signal };
  };
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx1';

  const watchPromise = watchGmp({
    provider,
    contractAddress,
    txId,
    timeoutMs: 5000,
    log: () => {},
    kvStore,
    makeAbortController,
  });

  // Emit MulticallStatus event (alternative event type)
  setTimeout(() => {
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
      data: '0x',
      transactionHash: '0x123abc',
      blockNumber: 1005,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchPromise;
  t.true(result);
});

test('watchGmp with pre-aborted signal returns immediately', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const makeAbortController = (timeout?: number) => {
    const controller = new AbortController();
    if (timeout) setTimeout(() => controller.abort(), timeout);
    return { abort: () => controller.abort(), signal: controller.signal };
  };
  const abortController = new AbortController();
  abortController.abort();

  const result = await watchGmp({
    provider,
    contractAddress: '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
    txId: 'tx1',
    timeoutMs: 5000,
    signal: abortController.signal,
    log: () => {},
    kvStore,
    makeAbortController,
  });

  t.false(result);
});

// ============================================================================
// 3. Lookback Mode Edge Cases
// ============================================================================

test('lookBackCctp handles blocks not yet available', async t => {
  const provider = createMockProvider(100); // Current block is 100
  const kvStore = makeKVStoreFromMap(new Map());

  const logs: string[] = [];
  const logFn = (...args: any[]) => logs.push(args.join(' '));

  // Try to look back from future block
  const result = await lookBackCctp({
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    provider,
    toAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    expectedAmount: 1_000_000n,
    publishTimeMs: Date.now() + 1000000, // Far future
    chainId: 'eip155:1',
    log: logFn,
    kvStore,
    txId: 'tx1',
  });

  t.false(result);
  // Should have logged about waiting for blocks
  t.true(logs.some(l => l.includes('behind') || l.includes('Waiting')));
});

test('lookBackGmp aborts both scans when one finds result', async t => {
  const mockEvents = [
    {
      blockNumber: 10,
      data: '0x',
      topics: [
        id('MulticallExecuted(string,(bool,bytes)[])'),
        ethers.keccak256(ethers.toUtf8Bytes('tx1')),
      ],
      transactionHash: '0xhash1',
    },
  ];

  const provider = createMockProvider(1000, mockEvents);
  const kvStore = makeKVStoreFromMap(new Map());
  const makeAbortController = (timeout?: number, signals?: AbortSignal[]) => {
    const controller = new AbortController();
    if (timeout) setTimeout(() => controller.abort(), timeout);
    signals?.forEach(s =>
      s.addEventListener('abort', () => controller.abort()),
    );
    return { abort: () => controller.abort(), signal: controller.signal };
  };

  const logs: string[] = [];

  const result = await lookBackGmp({
    provider,
    contractAddress: '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF',
    txId: 'tx1',
    publishTimeMs: Date.now() - 1000000,
    chainId: 'eip155:1',
    log: (...args: any[]) => logs.push(args.join(' ')),
    kvStore,
    makeAbortController,
  });

  t.true(result);
});

test('lookBackCctp resumes from saved block lower bound', async t => {
  const kvStore = makeKVStoreFromMap(new Map());

  // Pre-populate KV store with saved progress
  await kvStore.set('tx-block:tx1', '50');

  const provider = createMockProvider(1000);
  const logs: string[] = [];

  await lookBackCctp({
    usdcAddress: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    provider,
    toAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    expectedAmount: 1_000_000n,
    publishTimeMs: Date.now() - 1000000,
    chainId: 'eip155:1',
    log: (...args: any[]) => logs.push(args.join(' ')),
    kvStore,
    txId: 'tx1',
  });

  // Should mention searching from block 50, not from calculated earlier block
  t.true(logs.some(l => l.includes('50')));
});

// ============================================================================
// 4. Concurrent Operation Edge Cases
// ============================================================================

test('handlePendingTx coordinates lookback and live mode', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1';
  opts.fetch = mockFetch({ txId });
  const chain = 'eip155:1';
  const amount = 1_000_000n;
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[chain];

  const logs: string[] = [];

  const cctpTx: PendingTx = {
    txId,
    type: TxType.CCTP_TO_EVM,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${receiver}`,
  };

  // Emit transfer to be found by live mode while lookback is running
  setTimeout(() => {
    const mockLog = {
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        zeroPadValue(receiver.toLowerCase(), 32),
      ],
      data: zeroPadValue(toBeHex(amount), 32),
      transactionHash: '0x123abc',
      blockNumber: 1005,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(receiver.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 150);

  const timestampMs = Date.now() - 500000; // 500 seconds ago

  await t.notThrowsAsync(async () => {
    await handlePendingTx(
      cctpTx,
      {
        ...opts,
        log: (...args: any[]) => logs.push(args.join(' ')),
        timeoutMs: 5000,
      },
      timestampMs,
    );
  });

  t.true(logs.some(l => l.includes('CCTP tx resolved')));
});

// ============================================================================
// 5. Block Scanning Edge Cases
// ============================================================================

test('scanEvmLogsInChunks handles chunk size larger than range', async t => {
  const mockEvents = [
    {
      blockNumber: 5,
      data: '0x01',
      topics: ['0xtopic1'],
      transactionHash: '0xhash1',
    },
  ];

  const provider = createMockProvider(1000, mockEvents);

  const result = await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 10,
      chainId: 'eip155:1',
      chunkSize: 1000, // Much larger than range
    },
    async () => true,
  );

  t.truthy(result);
  t.is(result?.blockNumber, 5);
});

test('scanEvmLogsInChunks handles chunk size of 1', async t => {
  const mockEvents = [
    {
      blockNumber: 5,
      data: '0x01',
      topics: ['0xtopic1'],
      transactionHash: '0xhash1',
    },
    {
      blockNumber: 7,
      data: '0x02',
      topics: ['0xtopic2'],
      transactionHash: '0xhash2',
    },
  ];

  const provider = createMockProvider(1000, mockEvents);
  let chunkCount = 0;

  const result = await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 10,
      chainId: 'eip155:1',
      chunkSize: 1,
      onRejectedChunk: async () => {
        chunkCount++;
      },
    },
    async log => log.blockNumber === 7,
  );

  t.truthy(result);
  t.is(result?.blockNumber, 7);
  // Should have made many single-block queries
  t.true(chunkCount >= 5);
});

test('scanEvmLogsInChunks saves progress on rejected chunks', async t => {
  const provider = createMockProvider(1000, []);
  const savedRanges: Array<[number, number]> = [];

  await scanEvmLogsInChunks(
    {
      provider,
      baseFilter: {},
      fromBlock: 0,
      toBlock: 50,
      chainId: 'eip155:1',
      chunkSize: 10,
      onRejectedChunk: async (start, end) => {
        savedRanges.push([start, end]);
      },
    },
    async () => false, // Never match
  );

  // Should have saved progress for each chunk
  t.true(savedRanges.length > 0);
  t.deepEqual(savedRanges[0], [0, 9]);
  t.deepEqual(savedRanges[1], [10, 19]);
});

test('waitForBlock resolves when target block arrives', async t => {
  const provider = createMockProvider(100);

  const waitPromise = waitForBlock(provider, 101);

  // Manually emit block event
  setTimeout(() => {
    (provider as any).emit('block', 101);
  }, 50);

  const result = await waitPromise;
  t.is(result, 101);
});

test('waitForBlock handles multiple block events', async t => {
  const provider = createMockProvider(100);

  const waitPromise = waitForBlock(provider, 105);

  // Emit multiple block events
  setTimeout(() => {
    (provider as any).emit('block', 101);
    (provider as any).emit('block', 102);
    (provider as any).emit('block', 103);
    (provider as any).emit('block', 105);
  }, 50);

  const result = await waitPromise;
  t.is(result, 105);
});

// ============================================================================
// 6. Race Condition Scenarios
// ============================================================================

test('multiple transfers to same address - only exact amount matches', async t => {
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const toAddress = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';
  const expectedAmount = 3_000_000n;
  const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';

  const logs: string[] = [];
  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 5000,
    log: (...args: any[]) => logs.push(args.join(' ')),
    kvStore,
    txId: 'tx1',
  });

  const filter = {
    topics: [
      id('Transfer(address,address,uint256)'),
      null,
      zeroPadValue(toAddress.toLowerCase(), 32),
    ],
  };

  // Emit multiple transfers with different amounts
  setTimeout(() => {
    (provider as any).emit(filter, {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x0000000000000000000000000000000000000000000000000000000000000001',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: zeroPadValue(toBeHex(1_000_000n), 32),
      transactionHash: '0xhash1',
      blockNumber: 1001,
    });
  }, 20);

  setTimeout(() => {
    (provider as any).emit(filter, {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x0000000000000000000000000000000000000000000000000000000000000002',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: zeroPadValue(toBeHex(2_000_000n), 32),
      transactionHash: '0xhash2',
      blockNumber: 1002,
    });
  }, 40);

  setTimeout(() => {
    (provider as any).emit(filter, {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x0000000000000000000000000000000000000000000000000000000000000003',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: zeroPadValue(toBeHex(3_000_000n), 32), // Matching amount!
      transactionHash: '0xhash3',
      blockNumber: 1003,
    });
  }, 60);

  const result = await watchPromise;
  t.true(result);

  // Should have logged mismatch for first two, then match for third
  const mismatchLogs = logs.filter(l => l.includes('mismatch'));
  t.is(mismatchLogs.length, 2);

  const matchLogs = logs.filter(l => l.includes('Amount matches'));
  t.is(matchLogs.length, 1);
});
