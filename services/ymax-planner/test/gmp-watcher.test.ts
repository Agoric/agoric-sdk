import test from 'ava';
import { id, keccak256, toUtf8Bytes } from 'ethers';
import { createMockEvmContext } from './mocks.ts';
import { type PendingTx, handlePendingTx } from '../src/pending-tx-manager.ts';

test('handlePendingTx processes GMP transaction successfully', async t => {
  const mockEvmCtx = createMockEvmContext();
  const txId = 'tx1';
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = mockEvmCtx.evmProviders[chain];
  const type = 'gmp';

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
  };

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [
        id('MulticallExecuted(string,(bool,bytes)[])'), // MulticallExecuted event signature
        expectedIdTopic, // txId as topic
      ],
      data: '0x', // No additional data needed for this event
      transactionHash: '0x123abc',
      blockNumber: 18500000,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallExecuted(string,(bool,bytes)[])'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(mockEvmCtx, gmpTx, {
      log: logger,
      timeoutMinutes: 0.05, // 3 sec
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling gmp tx`,
    `[${txId}] Watching for MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] MulticallExecuted detected: txId=${txId} contract=${contractAddress} tx=0x123abc`,
    `[${txId}] ✓ MulticallExecuted matches txId: ${txId}`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('handlePendingTx times out GMP transaction with no matching event', async t => {
  const mockEvmCtx = createMockEvmContext();
  const txId = 'tx2';
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const type = 'gmp';

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
  };

  // Don't emit any matching events - let it timeout

  await t.notThrowsAsync(async () => {
    await handlePendingTx(mockEvmCtx, gmpTx, {
      log: logger,
      timeoutMinutes: 0.05, // 3 sec
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling gmp tx`,
    `[${txId}] Watching for MulticallExecuted events for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] ✗ No MulticallExecuted found for txId ${txId} within 0.05 minutes`,
    `[${txId}] GMP tx resolved`,
  ]);
});
