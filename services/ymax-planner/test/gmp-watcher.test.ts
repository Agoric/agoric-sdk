import test from 'ava';
import {
  AbiCoder,
  hexlify,
  id,
  Interface,
  keccak256,
  randomBytes,
  toUtf8Bytes,
} from 'ethers';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxOpts, mockFetch } from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';
import { getConfirmationsRequired } from '../src/support.ts';

test('handlePendingTx processes GMP transaction successfully', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx1';
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const provider = opts.evmProviders[chain];
  const type = TxType.GMP;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
    sourceAddress: 'cosmos:agoric-3:agoric1test',
  };

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [
        id('MulticallStatus(string,bool,uint256)'), // MulticallStatus event signature
        expectedIdTopic, // txId as topic
      ],
      data: '0x', // No additional data needed for this event
      transactionHash: '0x123abc',
      blockNumber: 18500000,
      txId,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching transaction status for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] ✅ SUCCESS: txId=${txId} txHash=0x123abc block=18500000`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('handlePendingTx logs a time out on a GMP transaction with no matching event', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx2';
  opts.fetch = mockFetch({ txId });
  const chain = 'eip155:1'; // Ethereum
  const amount = 1_000_000n; // 1 USDC
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const type = TxType.GMP;
  const provider = opts.evmProviders[chain];

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount,
    destinationAddress: `${chain}:${contractAddress}`,
    sourceAddress: 'cosmos:agoric-3:agoric1test',
  };

  // Don't emit any matching events - let it timeout

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const mockLog = {
      address: contractAddress,
      topics: [
        id('MulticallStatus(string,bool,uint256)'), // MulticallStatus event signature
        expectedIdTopic, // txId as topic
      ],
      data: '0x', // No additional data needed for this event
      transactionHash: '0x123abc',
      blockNumber: 18500000,
      txId,
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
    };

    (provider as any).emit(filter, mockLog);
  }, 700);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 600,
    });
  });

  t.deepEqual(logMessages, [
    `[${txId}] handling ${type} tx`,
    `[${txId}] Watching transaction status for txId: ${txId} at contract: ${contractAddress}`,
    `[${txId}] ✗ No transaction status found for txId ${txId} within 0.01 minutes`,
    `[${txId}] ✅ SUCCESS: txId=${txId} txHash=0x123abc block=18500000`,
    `[${txId}] GMP tx resolved`,
  ]);
});

test('handlePendingTx detects legitimate failure from ContractCallFailed revert', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx121';
  const chain = 'eip155:1';
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const type = TxType.GMP;
  const provider = opts.evmProviders[chain] as any;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount: 1_000_000n,
    destinationAddress: `${chain}:${contractAddress}`,
    sourceAddress: 'cosmos:agoric-3:agoric1test',
  };

  // ContractCallFailed error signature
  const CONTRACT_CALL_FAILED_ERROR = `0x${id('ContractCallFailed(string,uint256)').slice(2, 10)}`;

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const txHash = '0xfailedtx123';

    const mockLog = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
      data: '0x',
      transactionHash: txHash,
      blockNumber: 18500000,
      txId,
    };

    // Set up receipt for reverted transaction
    provider.getTransactionReceipt = async (hash: string) => {
      if (hash === txHash) {
        return {
          status: 0, // Reverted
          blockNumber: 18500000,
          logs: [mockLog],
          transactionHash: txHash,
        };
      }
      return null;
    };

    // Set up provider.call to throw ContractCallFailed error
    provider.call = async () => {
      const error: any = new Error('execution reverted');
      error.data =
        CONTRACT_CALL_FAILED_ERROR +
        '0000000000000000000000000000000000000000000000000000000000000001';
      throw error;
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
    };

    provider.emit(filter, mockLog);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  // Verify that the transaction was marked as failed
  const failureLog = logMessages.find(msg => msg.includes('❌ REVERTED'));
  t.truthy(
    failureLog,
    'Should log reverted transaction with ContractCallFailed',
  );
});

test('handlePendingTx ignores transaction with mismatched sourceAddress', async t => {
  const opts = createMockPendingTxOpts();
  const txId = 'tx134';
  const chain = 'eip155:1';
  const contractAddress = '0x8Cb4b25E77844fC0632aCa14f1f9B23bdd654EbF';
  const type = TxType.GMP;
  const provider = opts.evmProviders[chain] as any;

  const logMessages: string[] = [];
  const logger = (...args: any[]) => logMessages.push(args.join(' '));

  const gmpTx: PendingTx = {
    txId,
    type,
    status: 'pending',
    amount: 1_000_000n,
    destinationAddress: `${chain}:${contractAddress}`,
    sourceAddress: 'cosmos:agoric-3:agoric1test',
  };

  const spuriousTxHash = '0xspurioustx';
  const successTxHash = '0xsuccesstx';

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));
    const walletExecuteIface = new Interface([
      'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
    ]);
    const abiCoder = AbiCoder.defaultAbiCoder();

    // Create payload with txId
    const payload = abiCoder.encode(
      ['tuple(string id, tuple(address target, bytes data)[] calls)'],
      [[txId, []]],
    );

    // Spurious execution with WRONG sourceAddress
    const spuriousCalldata = walletExecuteIface.encodeFunctionData('execute', [
      hexlify(randomBytes(32)),
      'agoric',
      'agoric1wrongsender', // Wrong sourceAddress
      payload,
    ]);

    // Legitimate execution with CORRECT sourceAddress
    const legitimateCalldata = walletExecuteIface.encodeFunctionData(
      'execute',
      [
        hexlify(randomBytes(32)),
        'agoric',
        'agoric1test', // Correct sourceAddress
        payload,
      ],
    );

    // Mock getTransaction to return transaction data
    provider.getTransaction = async (hash: string) => {
      if (hash === spuriousTxHash) {
        return { data: spuriousCalldata, hash: spuriousTxHash };
      }
      if (hash === successTxHash) {
        return { data: legitimateCalldata, hash: successTxHash };
      }
      return null;
    };

    provider.getTransactionReceipt = async (hash: string) => {
      if (hash === successTxHash) {
        return {
          status: 1,
          blockNumber: 18500001,
          logs: [
            {
              address: contractAddress,
              topics: [
                id('MulticallStatus(string,bool,uint256)'),
                expectedIdTopic,
              ],
              data: '0x',
            },
          ],
          transactionHash: successTxHash,
        };
      }
      return null;
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
    };

    // First emit spurious transaction with wrong sourceAddress
    const ws = provider.websocket;
    const messageHandlers = ws.listeners('message');
    if (messageHandlers.length > 0) {
      const spuriousMsg = JSON.stringify({
        jsonrpc: '2.0',
        method: 'eth_subscription',
        params: {
          result: {
            transaction: {
              hash: spuriousTxHash,
              input: spuriousCalldata,
              to: contractAddress,
              from: '0xspurious',
            },
          },
        },
      });
      messageHandlers.forEach(h => h(spuriousMsg));
    }

    // Then emit legitimate transaction
    setTimeout(() => {
      provider.emit(filter, {
        address: contractAddress,
        topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
        data: '0x',
        transactionHash: successTxHash,
        blockNumber: 18500001,
        txId,
      });
    }, 100);
  }, 50);

  await t.notThrowsAsync(async () => {
    await handlePendingTx(gmpTx, {
      ...opts,
      log: logger,
      timeoutMs: 3000,
    });
  });

  // Verify spurious transaction with wrong sourceAddress was ignored
  const ignoredLog = logMessages.find(msg =>
    msg.includes('sourceAddress mismatch'),
  );
  t.truthy(
    ignoredLog,
    'Should log ignored transaction with wrong sourceAddress',
  );

  // Verify successful transaction was processed
  const successLog = logMessages.find(msg => msg.includes('✅ SUCCESS'));
  t.truthy(successLog, 'Should eventually process successful transaction');
});
