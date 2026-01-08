import test from 'ava';
import { id, keccak256, toUtf8Bytes } from 'ethers';
import type { PendingTx } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import { TxType } from '@aglocal/portfolio-contract/src/resolver/constants.js';
import { createMockPendingTxOpts, mockFetch } from './mocks.ts';
import { handlePendingTx } from '../src/pending-tx-manager.ts';

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

test('handlePendingTx ignores spurious revert and continues watching', async t => {
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
  };

  const spuriousTxHash = '0xspurioustx';
  const successTxHash = '0xsuccesstx';

  setTimeout(() => {
    const expectedIdTopic = keccak256(toUtf8Bytes(txId));

    // Set up receipt and call mocks
    provider.getTransactionReceipt = async (hash: string) => {
      if (hash === spuriousTxHash) {
        return {
          status: 0, // Reverted
          blockNumber: 18500000,
          logs: [],
          transactionHash: spuriousTxHash,
        };
      }
      if (hash === successTxHash) {
        return {
          status: 1, // Success
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

    // Authorization error (not ContractCallFailed)
    provider.call = async () => {
      const error: any = new Error('execution reverted');
      error.data = '0x08c379a0'; // Generic revert
      throw error;
    };

    const filter = {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
    };

    // Emit spurious reverted transaction
    provider.emit(filter, {
      address: contractAddress,
      topics: [id('MulticallStatus(string,bool,uint256)'), expectedIdTopic],
      data: '0x',
      transactionHash: spuriousTxHash,
      blockNumber: 18500000,
      txId,
    });

    // Then emit successful transaction
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

  // Verify spurious revert was ignored
  const ignoredLog = logMessages.find(msg =>
    msg.includes('⚠️  IGNORED REVERT'),
  );
  t.truthy(ignoredLog, 'Should log ignored spurious revert');

  // Verify successful transaction was processed
  const successLog = logMessages.find(msg => msg.includes('✅ SUCCESS'));
  t.truthy(successLog, 'Should eventually process successful transaction');
});
