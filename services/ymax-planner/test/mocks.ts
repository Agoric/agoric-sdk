import { ethers, type JsonRpcProvider } from 'ethers';

import { boardSlottingMarshaller } from '@agoric/client-utils';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers';

import type { HandlePendingTxOpts } from '../src/pending-tx-manager';
import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.ts';

import type { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import { PENDING_TX_PATH_PREFIX } from '../src/engine.ts';
import type { CosmosRPCClient } from '../src/cosmos-rpc.ts';
import type { SmartWalletKitWithSequence } from '../src/main.ts';

export const createMockProvider = () => {
  const eventListeners = new Map<string, Function[]>();

  return {
    on: (eventOrFilter: any, listener: Function) => {
      const key = JSON.stringify(eventOrFilter);
      if (!eventListeners.has(key)) {
        eventListeners.set(key, []);
      }
      eventListeners.get(key)!.push(listener);
    },
    off: (eventOrFilter: any, listener: Function) => {
      const key = JSON.stringify(eventOrFilter);
      const listeners = eventListeners.get(key);
      if (listeners) {
        const index = listeners.indexOf(listener);
        if (index > -1) {
          listeners.splice(index, 1);
        }
      }
    },
    emit: (eventOrFilter: any, log: any) => {
      const key = JSON.stringify(eventOrFilter);
      const listeners = eventListeners.get(key);
      if (listeners) {
        listeners.forEach(listener => listener(log));
      }
    },
  } as JsonRpcProvider;
};

export const createMockSigningSmartWalletKit =
  (): SmartWalletKitWithSequence => {
    const executedOffers: OfferSpec[] = [];

    return {
      address: 'agoric1mockplanner123456789abcdefghijklmnopqrstuvwxyz',

      query: {
        getCurrentWalletRecord: async () => ({
          offerToUsedInvitation: [
            [
              'resolver-offer-1',
              {
                value: [
                  {
                    description: 'resolver',
                    instance: 'mock-instance',
                    installation: 'mock-installation',
                  },
                ],
              },
            ],
          ],
          liveOffers: [],
          purses: [],
        }),
      },

      executeOffer: async (offerSpec: OfferSpec) => {
        executedOffers.push(offerSpec);
        return {
          offerId: offerSpec.id,
          invitationSpec: offerSpec.invitationSpec,
          offerArgs: offerSpec.offerArgs,
          proposal: offerSpec.proposal,
          status: 'executed',
        };
      },
    } as any;
  };

type BalanceResponse = { amount: string; denom: string };
type Account = { sequence: string; account_number: string };
type CosmosRestClientConfig = {
  balanceResponses?: BalanceResponse[];
  initialAccount?: Account;
};

const DEFAULT_BALANCE_RESPONSES: BalanceResponse[] = [
  { amount: '1000000', denom: 'uusdc' },
];
const DEFAULT_ACCOUNT: Account = { account_number: '377', sequence: '100' };

export const createMockCosmosRestClient = (
  config: CosmosRestClientConfig = {},
) => {
  const balanceResponses = config.balanceResponses ?? DEFAULT_BALANCE_RESPONSES;
  const initialAccount = config.initialAccount ?? DEFAULT_ACCOUNT;
  let mockAccount = initialAccount;
  let callCount = 0;

  return {
    getAccountBalance: async (chainKey, address, denom) => {
      const response =
        balanceResponses[callCount] ||
        balanceResponses[balanceResponses.length - 1];
      callCount += 1;
      return {
        denom,
        amount: response.amount,
      };
    },
    async getAccountSequence(chainKey: string, address: string) {
      callCount++;
      return { account: mockAccount };
    },

    getCallCount() {
      return callCount;
    },

    updateSequence(amount: string) {
      mockAccount.sequence = amount;
    },

    getNetworkSequence() {
      return mockAccount.sequence;
    },
  };
};

export const createMockPendingTxOpts = (
  mockTime = 1234567890000,
): HandlePendingTxOpts => ({
  cosmosRest: {} as unknown as CosmosRestClient,
  cosmosRpc: {} as unknown as CosmosRPCClient,
  evmProviders: {
    'eip155:1': createMockProvider(),
    'eip155:42161': createMockProvider(),
  },
  fetch: global.fetch,
  marshaller: boardSlottingMarshaller(),
  now: () => mockTime,
  signingSmartWalletKit: createMockSigningSmartWalletKit(),
  usdcAddresses: {
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    'eip155:42161': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum
  },
});

export const createMockPendingTxEvent = (
  txId: string,
  vstorageValue: string,
) => ({
  path: `${PENDING_TX_PATH_PREFIX}.${txId}`,
  value: vstorageValue,
});

export const createMockStreamCell = (values: unknown[]) => ({
  values,
  blockHeight: '1000',
});

const createMockAxelarScanResponse = (
  txId: string,
  status = 'executed',
  mockTime = 1234567890000,
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
        ms: mockTime,
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
      block_timestamp: Math.floor(mockTime / 1000),
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

export const mockFetch = (
  { txId }: { txId: TxId },
  mockTime = 1234567890000,
) => {
  return async () => {
    const response = createMockAxelarScanResponse(txId, 'executed', mockTime);
    return {
      ok: true,
      json: async () => response,
    } as Response;
  };
};

const erc20Interface = new ethers.Interface([
  'event Transfer(address indexed from, address indexed to, uint256 value)',
]);
export const createMockTransferEvent = (
  address: `0x${string}`,
  amount: bigint,
  to: string,
) => {
  const transferEvent = erc20Interface.encodeEventLog('Transfer', [
    ethers.ZeroAddress, // from (zero address for minting)
    to,
    amount,
  ]);

  return {
    address,
    topics: transferEvent.topics,
    data: transferEvent.data,
    blockNumber: 1000,
    transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
  };
};

export const createMockGmpExecutionEvent = (txId: string) => {
  const MULTICALL_EXECUTED_SIGNATURE = ethers.id(
    'MulticallExecuted(string,(bool,bytes)[])',
  );
  const txIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

  return {
    topics: [MULTICALL_EXECUTED_SIGNATURE, txIdTopic],
    data: '0x',
    transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
  };
};

type SubmitTxResponse = {
  code: number;
  height: number;
  transactionHash: string;
  sequence: number;
};
export class MockSigningSmartWalletKit {
  private submittedTransactions: Array<{
    method: string;
    sequence: number;
    timestamp: number;
  }> = [];
  private networkSequence: () => string;
  private shouldSimulateSequenceConflicts = false;
  private networkDelay = 20;
  private mockTime = 1234567890000;
  private sequenceCounter = 0;

  constructor(getNetworkSequence: () => string, mockTime = 1234567890000) {
    this.networkSequence = getNetworkSequence;
    this.mockTime = mockTime;
  }

  enableSequenceConflictSimulation() {
    this.shouldSimulateSequenceConflicts = true;
  }

  async executeOffer(offer: any, signerData: any) {
    return this.submitTransaction('executeOffer', signerData);
  }

  async invokeEntry(message: any, signerData: any) {
    return this.submitTransaction('invokeEntry', signerData);
  }

  async sendBridgeAction(action: any, fee: any, signerData: any) {
    return this.submitTransaction('sendBridgeAction', signerData);
  }

  private async submitTransaction(
    method: string,
    signerData: any,
  ): Promise<SubmitTxResponse> {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, this.networkDelay));

    const currentNetworkSequence = this.networkSequence();

    // Simulate sequence mismatch if enabled and sequence is out of sync
    if (
      this.shouldSimulateSequenceConflicts &&
      signerData.sequence < currentNetworkSequence
    ) {
      throw new Error(
        `Broadcasting transaction failed with code 32 (codespace: sdk). Log: account sequence mismatch, expected ${currentNetworkSequence}, got ${signerData.sequence}: incorrect account sequence`,
      );
    }

    // Record successful transaction
    this.submittedTransactions.push({
      method,
      sequence: signerData.sequence,
      timestamp: this.mockTime + this.sequenceCounter++ * 1000, // Increment by 1 second for each transaction
    });

    return {
      code: 0,
      height: 3321450 + this.submittedTransactions.length,
      transactionHash: `hash_${method}_${signerData.sequence}`,
      sequence: signerData.sequence,
    };
  }

  getSubmittedTransactions() {
    return this.submittedTransactions;
  }

  clearTransactions() {
    this.submittedTransactions = [];
  }

  setNetworkDelay(delay: number) {
    this.networkDelay = delay;
  }

  setMockTime(time: number) {
    this.mockTime = time;
  }
}
