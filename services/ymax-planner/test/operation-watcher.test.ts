import test from 'ava';
import {
  AbiCoder,
  Interface,
  id,
  hexlify,
  randomBytes,
  keccak256,
  zeroPadValue,
} from 'ethers';
import type { Log } from 'ethers';
import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import { createMockProvider } from './mocks.ts';
import { prepareAbortController } from '../src/support.ts';
import {
  watchOperationResult,
  lookBackOperationResult,
  padTxId,
} from '../src/watchers/operation-watcher.ts';

const OPERATION_RESULT_SIGNATURE = id(
  'OperationResult(string,string,string,address,bytes4,bool,bytes)',
);

const MOCK_SOURCE_ADDRESS = 'agoric1testaddr0123456789abcdefghijklmno';

/**
 * Build a mock router payload that embeds the padded txId as the first
 * function argument, mirroring the real contract's `processInstruction`
 * calldata layout: `selector + abi.encode(string paddedTxId, address, ...)`.
 */
const buildRouterPayload = (paddedTxId: string) => {
  const abiCoder = new AbiCoder();
  const mockSelector = '0xdeadbeef'; // 4-byte function selector
  const mockAddress = '0x0000000000000000000000000000000000000001';
  const encodedArgs = abiCoder.encode(
    ['string', 'address'],
    [paddedTxId, mockAddress],
  );
  return mockSelector + encodedArgs.slice(2); // selector + encoded args
};

/**
 * Encode Axelar execute() calldata with a given payload, returning the
 * calldata and the expected payloadHash (keccak256 of the raw payload bytes).
 */
const encodeExecuteCalldata = (payload: string) => {
  const axelarExecuteIface = new Interface([
    'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
  ]);
  const calldata = axelarExecuteIface.encodeFunctionData('execute', [
    hexlify(randomBytes(32)),
    'agoric',
    'agoric1test',
    payload,
  ]);
  return { calldata, payloadHash: keccak256(payload) };
};

/**
 * Create a mock OperationResult event log.
 *
 * Event: OperationResult(
 *   string indexed id, string indexed sourceAddressIndex,
 *   string sourceAddress, address indexed allegedRemoteAccount,
 *   bytes4 instructionSelector, bool success, bytes reason
 * )
 * - topics[0]: event signature
 * - topics[1]: keccak256(paddedId)                  — indexed string hash
 * - topics[2]: keccak256(sourceAddressIndex)         — indexed string hash
 * - topics[3]: allegedRemoteAccount                  — indexed address
 * - data: abi.encode(string, bytes4, bool, bytes)
 */
const createMockOperationResultLog = (
  routerAddress: string,
  paddedId: string,
  success: boolean,
  reason: string = '',
  blockNumber: number = 1000,
  transactionHash: string = '0x123abc',
): Pick<
  Log,
  'address' | 'topics' | 'data' | 'blockNumber' | 'transactionHash'
> => {
  const abiCoder = new AbiCoder();
  const expectedIdHash = id(paddedId);
  const sourceAddressHash = id(MOCK_SOURCE_ADDRESS);
  const mockAccountAddress = zeroPadValue('0x01', 32);
  const reasonBytes = reason ? Buffer.from(reason, 'utf8') : new Uint8Array(0);
  const data = abiCoder.encode(
    ['string', 'bytes4', 'bool', 'bytes'],
    [MOCK_SOURCE_ADDRESS, '0x00000000', success, reasonBytes],
  );

  return {
    address: routerAddress,
    topics: [
      OPERATION_RESULT_SIGNATURE,
      expectedIdHash,
      sourceAddressHash,
      mockAccountAddress,
    ],
    data,
    blockNumber,
    transactionHash,
  };
};

const MOCK_PAYLOAD_HASH = '0x' + '00'.repeat(32);

const makeAbortController = prepareAbortController({
  setTimeout,
  AbortController,
  AbortSignal,
});

test('watchOperationResult detects successful OperationResult event (live mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx1' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  // Emit success event after a short delay
  setTimeout(() => {
    const mockLog = createMockOperationResultLog(
      routerAddress,
      paddedId,
      true, // success
      '',
      18500000,
      '0x123abc',
    );

    const expectedIdHash = id(paddedId);
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
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash: MOCK_PAYLOAD_HASH,
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
  const txId = 'tx2' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const txHash = '0xfailedtx';
  const blockNumber = 1000;

  const mockLog = createMockOperationResultLog(
    routerAddress,
    paddedId,
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
    const expectedIdHash = id(paddedId);
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
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash: MOCK_PAYLOAD_HASH,
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
  const txId = 'tx3' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const blockNumber = latestBlock; // Put the log at latest block so it's in scan range
  const txHash = '0xsuccesstx';

  const mockLog = createMockOperationResultLog(
    routerAddress,
    paddedId,
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
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash: MOCK_PAYLOAD_HASH,
    rpcClient: {} as any,
    makeAbortController,
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
  const txId = 'tx4' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const blockNumber = latestBlock; // Put the log at latest block so it's in scan range
  const txHash = '0xfailedtx';

  const mockLog = createMockOperationResultLog(
    routerAddress,
    paddedId,
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
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash: MOCK_PAYLOAD_HASH,
    rpcClient: {} as any,
    makeAbortController,
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

// --- Revert detection tests ---

test('lookBackOperationResult phase 2 detects reverted tx via padded txId', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx5' as `tx${number}`;
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const revertTxHash = '0xrevertedtx';

  // Build a router payload containing the padded txId
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(payload);

  // No OperationResult events (phase 1 finds nothing)
  const provider = createMockProvider(latestBlock, []);

  // Mock trace_filter to return our reverted tx (eip155:1 uses trace_filter)
  (provider as any).send = async (method: string, _params: any[]) => {
    if (method === 'trace_filter') {
      return [
        {
          type: 'call',
          action: {
            from: '0x0000000000000000000000000000000000000001',
            to: routerAddress.toLowerCase(),
            input: calldata,
            value: '0x0',
            gas: '0x186a0',
            callType: 'call',
          },
          blockNumber: latestBlock,
          transactionHash: revertTxHash,
          error: 'Reverted',
          subtraces: 0,
          traceAddress: [],
        },
      ];
    }
    return 'mock-subscription-id';
  };

  // Receipt for the reverted tx
  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash === revertTxHash) {
      return {
        status: 0,
        blockNumber: latestBlock,
        blockHash: '0xblockhash',
        transactionHash: revertTxHash,
        logs: [],
      };
    }
    return null;
  };

  // waitForTransaction for finality check
  (provider as any).waitForTransaction = async () => ({
    status: 0,
    blockNumber: latestBlock,
    blockHash: '0xblockhash',
    transactionHash: revertTxHash,
  });

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  // Mock rpcClient (not used for trace_filter path but required by type)
  const mockRpcClient = {} as any;

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
    rpcClient: mockRpcClient,
    makeAbortController,
    publishTimeMs: Date.now() - 60000,
    log: logger,
  });

  t.true(result.settled, 'Should be settled');
  t.false(result.success, 'Should be failed (reverted)');
  t.is(result.txHash, revertTxHash, 'Should have correct txHash');
  t.true(
    logMessages.some(msg => msg.includes('REVERTED')),
    'Should log revert message',
  );
});

test('watchOperationResult detects revert via Alchemy subscription (live mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx6' as `tx${number}`;
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const provider = createMockProvider(1000);
  const revertTxHash = '0xrevertedlivetx';
  const blockNumber = 1001;

  // Build a router payload containing the padded txId
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(payload);

  // Receipt for the reverted tx (no OperationResult events)
  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash === revertTxHash) {
      return {
        status: 0,
        blockNumber,
        blockHash: '0xblockhash',
        transactionHash: revertTxHash,
        logs: [],
      };
    }
    return null;
  };

  // waitForTransaction for finality check
  (provider as any).waitForTransaction = async () => ({
    status: 0,
    blockNumber,
    blockHash: '0xblockhash',
    transactionHash: revertTxHash,
  });

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  // Simulate Alchemy mined-tx WebSocket message after a short delay
  setTimeout(() => {
    const wsMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        result: {
          removed: false,
          transaction: {
            hash: revertTxHash,
            input: calldata,
            to: routerAddress,
            from: '0x0000000000000000000000000000000000000001',
            value: '0x0',
            blockNumber: `0x${blockNumber.toString(16)}`,
          },
        },
        subscription: 'mock-sub-id',
      },
    });

    (provider as any).websocket.emit('message', wsMessage);
  }, 50);

  const result = await watchOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
    timeoutMs: 3000,
    log: logger,
  });

  t.true(result.settled, 'Should be settled');
  t.false(result.success, 'Should be failed (reverted)');
  t.is(result.txHash, revertTxHash, 'Should have correct txHash');
  t.true(
    logMessages.some(msg => msg.includes('REVERTED')),
    'Should log revert message',
  );
});

test('lookBackOperationResult returns not-found when both phases find nothing', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx7' as `tx${number}`;
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const payloadHash = '0xdeadbeef';

  // No events (phase 1 finds nothing)
  const provider = createMockProvider(latestBlock, []);

  // trace_filter returns no failed txs (phase 2 finds nothing)
  (provider as any).send = async (method: string) => {
    if (method === 'trace_filter') return [];
    return 'mock-subscription-id';
  };

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const mockRpcClient = {} as any;

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
    rpcClient: mockRpcClient,
    makeAbortController,
    publishTimeMs: Date.now() - 60000,
    log: logger,
  });

  t.false(result.settled, 'Should not be settled when nothing found');
  t.true(
    logMessages.some(msg => msg.includes('ROUTED_GMP_TX_NOT_FOUND')),
    'Should log not-found code',
  );
});
