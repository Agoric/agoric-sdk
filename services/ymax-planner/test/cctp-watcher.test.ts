import test from 'ava';
import { id, toBeHex, zeroPadValue } from 'ethers';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import { watchCctpTransfer } from '../src/watchers/cctp-watcher.ts';
import {
  createMockPendingTxOpts,
  createMockProvider,
  mockFetch,
} from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { claimTransferLog, getResolvedTx } from '../src/kv-store.ts';
import { WatcherTransportError } from '../src/watchers/watcher-utils.ts';

const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const toAddress = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';

const encodeAmount = (amount: bigint): string => {
  return zeroPadValue(toBeHex(amount), 32);
};

test('handlePendingTx processes CCTP transaction successfully', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1';
  opts.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[chain];
  const type = TxType.CCTP_TO_EVM;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const cctpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${receiver}`,
  };

  setTimeout(() => {
    const mockLog = {
      address: usdcAddress, // USDC contract
      topics: [
        id('Transfer(address,address,uint256)'), // Transfer event signature
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266', // from
        zeroPadValue(receiver.toLowerCase(), 32), // to (our watch address)
      ],
      data: encodeAmount(amount),
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(receiver.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(cctpTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${receiver} with amount: ${amount}`,
    `[${txId}] Transfer detected: token=${usdcAddress} from=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to=${receiver} amount=${amount} tx=0x123abc`,
    `[${txId}] ✓ Amount matches! Expected: ${amount}, Received: ${amount}`,
    `[${txId}] CCTP tx resolved`,
  ]);

  t.is(getResolvedTx(opts.kvStore, txId), 'success');
});

test('handlePendingTx keeps tx pending on amount mismatch until timeout and then logs it', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2';
  opts.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const expectedAmount = 1_000_000n; // 1 USDC
  const notExpectedAmt = 1_00_000n;
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[chain];
  const type = TxType.CCTP_TO_EVM;
  const amount = 1_000_000n; // 1 USDC

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const cctpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount: expectedAmount,
    destinationAddress: `${chain}:${receiver}`,
  };

  setTimeout(() => {
    const mockLog = {
      address: usdcAddress, // USDC contract
      topics: [
        id('Transfer(address,address,uint256)'), // Transfer event signature
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266', // from
        zeroPadValue(receiver.toLowerCase(), 32), // to (our watch address)
      ],
      data: encodeAmount(notExpectedAmt),
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(receiver.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  setTimeout(() => {
    const mockLog = {
      address: usdcAddress, // USDC contract
      topics: [
        id('Transfer(address,address,uint256)'), // Transfer event signature
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266', // from
        zeroPadValue(receiver.toLowerCase(), 32), // to (our watch address)
      ],
      data: encodeAmount(amount),
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      topics: [
        id('Transfer(address,address,uint256)'),
        null,
        zeroPadValue(receiver.toLowerCase(), 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 3010);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(cctpTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${receiver} with amount: ${expectedAmount}`,
    `[${txId}] Transfer detected: token=${usdcAddress} from=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to=${receiver} amount=${notExpectedAmt} tx=0x123abc`,
    `[${txId}] Amount mismatch. Expected: ${expectedAmount}, Received: ${notExpectedAmt}`,
    `[${txId}] [CCTP_TX_NOT_FOUND] ✗ No matching transfer found within 0.05 minutes`,
    `[${txId}] Transfer detected: token=${usdcAddress} from=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to=${receiver} amount=${amount} tx=0x123abc`,
    `[${txId}] ✓ Amount matches! Expected: ${amount}, Received: ${amount}`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('watchCCTPTransfer detects multiple transfers but only matches exact amount', async t => {
  const provider = createMockProvider();
  const expectedAmount = 5_000_000n; // 5 USDC
  const mockKvStore = makeKVStoreFromMap(new Map());

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 6000,
    log: console.log,
    kvStore: mockKvStore,
    txId: 'tx0',
  });

  const transfers = [
    { amount: encodeAmount(1_000_000n), delay: 20 }, // 1 USDC
    { amount: encodeAmount(2_000_000n), delay: 40 }, // 2 USDC
    { amount: encodeAmount(5_000_000n), delay: 60 }, // 5 USDC (match!)
    { amount: encodeAmount(8_000_000n), delay: 80 }, // 8 USDC
  ];

  transfers.forEach(({ amount, delay }) => {
    setTimeout(() => {
      const mockLog = {
        address: usdcAddress,
        topics: [
          id('Transfer(address,address,uint256)'),
          '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
          zeroPadValue(toAddress.toLowerCase(), 32),
        ],
        data: amount,
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
        blockNumber: 18500000 + Math.floor(delay / 20),
      };

      const filter = {
        topics: [
          id('Transfer(address,address,uint256)'),
          null,
          zeroPadValue(toAddress.toLowerCase(), 32),
        ],
      };

      (provider as any).emit(filter, mockLog);
    }, delay);
  });

  const result = await watchPromise;
  t.true(
    result.settled,
    'Should detect the exact matching amount among multiple transfers',
  );
});

test('watchCctpTransfer returns txHash when transfer is found', async t => {
  const provider = createMockProvider();
  const expectedAmount = 1_000_000n;
  const kvStore = makeKVStoreFromMap(new Map());

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 2000,
    kvStore,
    txId: 'tx1',
  });

  // Emit a matching transfer event
  const expectedTxHash = '0xabcdef123456789';
  setTimeout(() => {
    const mockLog = {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: encodeAmount(expectedAmount),
      transactionHash: expectedTxHash,
      blockNumber: 18500000,
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

  t.true(result.settled, 'Transfer should be found');
  t.is(
    result.txHash,
    expectedTxHash,
    'Should return the correct transaction hash',
  );
});

// Regression test for PAK-574: withdrawing 10 USDC from two 5-USDC positions
// registers two CCTP_TO_EVM pending txs with identical destinationAddress and
// identical amount. A single on-chain 5-USDC Transfer must never settle both
// legs — each leg must claim a distinct physical transfer.
test('claimTransferLog: one transfer settles at most one pending tx', t => {
  const kvStore = makeKVStoreFromMap(new Map());
  const chainId = 'eip155:1';
  const txHash = '0xdeadbeef';
  const logIndex = 3;

  // tx1 claims the transfer first.
  t.true(
    claimTransferLog(kvStore, chainId, txHash, logIndex, 'tx1'),
    'first claimant owns the transfer',
  );
  // The same tx re-claiming (e.g. after a planner restart) is idempotent.
  t.true(
    claimTransferLog(kvStore, chainId, txHash, logIndex, 'tx1'),
    're-claim by the same txId succeeds',
  );
  // A different pending tx cannot claim the already-owned transfer.
  t.false(
    claimTransferLog(kvStore, chainId, txHash, logIndex, 'tx2'),
    'a different txId cannot steal an owned transfer',
  );
  // The same (txHash) at a different logIndex is a distinct physical transfer.
  t.true(
    claimTransferLog(kvStore, chainId, txHash, logIndex + 1, 'tx2'),
    'a distinct (txHash, logIndex) is a separate transfer',
  );
});

test('watchCctpTransfer: a transfer claimed by another tx cannot settle a second tx', async t => {
  const provider = createMockProvider();
  const expectedAmount = 5_000_000n; // 5 USDC — identical for both legs
  const kvStore = makeKVStoreFromMap(new Map());
  const chainId = 'eip155:1';

  const filter = {
    topics: [
      id('Transfer(address,address,uint256)'),
      null,
      zeroPadValue(toAddress.toLowerCase(), 32),
    ],
  };
  const emitTransfer = (transactionHash: string, index: number) => {
    (provider as any).emit(filter, {
      address: usdcAddress,
      topics: [
        id('Transfer(address,address,uint256)'),
        '0x000000000000000000000000f39fd6e51aad88f6f4ce6ab8827279cfffb92266',
        zeroPadValue(toAddress.toLowerCase(), 32),
      ],
      data: encodeAmount(expectedAmount),
      transactionHash,
      index,
      blockNumber: 18500000,
    });
  };

  const transferA = '0xaaa111';
  const transferB = '0xbbb222';

  // Leg 1 (tx1) observes and claims transfer A.
  const tx1Promise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 5000,
    kvStore,
    txId: 'tx1',
    chainId,
  });
  setTimeout(() => emitTransfer(transferA, 0), 20);
  const tx1Result = await tx1Promise;
  t.true(tx1Result.settled);
  t.is(tx1Result.txHash, transferA, 'tx1 settles on transfer A');

  // Leg 2 (tx2) then observes the SAME transfer A (e.g. restart / lookback
  // overlap). It must reject the already-claimed transfer and keep watching,
  // settling only when a distinct transfer B arrives.
  const tx2Promise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount,
    timeoutMs: 5000,
    kvStore,
    txId: 'tx2',
    chainId,
  });
  setTimeout(() => emitTransfer(transferA, 0), 20); // already claimed by tx1
  setTimeout(() => emitTransfer(transferB, 0), 40); // fresh transfer
  const tx2Result = await tx2Promise;

  t.true(tx2Result.settled);
  t.is(
    tx2Result.txHash,
    transferB,
    'tx2 must not reuse transfer A; it settles on the distinct transfer B',
  );
});

test('watchCctpTransfer rejects with WatcherTransportError on WebSocket error', async t => {
  const provider = createMockProvider();
  const kvStore = makeKVStoreFromMap(new Map());

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount: 1_000_000n,
    timeoutMs: 5000,
    kvStore,
    txId: 'tx0',
  });

  setTimeout(() => {
    (provider.websocket as any).emit('error', new Error('socket boom'));
  }, 20);

  await t.throwsAsync(watchPromise, { instanceOf: WatcherTransportError });
});

test('watchCctpTransfer rejects with WatcherTransportError on WebSocket close', async t => {
  const provider = createMockProvider();
  const kvStore = makeKVStoreFromMap(new Map());

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    toAddress,
    expectedAmount: 1_000_000n,
    timeoutMs: 5000,
    kvStore,
    txId: 'tx0',
  });

  setTimeout(() => {
    (provider.websocket as any).emit('close', 1006, 'abnormal');
  }, 20);

  await t.throwsAsync(watchPromise, { instanceOf: WatcherTransportError });
});
