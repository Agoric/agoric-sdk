import test from 'ava';
import { watchGmp } from '../src/watchers/gmp-watcher.ts';
import { mockFetch } from './mocks.ts';

test('getTxStatus detects successful execution with matching txId', async t => {
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

test('getTxStatus rejects execution with mismatched txId', async t => {
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
