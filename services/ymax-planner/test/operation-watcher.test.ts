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
/** Same length as MOCK_SOURCE_ADDRESS, so it pads txIds identically. */
const ATTACKER_SOURCE_ADDRESS = 'agoric1attacker0123456789abcdefghijklmn';

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
const encodeExecuteCalldata = (
  payload: string,
  sourceAddress: string = 'agoric1test',
) => {
  const axelarExecuteIface = new Interface([
    'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
  ]);
  const calldata = axelarExecuteIface.encodeFunctionData('execute', [
    hexlify(randomBytes(32)),
    'agoric',
    sourceAddress,
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
  sourceAddress: string = MOCK_SOURCE_ADDRESS,
): Pick<
  Log,
  'address' | 'topics' | 'data' | 'blockNumber' | 'transactionHash'
> => {
  const abiCoder = new AbiCoder();
  const expectedIdHash = id(paddedId);
  const sourceAddressHash = id(sourceAddress);
  const mockAccountAddress = zeroPadValue('0x01', 32);
  const reasonBytes = reason ? Buffer.from(reason, 'utf8') : new Uint8Array(0);
  const data = abiCoder.encode(
    ['string', 'bytes4', 'bool', 'bytes'],
    [paddedId, '0x00000000', success, reasonBytes],
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

const MOCK_PAYLOAD_HASH = `0x${'00'.repeat(32)}`;

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

  const txHash = '0x123abc';
  const blockNumber = 18500000;

  const mockLog = createMockOperationResultLog(
    routerAddress,
    paddedId,
    true, // success
    '',
    blockNumber,
    txHash,
  );

  // Build calldata for the Alchemy subscription message
  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    MOCK_SOURCE_ADDRESS,
  );

  // Mock receipt with OperationResult event
  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash === txHash) {
      return {
        status: 1,
        blockNumber,
        blockHash: '0xblockhash',
        transactionHash: txHash,
        logs: [mockLog],
      };
    }
    return null;
  };

  // Emit Alchemy mined-tx message after a short delay
  setTimeout(() => {
    const wsMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        result: {
          removed: false,
          transaction: {
            hash: txHash,
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
  t.true(result.success, 'Should be successful');
  t.is(result.txHash, txHash, 'Should have correct txHash');

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

  // Build calldata for the Alchemy subscription message
  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    MOCK_SOURCE_ADDRESS,
  );

  // Mock receipt with failed OperationResult event
  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash === txHash) {
      return {
        status: 1,
        blockNumber,
        blockHash: '0xblockhash',
        transactionHash: txHash,
        logs: [mockLog],
      };
    }
    return null;
  };

  // Re-fetch logs for finality check (handleOperationFailure)
  (provider as any).getLogs = async () => [mockLog];

  // waitForConfirmations polls getBlockNumber; return a block ≥ receipt +
  // revert confirmations (up to ~2000 on Arbitrum).
  (provider as any).getBlockNumber = async () => blockNumber + 5000;

  // Emit Alchemy mined-tx message after a short delay
  setTimeout(() => {
    const wsMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        result: {
          removed: false,
          transaction: {
            hash: txHash,
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
  (provider as any).getLogs = async () => [mockLog];

  // waitForConfirmations polls getTransactionReceipt + getBlockNumber;
  // provide both with the failed-receipt data.
  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash !== txHash) return null;
    return {
      status: 1,
      blockNumber,
      blockHash: '0xblockhash',
      transactionHash: txHash,
    };
  };
  (provider as any).getBlockNumber = async () => blockNumber + 5000;

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
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    MOCK_SOURCE_ADDRESS,
  );

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

  (provider as any).getBlockNumber = async () => latestBlock + 5000;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
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
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    MOCK_SOURCE_ADDRESS,
  );

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

  (provider as any).getBlockNumber = async () => blockNumber + 5000;

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

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
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

// --- Source authentication tests ---
//
// The router is shared by all portfolios, so an OperationResult whose padded id
// hash collides with a pending txId must not settle that tx unless it also came
// from the LCA that sent the message.

test('watchOperationResult ignores OperationResult event from another source (live mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx8' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const txHash = '0xspoofedlivetx';
  const blockNumber = 18500000;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  // Event carries the victim's id hash but the attacker's source address.
  const spoofedLog = createMockOperationResultLog(
    routerAddress,
    paddedId,
    true, // success
    '',
    blockNumber,
    txHash,
    ATTACKER_SOURCE_ADDRESS,
  );

  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    MOCK_SOURCE_ADDRESS,
  );

  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash === txHash) {
      return {
        status: 1,
        blockNumber,
        blockHash: '0xblockhash',
        transactionHash: txHash,
        logs: [spoofedLog],
      };
    }
    return null;
  };

  const abortController = new AbortController();

  setTimeout(() => {
    const wsMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        result: {
          removed: false,
          transaction: {
            hash: txHash,
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

  // The watcher keeps waiting when it rejects an event, so stop it explicitly.
  setTimeout(() => abortController.abort('test done'), 500);

  const result = await watchOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
    timeoutMs: 3000,
    signal: abortController.signal,
    log: logger,
  });

  t.false(result.settled, 'Should not settle on an event from another source');
  t.false(
    logMessages.some(msg => msg.includes('✅ SUCCESS')),
    'Should not log success',
  );
});

test('watchOperationResult ignores router tx from another source (live mode)', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx9' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const provider = createMockProvider(1000);
  const kvStore = makeKVStoreFromMap(new Map());
  const txHash = '0xspoofedcalldatatx';
  const blockNumber = 18500000;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  // Replay of the victim's payload (so payloadHash matches) from the attacker's
  // source address, reverting so it would otherwise settle as a failure.
  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    ATTACKER_SOURCE_ADDRESS,
  );

  (provider as any).getTransactionReceipt = async (hash: string) => {
    if (hash === txHash) {
      return {
        status: 0,
        blockNumber,
        blockHash: '0xblockhash',
        transactionHash: txHash,
        logs: [],
      };
    }
    return null;
  };
  (provider as any).getBlockNumber = async () => blockNumber + 5000;

  const abortController = new AbortController();

  setTimeout(() => {
    const wsMessage = JSON.stringify({
      jsonrpc: '2.0',
      method: 'eth_subscription',
      params: {
        result: {
          removed: false,
          transaction: {
            hash: txHash,
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

  setTimeout(() => abortController.abort('test done'), 500);

  const result = await watchOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
    timeoutMs: 3000,
    signal: abortController.signal,
    log: logger,
  });

  t.false(result.settled, 'Should not settle on a tx from another source');
  t.true(
    logMessages.some(msg => msg.includes('sourceAddress mismatch')),
    'Should log the source mismatch',
  );
  t.false(
    logMessages.some(msg => msg.includes('REVERTED')),
    'Should not report a revert',
  );
});

test('lookBackOperationResult ignores OperationResult event from another source', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx10' as `tx${number}`;
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;

  // Event carries the victim's id hash but the attacker's source address. The
  // mock provider ignores topic filters, so this also covers an RPC that
  // returns more logs than the filter asked for.
  const spoofedLog = createMockOperationResultLog(
    routerAddress,
    paddedId,
    true, // success
    '',
    latestBlock,
    '0xspoofedlookbacktx',
    ATTACKER_SOURCE_ADDRESS,
  );

  const provider = createMockProvider(latestBlock, [spoofedLog]);
  // No failed txs either (phase 2 finds nothing)
  (provider as any).send = async (method: string) => {
    if (method === 'trace_filter') return [];
    return 'mock-subscription-id';
  };

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
    makeAbortController,
    publishTimeMs: Date.now() - 60000,
    log: logger,
  });

  t.false(result.settled, 'Should not settle on an event from another source');
  t.true(
    logMessages.some(msg =>
      msg.includes(`sourceAddressHash=${id(ATTACKER_SOURCE_ADDRESS)}`),
    ),
    'Should log the rejected event source hash',
  );
  t.true(
    logMessages.some(msg => msg.includes('ROUTED_GMP_TX_NOT_FOUND')),
    'Should log not-found code',
  );
});

test('lookBackOperationResult phase 2 ignores reverted tx from another source', async t => {
  const routerAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const txId = 'tx11' as `tx${number}`;
  const chainId = 'eip155:1';
  const kvStore = makeKVStoreFromMap(new Map());
  const latestBlock = 1000;
  const revertTxHash = '0xspoofedrevertedtx';

  // Replay of the victim's payload from the attacker's source address.
  const paddedId = padTxId(txId, MOCK_SOURCE_ADDRESS);
  const payload = buildRouterPayload(paddedId);
  const { calldata, payloadHash } = encodeExecuteCalldata(
    payload,
    ATTACKER_SOURCE_ADDRESS,
  );

  const provider = createMockProvider(latestBlock, []);

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
  (provider as any).getBlockNumber = async () => latestBlock + 5000;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const result = await lookBackOperationResult({
    routerAddress: routerAddress as `0x${string}`,
    provider,
    chainId,
    kvStore,
    txId,
    sourceAddress: MOCK_SOURCE_ADDRESS,
    payloadHash,
    makeAbortController,
    publishTimeMs: Date.now() - 60000,
    log: logger,
  });

  t.false(result.settled, 'Should not settle on a tx from another source');
  t.true(
    logMessages.some(msg => msg.includes('sourceAddress mismatch')),
    'Should log the source mismatch',
  );
  t.true(
    logMessages.some(msg => msg.includes('ROUTED_GMP_TX_NOT_FOUND')),
    'Should log not-found code',
  );
});
