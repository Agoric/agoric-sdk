import test from 'ava';
import { ethers } from 'ethers';
import { watchGmp } from '../src/watchers/gmp-watcher.ts';

const createMockAxelarResponse = (
  status: 'executed' | 'pending' | 'error',
  txId: string,
) => {
  const baseEvent = {
    call: {
      chain: 'agoric',
      blockNumber: 15234567,
      transactionHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      returnValues: {
        destinationContractAddress:
          '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
        destinationChain: 'ethereum',
        messageId: 'msg_12345',
        payload: '0x',
        sender: 'agoric1sender123',
        sourceChain: 'agoric',
      },
    },
    gas_paid: {
      transactionHash: '0xgaspaid123',
      returnValues: {
        amount: '1000000',
        messageId: 'msg_12345',
      },
    },
    confirm: {
      sourceChain: 'agoric',
      messageId: 'msg_12345',
      transactionHash: '0xconfirm123',
    },
    approved: {
      returnValues: {
        sourceChain: 'agoric',
        commandId: 'cmd_12345',
        payloadHash: '0xhash123',
      },
    },
    message_id: 'msg_12345',
    status: status === 'executed' ? 'executed' : 'confirming',
    simplified_status: status,
    is_invalid_call: false,
    is_not_enough_gas: false,
  };

  if (status === 'executed') {
    const multicallTopic = ethers.id(
      'MulticallExecuted(string,(bool,bytes)[])',
    );
    const expectedIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

    const executed = {
      chain: 'ethereum',
      sourceChain: 'agoric',
      chain_type: 'evm',
      messageId: 'msg_12345',
      created_at: {
        ms: Date.now(),
        hour: 0,
        day: 0,
        week: 0,
        month: 0,
        quarter: 0,
        year: 2024,
      },
      sourceTransactionLogIndex: 0,
      transactionIndex: 42,
      contract_address: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
      relayerAddress: '0xrelayer123',
      transactionHash: '0xexecuted123',
      blockNumber: 18500000,
      block_timestamp: Math.floor(Date.now() / 1000),
      from: '0xrelayer123',
      receipt: {
        gasUsed: '150000',
        blockNumber: 18500000,
        from: '0xrelayer123',
        transactionIndex: 42,
        status: 1,
        transactionHash: '0xexecuted123',
        cumulativeGasUsed: '2000000',
        effectiveGasPrice: '20000000000',
        confirmations: 12,
        logs: [
          {
            logIndex: 0,
            data: '0x',
            topics: [multicallTopic, expectedIdTopic],
            blockNumber: 18500000,
            transactionIndex: 42,
          },
          {
            logIndex: 1,
            data: '0xotherdata',
            topics: ['0xotherevent'],
            blockNumber: 18500000,
            transactionIndex: 42,
          },
        ],
      },
      sourceTransactionHash:
        '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
      _id: 'event_123',
      id: 'event_123',
      event: 'ContractCallExecuted',
      transaction: {
        blockNumber: 18500000,
        gas: '200000',
        from: '0xrelayer123',
        transactionIndex: 42,
        to: '0x742d35Cc6635C0532925a3b8D9dEB1C9e5eb2b64',
        hash: '0xexecuted123',
        gasPrice: '20000000000',
        chainId: 1,
        maxPriorityFeePerGas: '2000000000',
        maxFeePerGas: '25000000000',
        nonce: 100,
      },
    };

    return {
      data: [{ ...baseEvent, executed }],
      total: 1,
      time_spent: 123,
    };
  }

  return {
    data: [baseEvent],
    total: 1,
    time_spent: 100,
  };
};

test('getTxStatus detects successful execution with matching txId', async t => {
  const txId = 'tx0';

  // Mock fetch that returns executed status with matching txId
  const mockFetch = async (url: string, options: any) => {
    const response = createMockAxelarResponse('executed', txId);
    return {
      ok: true,
      json: async () => response,
    } as Response;
  };

  const result = await watchGmp({
    url: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
    fetch: mockFetch,
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
  const actualTxId = 'tx-2';

  const mockFetch = async (url: string, options: any) => {
    const response = createMockAxelarResponse('executed', actualTxId);
    return {
      ok: true,
      json: async () => response,
    } as Response;
  };

  const result = await watchGmp({
    url: 'https://testnet.api.axelarscan.io/gmp/searchGMP',
    fetch: mockFetch,
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
