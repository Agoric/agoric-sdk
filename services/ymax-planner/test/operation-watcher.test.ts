import test from 'ava';
import { AbiCoder, id } from 'ethers';
import type { Log } from 'ethers';
import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import { createMockProvider } from './mocks.ts';
import {
  watchOperationResult,
  lookBackOperationResult,
} from '../src/watchers/operation-watcher.ts';

const OPERATION_RESULT_SIGNATURE = id('OperationResult(string,bool,bytes)');

/**
 * Create a mock OperationResult event log.
 *
 * Event: OperationResult(string indexed id, bool success, bytes reason)
 * - topics[0]: event signature
 * - topics[1]: keccak256(id) (indexed string stored as hash)
 * - data: abi.encode(bool success, bytes reason)
 */
const createMockOperationResultLog = (
  routerAddress: string,
  expectedId: string,
  success: boolean,
  reason: string = '',
  blockNumber: number = 1000,
  transactionHash: string = '0x123abc',
): Pick<
  Log,
  'address' | 'topics' | 'data' | 'blockNumber' | 'transactionHash'
> => {
  const abiCoder = new AbiCoder();
  const expectedIdHash = id(expectedId);
  const reasonBytes = reason ? Buffer.from(reason, 'utf8') : new Uint8Array(0);
  const data = abiCoder.encode(['bool', 'bytes'], [success, reasonBytes]);

  return {
    address: routerAddress,
    topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    data,
    blockNumber,
    transactionHash,
  };
};

test('watchOperationResult detects successful OperationResult event (live mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const expectedId = 'tx1';
  const chainId = 'eip155:1';
  const txId = 'tx1' as `tx${number}`;
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  // Emit success event after a short delay
  setTimeout(() => {
    const mockLog = createMockOperationResultLog(
      routerAddress,
      expectedId,
      true, // success
      '',
      18500000,
      '0x123abc',
    );

    const expectedIdHash = id(expectedId);
    const filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    timeoutMs: 3000,
    log: logger,
  });

  t.true(result.settled, 'Should be settled');
  t.true(result.success, 'Should be successful');
  t.is(result.txHash, '0x123abc', 'Should have correct txHash');

  t.true(
    logMessages.some(msg => msg.includes('✅ SUCCESS')),
    'Should log success message',
  );
});

test('watchOperationResult detects failed OperationResult event with finality protection (live mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const expectedId = 'tx2';
  const chainId = 'eip155:1';
  const txId = 'tx2' as `tx${number}`;
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const txHash = '0xfailedtx';
  const blockNumber = 1000;

  const mockLog = createMockOperationResultLog(
    routerAddress,
    expectedId,
    false, // failure
    'revert reason',
    blockNumber,
    txHash,
  );
  (provider as any).getLogs = async () => [mockLog];

  // Override waitForTransaction to return a receipt (needed for finality check)
  (provider as any).waitForTransaction = async () => ({
    status: 1,
    blockNumber,
    blockHash: '0xblockhash',
    transactionHash: txHash,
  });

  // Emit failure event after a short delay
  setTimeout(() => {
    const expectedIdHash = id(expectedId);
    const filter = {
      address: routerAddress,
      topics: [OPERATION_RESULT_SIGNATURE, expectedIdHash],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  const result = await watchOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    timeoutMs: 3000,
    log: logger,
  });

  t.true(result.settled, 'Should be settled');
  t.false(result.success, 'Should be failed');
  t.is(result.txHash, txHash, 'Should have correct txHash');

  t.true(
    logMessages.some(msg => msg.includes('FAILURE')),
    'Should log failure message',
  );
});

test('lookBackOperationResult finds successful OperationResult event (lookback mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const expectedId = 'tx3';
  const chainId = 'eip155:1';
  const txId = 'tx3' as `tx${number}`;
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const blockNumber = latestBlock; // Put the log at latest block so it's in scan range
  const txHash = '0xsuccesstx';

  const mockLog = createMockOperationResultLog(
    routerAddress,
    expectedId,
    true, // success
    '',
    blockNumber,
    txHash,
  );

  const provider = createMockProvider(latestBlock, [mockLog]);

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    publishTimeMs: Date.now() - 60000, // 1 minute ago
    log: logger,
  });

  t.true(result.settled, 'Should be settled');
  t.true(result.success, 'Should be successful');
  t.is(result.txHash, txHash, 'Should have correct txHash');

  t.true(
    logMessages.some(msg => msg.includes('✅ SUCCESS')),
    'Should log success message',
  );
});

test('lookBackOperationResult finds failed OperationResult event with finality protection (lookback mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const expectedId = 'tx4';
  const chainId = 'eip155:1';
  const txId = 'tx4' as `tx${number}`;
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const blockNumber = latestBlock; // Put the log at latest block so it's in scan range
  const txHash = '0xfailedtx';

  const mockLog = createMockOperationResultLog(
    routerAddress,
    expectedId,
    false, // failure
    'execution reverted',
    blockNumber,
    txHash,
  );

  const provider = createMockProvider(latestBlock, [mockLog]);
  (provider as any).getLogs = async (args: any) => {
    if (
      args.fromBlock <= blockNumber &&
      (args.toBlock === undefined || args.toBlock >= blockNumber)
    ) {
      return [mockLog];
    }
    return [];
  };

  (provider as any).waitForTransaction = async () => ({
    status: 1,
    blockNumber,
    blockHash: '0xblockhash',
    transactionHash: txHash,
  });

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    publishTimeMs: Date.now() - 60000, // 1 minute ago
    log: logger,
  });

  t.true(result.settled, 'Should be settled');
  t.false(result.success, 'Should be failed');
  t.is(result.txHash, txHash, 'Should have correct txHash');

  t.true(
    logMessages.some(msg => msg.includes('FAILURE')),
    'Should log failure message',
  );
});
