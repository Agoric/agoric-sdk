import test from 'ava';
import { id, toBeHex, zeroPadValue } from 'ethers';
import { watchCctpTransfer } from '../src/watchers/cctp-watcher.ts';
import {
  createMockEvmContext,
  createMockProvider,
  mockFetch,
} from './mocks.ts';
import { handlePendingTx, type PendingTx } from '../src/pending-tx-manager.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';

const usdcAddress = '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48';
const watchAddress = '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64';

const encodeAmount = (amount: bigint): string => {
  return zeroPadValue(toBeHex(amount), 32);
};

test('handlePendingTx processes CCTP transaction successfully', async t => {
  const mockEvmCtx = createMockEvmContext();
  const txId = 'tx1';
  mockEvmCtx.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = mockEvmCtx.evmProviders[chain];
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
    await handlePendingTx(mockEvmCtx, cctpTx, {
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
});

test('handlePendingTx keeps tx pending on amount mismatch until timeout', async t => {
  const mockEvmCtx = createMockEvmContext();
  const txId = 'tx2';
  mockEvmCtx.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const expectedAmount = 1_000_000n; // 1 USDC
  const notExpectedAmt = 1_00_000n;
  const receiver = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = mockEvmCtx.evmProviders[chain];
  const type = TxType.CCTP_TO_EVM;

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

  await t.notThrowsAsync(async () => {
    await handlePendingTx(mockEvmCtx, cctpTx, {
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for ERC-20 transfers to: ${receiver} with amount: ${expectedAmount}`,
    `[${txId}] Transfer detected: token=${usdcAddress} from=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 to=${receiver} amount=${notExpectedAmt} tx=0x123abc`,
    `[${txId}] Amount mismatch. Expected: ${expectedAmount}, Received: ${notExpectedAmt}`,
    `[${txId}] ✗ No matching transfer found within 0.05 minutes`,
    `[${txId}] CCTP tx resolved`,
  ]);
});

test('watchCCTPTransfer detects multiple transfers but only matches exact amount', async t => {
  const provider = createMockProvider();
  const expectedAmount = 5_000_000n; // 5 USDC

  const watchPromise = watchCctpTransfer({
    usdcAddress,
    provider,
    watchAddress,
    expectedAmount,
    timeoutMs: 6000,
    log: console.log,
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
          zeroPadValue(watchAddress.toLowerCase(), 32),
        ],
        data: amount,
        transactionHash: `0x${Math.random().toString(16).slice(2)}`,
        blockNumber: 18500000 + Math.floor(delay / 20),
      };

      const filter = {
        topics: [
          id('Transfer(address,address,uint256)'),
          null,
          zeroPadValue(watchAddress.toLowerCase(), 32),
        ],
      };

      (provider as any).emit(filter, mockLog);
    }, delay);
  });

  const result = await watchPromise;
  t.true(
    result,
    'Should detect the exact matching amount among multiple transfers',
  );
});
