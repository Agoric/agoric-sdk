import test from 'ava';
import { watchGmp } from '../src/watchers/gmp-watcher.ts';
import { createMockEvmContext, mockFetch } from './mocks.ts';
import { type PendingTx, handlePendingTx } from '../src/pending-tx-manager.ts';

test('handlePendingTx processes GMP transaction successfully', async t => {
  const mockEvmCtx = createMockEvmContext();
  const txId = 'tx1';
  mockEvmCtx.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const destinationChain = mockEvmCtx.axelarChainIds[chain];
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

  await t.notThrowsAsync(async () => {
    await handlePendingTx(mockEvmCtx, gmpTx, {
      log: logger,
      timeoutMinutes: 0.05, // 3 sec
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling gmp tx`,
    `[${txId}] params: {"sourceChain":"agoric","destinationChain":"${destinationChain}","contractAddress":"${contractAddress}"}`,
    `[${txId}] ✅ contract call executed, txHash: 0xexecuted123`,
    `[${txId}] ✅ MulticallExecuted for txId found`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('watchGmp detects successful execution with matching txId', async t => {
  const txId = 'tx0';

  const result = await watchGmp({
    url: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
    fetch: mockFetch({ txId }),
    params: {
      sourceChain: 'agoric',
      destinationChain: 'Avalanche',
      contractAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    },
    txId,
    log: console.log,
  });

  t.true(result.success, 'Should return success for executed transaction');
  t.truthy(result.logs, 'Should return execution logs');
});

test('watchGmp rejects execution with mismatched txId', async t => {
  const expectedTxId = 'tx1';
  const actualTxId = 'tx2';

  const result = await watchGmp({
    url: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
    fetch: mockFetch({ txId: actualTxId }),
    params: {
      sourceChain: 'agoric',
      destinationChain: 'arbitrum',
      contractAddress: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
    },
    txId: expectedTxId,
    logPrefix: '[TEST]',
    timeoutMinutes: 0.05, // 3 seconds timeout for test
    retryDelaySeconds: 0.05,
    log: console.log,
  });

  t.false(result.success, 'Should return failure for mismatched txId');
  t.is(result.logs, null, 'Should not return logs for mismatched pendingTx');
});
