import { EventEmitter } from 'events';
import { ethers } from 'ethers';
import type { WebSocketProvider } from 'ethers';

import type { TxId } from '@aglocal/portfolio-contract/src/resolver/types.ts';
import type { ERC4626InstrumentId } from '@aglocal/portfolio-contract/src/type-guards.js';
import { TEST_NETWORK } from '@aglocal/portfolio-contract/tools/network/test-network.js';
import { boardSlottingMarshaller } from '@agoric/client-utils';
import type { SigningSmartWalletKit } from '@agoric/client-utils';
import {
  CaipChainIds,
  type AxelarChain,
} from '@agoric/portfolio-api/src/constants.js';
import type { OfferSpec } from '@agoric/smart-wallet/src/offers.js';
import type { EvmAddress } from '@agoric/fast-usdc';
import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import type { Log } from 'ethers/providers';
import { encodeAbiParameters, toFunctionSelector } from 'viem';
import type { CaipChainId } from '@agoric/orchestration';
import type { CosmosRestClient } from '../src/cosmos-rest-client.ts';
import type { CosmosRPCClient } from '../src/cosmos-rpc.ts';
import type { Powers as EnginePowers } from '../src/engine.ts';
import { makeGasEstimator } from '../src/gas-estimation.ts';
import type { HandlePendingTxOpts } from '../src/pending-tx-manager.ts';
import { prepareAbortController } from '../src/support.ts';
import type { YdsNotifier } from '../src/yds-notifier.ts';
import type { Sdk as SpectrumBlockchainSdk } from '../src/graphql/api-spectrum-blockchain/__generated/sdk.ts';
import type { Sdk as SpectrumPoolsSdk } from '../src/graphql/api-spectrum-pools/__generated/sdk.ts';

const PENDING_TX_PATH_PREFIX = 'published.ymax1';

// see: https://github.com/axelarnetwork/axelarjs/blob/3897c548f2e82df7fce98b352bded73329183c96/packages/api/src/gmp/types.ts#L7
type GMPTxStatus =
  | 'called'
  | 'confirming'
  | 'confirmable'
  | 'express_executed'
  | 'confirmed'
  | 'approving'
  | 'approvable'
  | 'approved'
  | 'executing'
  | 'executed'
  | 'error'
  | 'express_executable'
  | 'express_executable_without_gas_paid'
  | 'executable'
  | 'executable_without_gas_paid'
  | 'insufficient_fee';

const makeAbortController = prepareAbortController({
  setTimeout,
  AbortController,
  AbortSignal,
});

export const makeNotImplemented = (
  key: string | symbol,
  { async }: { async?: boolean } = {},
) => {
  const rejector: any = () => {
    const err = Error(`Not implemented: ${String(key)}`);
    if (async) return Promise.reject(err);
    throw err;
  };
  return rejector;
};

export const makeNotImplementedAsync = (key: string | symbol) =>
  makeNotImplemented(key, { async: true });

export const createMockSpectrumBlockchain = (amounts: {
  [key: string]: number;
}) =>
  ({
    async getBalances({
      accounts,
    }: {
      accounts: {
        chain: string;
        address: string;
        token: string;
      }[];
    }) {
      return {
        balances: accounts.map(query => {
          return { balance: String(amounts[query.token] || 0), error: null };
        }),
      };
    },
  }) as SpectrumBlockchainSdk;

export const createMockSpectrumPools = (amounts: { [key: string]: bigint }) =>
  ({
    async getBalances({
      positions,
    }: {
      positions: {
        chain: string;
        protocol: string;
        pool: string;
        address: string;
      }[];
    }) {
      return {
        balances: positions.map(query => {
          const amount = amounts[query.pool];
          const balance =
            amount !== undefined ? { USDC: Number(amount) / 1e6 } : null;
          return {
            balance,
            error: null,
          };
        }),
      };
    },
  }) as SpectrumPoolsSdk;

/** Return a correctly-typed record lacking significant functionality. */
export const createMockEnginePowers = (): EnginePowers => ({
  evmCtx: mockEvmCtx,
  rpc: {} as any,
  spectrumBlockchain: createMockSpectrumBlockchain({}),
  spectrumPools: createMockSpectrumPools({}),
  spectrumChainIds: {},
  spectrumPoolIds: {},
  cosmosRest: {} as any,
  network: TEST_NETWORK,
  signingSmartWalletKit: {} as any,
  walletStore: {} as any,
  getWalletInvocationUpdate: async () => undefined,
  now: () => NaN,
  gasEstimator: {} as any,
  usdcTokensByChain: {},
  erc4626VaultAddresses: {},
  chainNameToChainIdMap: CaipChainIds.testnet,
});

export const erc4626VaultsMock: Partial<
  Record<ERC4626InstrumentId, EvmAddress>
> = {
  // @ts-expect-error TS strings don't track length; see https://github.com/microsoft/TypeScript/issues/52243
  ERC4626_vaultU2_Ethereum: '0xbcc48e14f89f2bff20a7827148b466ae8f2fbc9b',
};

const mockFetchForGasEstimate = async (_, options?: any) => {
  return {
    ok: true,
    json: async () => String(BigInt(JSON.parse(options.body).gasLimit) * 10n),
    text: async () => String(BigInt(JSON.parse(options.body).gasLimit) * 10n),
  } as Response;
};

const mockAxelarApiAddress = 'https://api.axelar.example/';

const mockAxelarChainIdMap: Record<AxelarChain, string> = {
  Avalanche: 'Avalanche',
  Ethereum: 'Ethereum',
  Optimism: 'Optimism',
  Base: 'Base',
  Arbitrum: 'Arbitrum',
};

export const mockGasEstimator = makeGasEstimator({
  axelarApiAddress: mockAxelarApiAddress,
  axelarChainIdMap: mockAxelarChainIdMap,
  fetch: mockFetchForGasEstimate,
});

export const createMockProvider = (
  latestBlock = 1000,
  events?: Pick<Log, 'blockNumber' | 'data' | 'topics' | 'transactionHash'>[],
): WebSocketProvider => {
  const eventListeners = new Map<string, Function[]>();
  let currentBlock = latestBlock;
  const currentTimeMs = 1700000000; // 2023-11-14T22:13:20Z
  const avgBlockTimeMs = 300;

  const emitter = new EventEmitter();
  // Mock websocket for gmp-watcher - delegate to EventEmitter
  const mockWebSocket: Pick<
    EventEmitter,
    | 'on'
    | 'once'
    | 'off'
    | 'removeListener'
    | 'removeAllListeners'
    | 'emit'
    | 'listeners'
  > & { readyState: number } = {
    readyState: 1, // OPEN
    on: (...args) => emitter.on(...args),
    once: (...args) => emitter.once(...args),
    off: (...args) => emitter.off(...args),
    removeListener: (...args) => emitter.removeListener(...args),
    removeAllListeners: (...args) => emitter.removeAllListeners(...args),
    emit: (...args) => emitter.emit(...args),
    listeners: (...args) => emitter.listeners(...args),
  };
  const mockReceipts = new Map<string, any>();

  const mockProvider = {
    websocket: mockWebSocket,
    on: (eventOrFilter: any, listener: Function) => {
      const key = JSON.stringify(eventOrFilter);
      if (!eventListeners.has(key)) {
        eventListeners.set(key, []);
      }
      eventListeners.get(key)!.push(listener);

      // If subscribing to 'block' events, immediately emit next block
      if (eventOrFilter === 'block') {
        // Simulate next block in the next tick
        setTimeout(() => {
          currentBlock += 1;
          listener(currentBlock);
        }, 0);
      }
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

      // For websocket-based watchers, also trigger websocket message handlers
      // by simulating an Alchemy subscription message
      const messageHandlers = mockWebSocket.listeners('message');
      if (
        messageHandlers.length > 0 &&
        log.transactionHash &&
        eventOrFilter.topics
      ) {
        // Tests can include txId or expectedWalletAddress in the log object for websocket simulation
        const txId = (log as any).txId;
        const expectedWalletAddress = (log as any).expectedWalletAddress;
        const sourceAddress = 'agoric1test';

        if (txId || expectedWalletAddress) {
          const axelarExecuteIface = new ethers.Interface([
            'function execute(bytes32 commandId, string sourceChain, string sourceAddress, bytes payload) external',
          ]);
          const abiCoder = ethers.AbiCoder.defaultAbiCoder();

          let payload: string;
          if (txId) {
            // GMP watcher: Encode CallMessage payload with txId
            payload = abiCoder.encode(
              ['tuple(string id, tuple(address target, bytes data)[] calls)'],
              [[txId, []]], // CallMessage with txId and empty calls array
            );
          } else {
            // Wallet watcher: Encode address payload
            payload = abiCoder.encode(['address'], [expectedWalletAddress]);
          }

          const mockCalldata = axelarExecuteIface.encodeFunctionData(
            'execute',
            [
              ethers.hexlify(ethers.randomBytes(32)), // commandId
              'agoric', // sourceChain
              sourceAddress,
              payload,
            ],
          );

          // Store the receipt so getTransactionReceipt can return it
          mockReceipts.set(log.transactionHash, {
            status: 1,
            blockNumber: log.blockNumber,
            logs: [log],
            transactionHash: log.transactionHash,
          });

          // Simulate websocket message with transaction data
          const wsMessage = {
            method: 'eth_subscription',
            params: {
              result: {
                removed: false,
                transaction: {
                  hash: log.transactionHash,
                  input: mockCalldata,
                  to: log.address,
                  from: '0x0000000000000000000000000000000000000000',
                  value: '0x0',
                  gasLimit: '0x186a0',
                },
              },
            },
          };

          messageHandlers.forEach(handler => {
            handler(JSON.stringify(wsMessage));
          });
        }
      }
    },
    waitForBlock: _blockTag => {},
    getBlockNumber: async () => {
      return currentBlock;
    },
    getBlock: async (blockNumber: number) => {
      const blocksAgo = latestBlock - blockNumber;
      const ts = currentTimeMs - blocksAgo * avgBlockTimeMs;
      return { number: blockNumber, timestamp: Math.floor(ts / 1000) };
    },
    getLogs: async (args: { fromBlock: number; toBlock: number }) => {
      if (events === undefined) throw Error('No event data provided in mock');
      return events.filter(
        event =>
          event.blockNumber >= args.fromBlock &&
          event.blockNumber <= args.toBlock,
      );
    },
    getNetwork: async () => ({ chainId: 1n, name: 'ethereum' }),
    send: async () => 'mock-subscription-id',
    getTransactionReceipt: async (txHash: string) => {
      return mockReceipts.get(txHash) || null;
    },
    call: async (transaction: any) => {
      // Mock implementation for contract calls like balanceOf and convertToAssets
      // For testing purposes, we return mock data
      const { data } = transaction;

      const encodeAmount = (amount: bigint) =>
        encodeAbiParameters([{ type: 'uint256' }], [amount]);

      if (!data || data === '0x') {
        throw Error(`No data provided in mock call`);
      }

      // Parse function selector (first 4 bytes of data)
      const selector = data.slice(0, 10);

      if (selector === toFunctionSelector('balanceOf(address)')) {
        return encodeAmount(1000n);
      }

      if (selector === toFunctionSelector('convertToAssets(uint256)')) {
        return encodeAmount(3000n);
      }

      throw Error(`Unrecognized function selector in mock call: ${selector}`);
    },
    waitForTransaction: async function (
      this: any,
      txHash: string,
      confirmations?: number,
      _timeout?: number,
    ) {
      // Get receipt - use getTransactionReceipt to respect test overrides
      const receipt = await this.getTransactionReceipt(txHash);

      if (!receipt) return null;

      // Simulate waiting for confirmations by advancing blocks
      if (confirmations && confirmations > 1) {
        for (let i = 1; i < confirmations; i++) {
          await new Promise(resolve => setTimeout(resolve, 1));
          currentBlock += 1;
        }
      }

      return receipt;
    },
  };

  return mockProvider as unknown as WebSocketProvider;
};

const createMockEvmProviders = (
  latestBlock = 1000,
  events?: Pick<Log, 'blockNumber' | 'data' | 'topics' | 'transactionHash'>[],
): Record<CaipChainId, WebSocketProvider> => ({
  'eip155:1': createMockProvider(latestBlock, events),
  'eip155:42161': createMockProvider(latestBlock, events),
  'eip155:11155111': createMockProvider(latestBlock, events),
});

const createMockRpcUrls = (): Record<CaipChainId, string> => ({
  'eip155:1': 'https://mock-ethereum-rpc.example',
  'eip155:42161': 'https://mock-arbitrum-rpc.example',
  'eip155:11155111': 'https://mock-sepolia-rpc.example',
});

export const mockEvmCtx = {
  usdcAddresses: {},
  evmProviders: createMockEvmProviders(),
  rpcUrls: createMockRpcUrls(),
  kvStore: makeKVStoreFromMap(new Map()),
  makeAbortController,
  axelarApiUrl: mockAxelarApiAddress,
  ydsNotifier: {
    notifySettlement: async () => true,
  } as unknown as YdsNotifier,
};

export const createMockSigningSmartWalletKit = (): SigningSmartWalletKit => {
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
type Account = {
  '@type': string;
  address: string;
  account_number: string;
  sequence: string;
};
type CosmosRestClientConfig = {
  balanceResponses?: BalanceResponse[];
  initialAccount?: Account;
};
const DEFAULT_BALANCE_RESPONSES: BalanceResponse[] = [
  { amount: '1000000', denom: 'uusdc' },
];
const DEFAULT_ACCOUNT: Account = {
  '@type': '/cosmos.auth.v1beta1.BaseAccount',
  address: 'agoric1test',
  account_number: '377',
  sequence: '100',
};
export const createMockCosmosRestClient = (
  config: CosmosRestClientConfig = {},
) => {
  let callCount = 0;
  const balanceResponses = config.balanceResponses ?? DEFAULT_BALANCE_RESPONSES;
  const initialAccount = config.initialAccount ?? DEFAULT_ACCOUNT;
  let mockAccount = initialAccount;

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
      return Number(mockAccount.sequence);
    },
  } as any;
};

const mockGlobalFetch = url => {
  if (Object.values(createMockRpcUrls()).includes(url)) {
    return {
      ok: true,
      json: async () => [
        {
          result: [],
        },
      ],
    } as Response;
  }
};
export const createMockPendingTxOpts = (
  latestBlock = 1000,
  events?: Pick<Log, 'blockNumber' | 'data' | 'topics' | 'transactionHash'>[],
): HandlePendingTxOpts => ({
  cosmosRest: {} as unknown as CosmosRestClient,
  cosmosRpc: {} as unknown as CosmosRPCClient,
  evmProviders: createMockEvmProviders(latestBlock, events),
  rpcUrls: createMockRpcUrls(),
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore some resolutions don't expect this on global
  fetch: mockGlobalFetch,
  marshaller: boardSlottingMarshaller(),
  signingSmartWalletKit: createMockSigningSmartWalletKit(),
  ydsNotifier: {
    notifySettlement: async () => true,
  } as unknown as YdsNotifier,
  usdcAddresses: {
    'eip155:1': '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // Ethereum
    'eip155:42161': '0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8', // Arbitrum
  },
  vstoragePathPrefixes: {
    portfoliosPathPrefix: 'IGNORED',
    pendingTxPathPrefix: PENDING_TX_PATH_PREFIX,
  },
  kvStore: makeKVStoreFromMap(new Map()),
  makeAbortController,
  axelarApiUrl: mockAxelarApiAddress,
  pendingTxAbortControllers: new Map(),
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

/**
 * ABI naming convention:
 * - *_ABI_JSON: JSON ABI representation (objects with type, name, components)
 * - *_ABI_TEXT: Human-readable string format (Ethers fragment strings)
 *
 * @see https://github.com/agoric-labs/agoric-to-axelar-local/blob/b884729ab2d24decabcc4a682f4157f9cf78a08b/packages/axelar-local-dev-cosmos/src/__tests__/contracts/Factory.sol#L26-L29
 */
const GMP_INPUTS_ABI_JSON = [
  {
    type: 'tuple',
    name: 'callMessage',
    components: [
      { name: 'id', type: 'string' },
      {
        name: 'calls',
        type: 'tuple[]',
        components: [
          { name: 'target', type: 'address' },
          { name: 'data', type: 'bytes' },
        ],
      },
    ],
  },
];

const createMockAxelarScanResponse = (
  txId: string,
  status: GMPTxStatus = 'executed',
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
        payload: encodeAbiParameters(GMP_INPUTS_ABI_JSON, [
          { id: txId, calls: [] },
        ]),
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
    status,
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

  if (status === 'error') {
    return {
      data: [
        {
          ...baseEvent,
          error: {
            error: {
              message: 'Transaction execution failed',
            },
          },
        },
      ],
      total: 1,
      time_spent: 100,
    };
  }

  return {
    data: [baseEvent],
    total: 1,
    time_spent: 100,
  };
};

export const mockFetch = ({
  txId,
  status = 'executed',
}: {
  txId: TxId;
  status?: GMPTxStatus;
}) => {
  return async () => {
    const response = createMockAxelarScanResponse(txId, status);
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

export const createMockGmpStatusEvent = (
  txId: string,
  blockNumber: number,
): Pick<Log, 'blockNumber' | 'data' | 'topics' | 'transactionHash'> => {
  const MULTICALL_STATUS_SIGNATURE = ethers.id(
    'MulticallStatus(string,bool,uint256)',
  );
  const txIdTopic = ethers.keccak256(ethers.toUtf8Bytes(txId));

  return {
    blockNumber,
    topics: [MULTICALL_STATUS_SIGNATURE, txIdTopic],
    data: '0x',
    transactionHash: '0x1234567890abcdef1234567890abcdef12345678',
  };
};

export const makeStreamCellFromText = (
  blockHeight: bigint,
  values: string[],
) => ({ blockHeight: `${blockHeight}`, values });

export const makeStreamCellJsonFromText = (
  blockHeight: bigint,
  values: string[],
) => JSON.stringify(makeStreamCellFromText(blockHeight, values));
