import test from 'ava';
import { zeroPadValue, AbiCoder, Interface, ethers } from 'ethers';
import { objectMap } from '@endo/patterns';
import type { WebSocketProvider } from 'ethers';
import { createMockPendingTxOpts } from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import {
  SMART_WALLET_CREATED_SIGNATURE,
  parseSmartWalletCreatedLog,
} from '../src/watchers/wallet-watcher.ts';

const abiCoder = new AbiCoder();

const factoryAddress = '0x51e589D94b51d01B75442AE1504cD8c50d6127C9';
// address posted on vstorage is in lowercase
const expectedWalletAddr = '0x8cb4b25e77844fc0632aca14f1f9b23bdd654ebf';
const walletOwner = 'agoric1test';
const sourceAddress = `cosmos:agoric-3:${walletOwner}`;

const createSmartWalletCreatedLog = (
  walletAddr: string,
  owner: string,
  sourceChain: string,
) => {
  const data = abiCoder.encode(['string', 'string'], [owner, sourceChain]);

  return {
    address: factoryAddress,
    topics: [
      SMART_WALLET_CREATED_SIGNATURE,
      zeroPadValue(walletAddr.toLowerCase(), 32),
    ],
    data,
    transactionHash: '0x123abc',
    blockNumber: 18500000,
  };
};

test('createSmartWalletCreatedLog followed by parseSmartWalletCreatedLog round-trips', t => {
  const testWalletAddr = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const testOwner = 'agoric1testowner456';
  const testSourceChain = 'agoric-3';

  const log = createSmartWalletCreatedLog(
    testWalletAddr,
    testOwner,
    testSourceChain,
  );

  const parsed = parseSmartWalletCreatedLog(log);

  t.is(parsed.wallet.toLowerCase(), testWalletAddr.toLowerCase());
  t.is(parsed.owner, testOwner);
  t.is(parsed.sourceChain, testSourceChain);
});

test('handlePendingTx processes MAKE_ACCOUNT transaction successfully', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1';
  const chain = 'eip155:42161'; // Arbitrum
  const provider = opts.evmProviders[chain];
  const type = TxType.MAKE_ACCOUNT;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const makeAccountTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
    factoryAddr: factoryAddress,
    sourceAddress,
  };

  // Create mockLog outside setTimeout so we can reference it in assertions
  const mockLog = createSmartWalletCreatedLog(
    expectedWalletAddr,
    walletOwner,
    'agoric-3',
  );
  // Add metadata for mock WebSocket simulation
  (mockLog as any).expectedWalletAddress = expectedWalletAddr;

  setTimeout(() => {
    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(makeAccountTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for wallet creation: subscribing to ${factoryAddress}, expecting event from ${factoryAddress}, expectedAddr ${expectedWalletAddr}`,
    `[${txId}] Attempting to subscribe to ${factoryAddress}...`,
    `[${txId}] ✓ Subscribed to ${factoryAddress} (subscription ID: mock-subscription-id)`,
    `[${txId}] ✅ SUCCESS: expectedAddr=${expectedWalletAddr} txHash=${mockLog.transactionHash} block=${mockLog.blockNumber}`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});

test('handlePendingTx logs timeout on MAKE_ACCOUNT transaction with no matching event', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2';
  const chain = 'eip155:42161'; // Arbitrum
  const provider = opts.evmProviders[chain];
  const type = TxType.MAKE_ACCOUNT;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const makeAccountTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
    factoryAddr: factoryAddress,
    sourceAddress,
  };

  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      expectedWalletAddr,
      walletOwner,
      'agoric-3',
    );
    // Add metadata for mock WebSocket simulation (though this arrives after timeout)
    (mockLog as any).expectedWalletAddress = expectedWalletAddr;

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 3010);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(makeAccountTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for wallet creation: subscribing to ${factoryAddress}, expecting event from ${factoryAddress}, expectedAddr ${expectedWalletAddr}`,
    `[${txId}] Attempting to subscribe to ${factoryAddress}...`,
    `[${txId}] ✓ Subscribed to ${factoryAddress} (subscription ID: mock-subscription-id)`,
    `[${txId}] [WALLET_TX_NOT_FOUND] ✗ No wallet creation found for expectedAddr ${expectedWalletAddr} within 0.05 minutes`,
    `[${txId}] ✅ SUCCESS: expectedAddr=${expectedWalletAddr} txHash=0x123abc block=18500000`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});

test('handlePendingTx ignores non-matching wallet addresses', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx3';
  const chain = 'eip155:42161'; // Arbitrum
  const provider = opts.evmProviders[chain];
  const type = TxType.MAKE_ACCOUNT;

  // Use a different address - getAddress normalizes it to checksummed format
  const wrongWalletAddrChecksummed =
    '0x742d35cC6635C0532925a3b8D9deB1c9E5eb2B64';

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const makeAccountTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
    factoryAddr: factoryAddress,
    sourceAddress,
  };

  // Emit wrong address first
  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      wrongWalletAddrChecksummed,
      walletOwner,
      'agoric-3',
    );
    // Add metadata for mock WebSocket simulation with wrong expected address
    (mockLog as any).expectedWalletAddress = wrongWalletAddrChecksummed;

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(wrongWalletAddrChecksummed, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 30);

  setTimeout(() => {
    const mockLog = createSmartWalletCreatedLog(
      expectedWalletAddr,
      walletOwner,
      'agoric-3',
    );
    // Add metadata for mock WebSocket simulation with correct expected address
    (mockLog as any).expectedWalletAddress = expectedWalletAddr;

    const filter = {
      address: factoryAddress,
      topics: [
        SMART_WALLET_CREATED_SIGNATURE,
        zeroPadValue(expectedWalletAddr, 32),
      ],
    };

    (provider as any).emit(filter, mockLog);
  }, 60);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(makeAccountTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  const correctTxHash = '0x123abc'; // Both use the same hash from createSmartWalletCreatedLog

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching for wallet creation: subscribing to ${factoryAddress}, expecting event from ${factoryAddress}, expectedAddr ${expectedWalletAddr}`,
    `[${txId}] Attempting to subscribe to ${factoryAddress}...`,
    `[${txId}] ✓ Subscribed to ${factoryAddress} (subscription ID: mock-subscription-id)`,
    `[${txId}] ✅ SUCCESS: expectedAddr=${expectedWalletAddr} txHash=${correctTxHash} block=18500000`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});

test('find a failed tx in MAKE_ACCOUNT lookback mode', async t => {
  const logs: string[] = [];
  const mockLog = (...args: unknown[]) => logs.push(args.join(' '));

  const txId = 'tx10' as `tx${number}`;
  const chain = 'eip155:42161';

  // Encode Factory.execute() calldata with the wallet address as payload
  const axelarExecuteIface = new Interface([
    'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
  ]);
  const payload = abiCoder.encode(['address'], [expectedWalletAddr]);
  const mockCalldata = axelarExecuteIface.encodeFunctionData('execute', [
    ethers.hexlify(ethers.randomBytes(32)),
    'agoric',
    walletOwner,
    payload,
  ]);

  const failedTxHash = '0xdeadbeef123';

  const makeAccountTx: PendingTx = {
    txId,
    type: TxType.MAKE_ACCOUNT,
    status: 'pending',
    destinationAddress: `${chain}:${factoryAddress}`,
    expectedAddr: expectedWalletAddr,
    factoryAddr: factoryAddress,
    sourceAddress,
  };

  const opts = createMockPendingTxOpts();
  const mockProvider = opts.evmProviders[chain] as any;

  const currentTimeMs = 1700000000;
  const txTimestampMs = currentTimeMs - 10 * 1000;
  const avgBlockTimeMs = 300;

  const latestBlock = 1_450_031;
  mockProvider.getBlockNumber = async () => latestBlock;

  mockProvider.getBlock = async (blockNumber: number) => {
    const blocksAgo = latestBlock - blockNumber;
    const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
    return { timestamp: Math.floor(ts / 1000) };
  };

  // Trigger block event to resolve waitForBlock
  setTimeout(() => mockProvider.emit('block', latestBlock + 1), 10);

  // Providers: getLogs returns [] so the event scanner finds nothing.
  // The failed-tx scanner is the one that produces the result.
  const newEvmProviders = objectMap(
    opts.evmProviders,
    provider =>
      ({
        ...provider,
        getLogs: async () => [],
        getTransaction: async () => ({
          hash: failedTxHash,
          to: factoryAddress,
          data: mockCalldata,
        }),
        getTransactionReceipt: async () => ({
          status: 0,
          blockNumber: latestBlock,
          transactionHash: failedTxHash,
        }),
      }) as unknown as WebSocketProvider,
  );

  const ctxWithFetch = harden({
    ...opts,
    evmProviders: newEvmProviders,
    fetch: async (url: string) => {
      if (Object.values(opts.rpcUrls).includes(url)) {
        return {
          ok: true,
          json: async () => [
            {
              result: [
                {
                  transactionHash: failedTxHash,
                  status: '0x0',
                  to: factoryAddress,
                },
              ],
            },
          ],
        } as Response;
      }
      return {} as Response;
    },
  });

  await handlePendingTx(
    { ...makeAccountTx },
    {
      ...ctxWithFetch,
      log: mockLog,
      txTimestampMs,
    },
  );

  const fromBlock = 1449000;
  const toBlock = latestBlock;
  const expectedChunkEnd = Math.min(fromBlock + 10 - 1, toBlock);

  t.deepEqual(logs, [
    `[${txId}] handling ${TxType.MAKE_ACCOUNT} tx`,
    `[${txId}] Watching for wallet creation: subscribing to ${factoryAddress}, expecting event from ${factoryAddress}, expectedAddr ${expectedWalletAddr}`,
    `[${txId}] Attempting to subscribe to ${factoryAddress}...`,
    `[${txId}] ✓ Subscribed to ${factoryAddress} (subscription ID: mock-subscription-id)`,
    `[${txId}] Searching blocks ${fromBlock} → ${toBlock} for SmartWalletCreated events emitted by ${factoryAddress}`,
    // v1 and v2 event scans run in parallel, both producing chunk messages
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock} → ${expectedChunkEnd}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock + 10} → ${expectedChunkEnd + 10}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock + 10} → ${expectedChunkEnd + 10}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock + 20} → ${expectedChunkEnd + 20}`,
    `[${txId}] [LogScan] Searching chunk ${fromBlock + 20} → ${expectedChunkEnd + 20}`,
    `[${txId}] [LogScan] Aborted`,
    `[${txId}] [LogScan] Aborted`,
    `[${txId}] Found matching failed transaction`,
    `[${txId}] ❌ REVERTED (25 confirmations): expectedAddr=${expectedWalletAddr} txHash=${failedTxHash} block=${latestBlock} - transaction failed`,
    `[${txId}] Lookback found wallet creation`,
    `[${txId}] MAKE_ACCOUNT tx resolved`,
  ]);
});
