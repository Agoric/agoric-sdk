import { test as rawTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { makeIssuerKit } from '@agoric/ertp';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type {
  FullMessageDetails,
  YmaxOperationDetails,
} from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.js';
import {
  getYmaxStandaloneOperationData,
  getYmaxWitness,
} from '@agoric/portfolio-api/src/evm-wallet/eip712-messages.js';
import { getPermitWitnessTransferFromData } from '@agoric/orchestration/src/utils/permit2.js';
import { makeScalarBigMapStore, type Baggage } from '@agoric/vat-data';
import type { VowTools } from '@agoric/vow';
import { prepareVowTools } from '@agoric/vow/vat.js';
import type { Zone } from '@agoric/zone';
import { makeDurableZone } from '@agoric/zone/durable.js';
import { privateKeyToAccount } from 'viem/accounts';
import {
  makeNonceManager,
  prepareEVMPortfolioOperationManager,
  prepareEVMWalletMessageHandler,
  type EVMWallet,
} from '../src/evm-wallet-handler.exo.ts';
import type { contract, PublishStatus } from '../src/portfolio.contract.ts';
import type { PortfolioKit } from '../src/portfolio.exo.ts';
import { evmTrader0PrivateKey } from './mocks.ts';

// ==================== Test Mocking Helpers ====================

type PortfolioEVMFacet = PortfolioKit['evmHandler'];
type ContractPublicFacet = Awaited<ReturnType<typeof contract>>['publicFacet'];

/** Tracks calls to mock portfolio methods */
type OpenPortfolioArgs = Parameters<
  ContractPublicFacet['openPortfolioFromEVM']
>;

type ValidateEVMMessageDomainArgs = Parameters<
  ContractPublicFacet['validateEVMMessageDomain']
>;

type WithdrawArgs = Parameters<PortfolioEVMFacet['withdraw']>;

type DepositArgs = Parameters<PortfolioEVMFacet['deposit']>;

type RebalanceArgs = Parameters<PortfolioEVMFacet['rebalance']>;

type MockPortfolioCalls = {
  openPortfolioFromEVM: OpenPortfolioArgs[];
  validateEVMMessageDomain: ValidateEVMMessageDomainArgs[];
  withdraw: WithdrawArgs[];
  deposit: DepositArgs[];
  rebalance: RebalanceArgs[];
};

/**
 * Creates a mock portfolio evmHandler facet that tracks method calls.
 * @param opts
 * @param opts.zone - The zone to create exos in
 * @param opts.vowTools - Vow tools for async returns
 * @param opts.portfolioId - The portfolio ID this mock represents
 * @param opts.calls - Object to track method invocations
 * @param opts.namePrefix - Unique prefix for exo names (to avoid collisions)
 */
const makeMockPortfolioEvmHandler = ({
  zone,
  vowTools,
  portfolioId,
  calls,
  namePrefix = '',
}: {
  zone: Zone;
  vowTools: VowTools;
  portfolioId: number;
  calls: MockPortfolioCalls;
  namePrefix: string;
}): PortfolioEVMFacet => {
  const reader: Pick<
    PortfolioKit['reader'],
    'getPortfolioId' | 'getStoragePath'
  > = zone.exo(`${namePrefix}MockReader`, undefined, {
    getPortfolioId() {
      return portfolioId;
    },
    getStoragePath() {
      return vowTools.asVow(() => `portfolios.portfolio${portfolioId}`);
    },
  });
  return zone.exo(`${namePrefix}MockPortfolioEvmHandler`, undefined, {
    getReaderFacet() {
      return reader as PortfolioKit['reader'];
    },
    validateRepresentativeInfo(..._args: unknown[]) {
      throw Error('Not implemented');
    },
    deposit(...args: DepositArgs) {
      calls.deposit.push(args);
      return 'deposit-flow';
    },
    rebalance(...args: RebalanceArgs) {
      calls.rebalance.push(args);
      return 'rebalance-flow';
    },
    withdraw(...args: WithdrawArgs) {
      calls.withdraw.push(args);
      return 'withdraw-flow';
    },
  });
};

/**
 * Creates a mock wallet with optional portfolios.
 * @param zone - The zone to create the map store in
 * @param portfolios - Array of [portfolioId, handler] tuples to initialize
 * @param namePrefix - Unique prefix for store name
 */
const makeMockWallet = (
  zone: Zone,
  portfolios: Array<readonly [number, PortfolioEVMFacet]> = [],
  namePrefix = '',
): EVMWallet => {
  const portfoliosStore: EVMWallet['portfolios'] = zone.mapStore(
    `${namePrefix}testPortfolios`,
  );
  for (const [id, handler] of portfolios) {
    portfoliosStore.init(BigInt(id), handler);
  }
  return harden({ portfolios: portfoliosStore });
};

/**
 * Creates a mock storage node.
 * @param zone - The zone to create the exo in
 * @param namePrefix - Unique prefix for exo name
 */
const makeMockStorageNode = (zone: Zone, namePrefix = '') => {
  const storageNode: Pick<StorageNode, 'makeChildNode' | 'setValue'> = zone.exo(
    `${namePrefix}MockStorageNode`,
    undefined,
    {
      makeChildNode(_name: string) {
        return storageNode as StorageNode;
      },
      async setValue(_value: string) {
        // no-op by default
      },
    },
  );
  return storageNode as StorageNode;
};

/**
 * Creates a mock public facet.
 * @param opts
 * @param opts.zone - The zone to create exos in
 * @param opts.vowTools - Vow tools for async returns
 * @param opts.calls - Object to track method invocations
 * @param opts.namePrefix - Unique prefix for exo names (to avoid collisions)
 * @param opts.getNextPortfolioId - Function to get the next portfolio ID
 */
const makeMockPublicFacet = ({
  zone,
  vowTools,
  calls,
  namePrefix = '',
  getNextPortfolioId,
}: {
  zone: Zone;
  vowTools: VowTools;
  calls: MockPortfolioCalls;
  namePrefix: string;
  getNextPortfolioId: () => number;
}) => {
  const publicFacet: Pick<
    ContractPublicFacet,
    'openPortfolioFromEVM' | 'validateEVMMessageDomain'
  > = zone.exo(`${namePrefix}MockPublicFacet`, undefined, {
    async openPortfolioFromEVM(...args: OpenPortfolioArgs) {
      calls.openPortfolioFromEVM.push(args);

      const id = getNextPortfolioId();

      const evmHandler = makeMockPortfolioEvmHandler({
        zone,
        vowTools,
        portfolioId: id,
        calls,
        namePrefix: `${namePrefix}${id}_`,
      });

      const storagePath: string = await vowTools.asPromise(
        evmHandler.getReaderFacet().getStoragePath(),
      );
      return harden({
        storagePath,
        evmHandler,
      });
    },
    async validateEVMMessageDomain(...args: ValidateEVMMessageDomainArgs) {
      calls.validateEVMMessageDomain.push(args);
    },
  });
  return publicFacet as ContractPublicFacet;
};

/** Published status entry */
type PublishedStatus = { nonce: bigint; status: string; error?: string };

/**
 * Creates a status collector for tracking published statuses.
 * Returns both the collector array and a publishStatus function.
 */
const makeStatusCollector = () => {
  const statuses: PublishedStatus[] = [];
  const publishStatus: PublishStatus = (_node: unknown, data: unknown) => {
    const anyData = data as any;
    if (anyData?.updated === 'messageUpdate') {
      statuses.push(anyData);
    }
  };
  const getStatuses = () => harden([...statuses]);
  return { publishStatus, getStatuses };
};

/**
 * Creates a complete test setup for handleOperation tests.
 */
const makeHandleOperationTestSetup = (
  zone: Zone,
  vowZoneName: string,
  options: {
    portfolios?: Array<{ id: number }>;
    namePrefix?: string;
  } = {},
) => {
  const { portfolios = [], namePrefix = '' } = options;
  const vowTools = prepareVowTools(zone.subZone(vowZoneName));
  const usdcKit = makeIssuerKit('USDC');
  const usdcBrand = usdcKit.brand;

  // Track all portfolio method calls
  const calls: MockPortfolioCalls = {
    openPortfolioFromEVM: [],
    validateEVMMessageDomain: [],
    withdraw: [],
    deposit: [],
    rebalance: [],
  };

  let nextPortfolioId = 1;
  const getNextPortfolioId = () => {
    const id = nextPortfolioId;
    nextPortfolioId += 1;
    return id;
  };

  // Create mock portfolios
  const portfolioEntries = portfolios.map(({ id }) => {
    nextPortfolioId = Math.max(nextPortfolioId, id + 1);
    const evmHandler = makeMockPortfolioEvmHandler({
      zone,
      vowTools,
      portfolioId: id,
      calls,
      namePrefix: `${namePrefix}${id}_`,
    });
    return [id, evmHandler] as const;
  });

  const mockWallet = makeMockWallet(zone, portfolioEntries, namePrefix);
  const mockStorageNode = makeMockStorageNode(zone, namePrefix);
  const mockPublicFacet = makeMockPublicFacet({
    zone,
    namePrefix,
    calls,
    vowTools,
    getNextPortfolioId,
  });
  const { publishStatus, getStatuses } = makeStatusCollector();

  const { handleOperation } = prepareEVMPortfolioOperationManager(zone, {
    vowTools,
    portfolioContractPublicFacet: mockPublicFacet,
    publishStatus,
  });

  const getCalls = () =>
    harden(
      Object.fromEntries(
        Object.entries(calls).map(([op, callList]) => [op, [...callList]]),
      ),
    );

  return {
    vowTools,
    usdcBrand,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  };
};

// ==================== Test Context ====================

const makeContext = () => {
  const baggage: Baggage = makeScalarBigMapStore('baggage', { durable: true });
  const zone = makeDurableZone(baggage);
  return { zone };
};
type Context = ReturnType<typeof makeContext>;
const test = rawTest as TestFn<Context>;

test.beforeEach(t => {
  t.context = makeContext();
});

// ==================== Tests ====================

test('Nonce Manager - add and remove nonces', t => {
  const { insertNonce, removeExpiredNonces } = makeNonceManager(t.context.zone);

  const now = 1_600_000_000n;
  const walletA = '0xAAAA';

  insertNonce({ walletOwner: walletA, nonce: 2n, deadline: now + 102n });
  t.notThrows(() =>
    insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 100n }),
  );
  t.throws(
    () =>
      insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 102n }),
    { message: /already used/ },
  );
  removeExpiredNonces(now + 101n);
  t.notThrows(() =>
    insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 102n }),
  );
  t.throws(
    () =>
      insertNonce({ walletOwner: walletA, nonce: 1n, deadline: now + 102n }),
    { message: /already used/ },
  );
});

test('handleOperation - openPortfolio', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow1', {
    namePrefix: 'test1_',
  });

  // Create an OpenPortfolio operation
  const openPortfolioOperationDetails: YmaxOperationDetails<'OpenPortfolio'> &
    Required<Pick<FullMessageDetails, 'permitDetails'>> = {
    operation: 'OpenPortfolio',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      allocations: [{ instrument: 'inst1', portion: 100n }],
    },
    permitDetails: {
      chainId: 42161n,
      token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
      amount: 1_000_000n,
      spender: '0xSpenderAddress' as const,
      permit2Payload: {
        owner: '0xOwnerAddress' as const,
        witness: '0xWitnessData' as const,
        witnessTypeString: 'WitnessTypeString' as const,
        permit: {
          permitted: {
            token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
            amount: 1_000_000n,
          },
          nonce: 123n,
          deadline: 1700000000n,
        },
        signature: '0xSignatureData' as const,
      },
    },
  };

  // Call handleOperation
  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: openPortfolioOperationDetails.permitDetails.permit2Payload.owner,
    operationDetails: harden(openPortfolioOperationDetails),
    nonce: 123n,
    deadline: 1700000000n,
  });

  // Wait for the vow to settle
  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

test('handleOperation - openPortfolio requires permitDetails', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow2', {
    namePrefix: 'test2_',
  });

  // Create an OpenPortfolio operation
  const openPortfolioOperationDetails: YmaxOperationDetails<'OpenPortfolio'> = {
    operation: 'OpenPortfolio',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      allocations: [{ instrument: 'inst1', portion: 100n }],
    },
  };

  // Call handleOperation
  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: '0xEvmWalletAddress',
    operationDetails: harden(openPortfolioOperationDetails),
    nonce: 123n,
    deadline: 1700000000n,
  });
  // Wait for the vow to settle
  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

test('handleOperation invokes withdraw with correct parameters', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow3', {
    portfolios: [{ id: 42 }],
    namePrefix: 'test3_',
  });

  // Create a Withdraw operation
  const withdrawOperationDetails: YmaxOperationDetails<'Withdraw'> = {
    operation: 'Withdraw',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      portfolio: 42n,
      withdraw: {
        amount: 1_000_000n, // 1 USDC
        token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const, // USDC on Arbitrum
      },
    },
  };

  // Call handleOperation
  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: '0xEvmWalletAddress',
    operationDetails: harden(withdrawOperationDetails),
    nonce: 123n,
    deadline: 1700000000n,
  });

  // Wait for the vow to settle
  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

test('handleOperation fails for unknown portfolio', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    getStatuses,
    mockWallet,
    mockStorageNode,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow4', {
    portfolios: [], // Empty - no portfolios
    namePrefix: 'test4_',
  });

  // Try to withdraw from non-existent portfolio
  const withdrawOperationDetails: YmaxOperationDetails<'Withdraw'> = {
    operation: 'Withdraw',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      portfolio: 999n, // doesn't exist
      withdraw: {
        amount: 1_000_000n,
        token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
      },
    },
  };

  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: '0xEvmWalletAddress',
    operationDetails: harden(withdrawOperationDetails),
    nonce: 789n,
    deadline: 1700000000n,
  });

  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

test('handleOperation invokes deposit with correct parameters', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow5', {
    portfolios: [{ id: 7 }],
    namePrefix: 'test5_',
  });

  const depositOperationDetails: YmaxOperationDetails<'Deposit'> &
    Required<Pick<FullMessageDetails, 'permitDetails'>> = {
    operation: 'Deposit',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      portfolio: 7n,
    },
    permitDetails: {
      chainId: 42161n,
      token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
      amount: 500_000n,
      spender: '0xSpenderAddress' as const,
      permit2Payload: {
        owner: '0xOwnerAddress' as const,
        witness: '0xWitnessData' as const,
        witnessTypeString: 'WitnessTypeString' as const,
        permit: {
          permitted: {
            token: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const,
            amount: 500_000n,
          },
          nonce: 10n,
          deadline: 1700000000n,
        },
        signature: '0xSignatureData' as const,
      },
    },
  };

  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: '0xEvmWalletAddress',
    operationDetails: harden(depositOperationDetails),
    nonce: 10n,
    deadline: 1700000000n,
  });

  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

test('handleOperation invokes rebalance with correct parameters', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow6', {
    portfolios: [{ id: 3 }],
    namePrefix: 'test6_',
  });

  const rebalanceOperationDetails: YmaxOperationDetails<'Rebalance'> = {
    operation: 'Rebalance',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      portfolio: 3n,
    },
  };

  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: '0xEvmWalletAddress',
    operationDetails: harden(rebalanceOperationDetails),
    nonce: 50n,
    deadline: 1700000000n,
  });

  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

test('handleOperation invokes setTargetAllocation with correct parameters', async t => {
  const { zone } = t.context;
  const {
    vowTools,
    getCalls,
    mockWallet,
    mockStorageNode,
    getStatuses,
    handleOperation,
  } = makeHandleOperationTestSetup(zone, 'vow7', {
    portfolios: [{ id: 5 }],
    namePrefix: 'test7_',
  });

  const setAllocationDetails: YmaxOperationDetails<'SetTargetAllocation'> = {
    operation: 'SetTargetAllocation',
    domain: {
      name: 'Ymax',
      version: '1',
      chainId: 42161n,
      verifyingContract: '0xVerifyingContractAddress' as const,
    },
    data: {
      allocations: [
        { instrument: 'Aave_Arbitrum', portion: 6000n },
        { instrument: 'Compound_Base', portion: 4000n },
      ],
      portfolio: 5n,
    },
  };

  const resultVow = handleOperation({
    wallet: mockWallet,
    storageNode: mockStorageNode,
    address: '0xEvmWalletAddress',
    operationDetails: harden(setAllocationDetails),
    nonce: 99n,
    deadline: 1700000000n,
  });

  await vowTools.when(resultVow);

  t.snapshot([...mockWallet.portfolios.keys()], 'Portfolio IDs');
  t.snapshot(getCalls(), 'Calls');
  t.snapshot(getStatuses(), 'Published Statuses');
});

// ==================== handleMessage Tests ====================

const ecdsaAccount = privateKeyToAccount(evmTrader0PrivateKey);
const testSigner = ecdsaAccount.address;

const MOCK_VERIFYING_CONTRACT =
  '0x1234567890abcdef1234567890abcdef12345678' as const;
const MOCK_PERMIT2_ADDRESS =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3' as const;
const MOCK_TOKEN_ADDRESS =
  '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' as const;
const CHAIN_ID = 42161n;

const CURRENT_TIME = 1_700_000_000n;

type HandleOperationArgs = Parameters<
  Parameters<typeof prepareEVMWalletMessageHandler>[1]['handleOperation']
>[0];

/**
 * Creates a test setup for handleMessage tests with mock dependencies.
 */
const makeMessageHandlerTestSetup = (
  zone: Zone,
  vowZoneName: string,
  options: {
    namePrefix?: string;
    /** Current chain time returned by the mock timer */
    currentTime?: bigint;
  } = {},
) => {
  const { namePrefix = '', currentTime = CURRENT_TIME } = options;
  const vowTools = prepareVowTools(zone.subZone(vowZoneName));

  const handleOperationCalls: HandleOperationArgs[] = [];
  const handleOperation = (args: HandleOperationArgs) => {
    handleOperationCalls.push(args);
    return vowTools.asVow(() => {});
  };

  const { insertNonce, removeExpiredNonces } = makeNonceManager(zone);

  const mockStorageNode = makeMockStorageNode(zone, namePrefix);

  const mockWallet = makeMockWallet(zone, [], namePrefix);
  const walletByAddress = zone.mapStore<string, EVMWallet>(
    `${namePrefix}walletByAddress`,
  );
  const getWalletForAddress = (address: string) => {
    if (walletByAddress.has(address)) return walletByAddress.get(address);
    walletByAddress.init(address, mockWallet);
    return mockWallet;
  };

  const mockTimerService = zone.exo(
    `${namePrefix}MockTimerService`,
    undefined,
    {
      getCurrentTimestamp() {
        return harden({ absValue: currentTime });
      },
    },
  );

  const makeEVMWalletMessageHandler = prepareEVMWalletMessageHandler(zone, {
    vowTools,
    storageNode: mockStorageNode,
    timerService: mockTimerService as any,
    permit2Addresses: {
      [`${CHAIN_ID}`]: MOCK_PERMIT2_ADDRESS,
    },
    handleOperation,
    insertNonce,
    removeExpiredNonces,
    getWalletForAddress,
  });

  const handler = makeEVMWalletMessageHandler();

  return {
    vowTools,
    handler,
    getHandleOperationCalls: () => harden([...handleOperationCalls]),
  };
};

test('handleMessage extracts standalone details and delegates to handleOperation', async t => {
  const { zone } = t.context;
  const { vowTools, handler, getHandleOperationCalls } =
    makeMessageHandlerTestSetup(zone, 'vow8', { namePrefix: 'test8_' });

  const deadline = CURRENT_TIME + 3600n;
  const message = getYmaxStandaloneOperationData(
    {
      allocations: [{ instrument: 'Aave_Arbitrum', portion: 100n }],
      portfolio: 1n,
      nonce: 1n,
      deadline,
    },
    'SetTargetAllocation',
    CHAIN_ID,
    MOCK_VERIFYING_CONTRACT,
  );

  const signature = await ecdsaAccount.signTypedData(message);

  const vow = handler.handleMessage(
    harden({
      ...message,
      signature,
    }) as any,
  );
  await vowTools.when(vow);

  const calls = getHandleOperationCalls();
  t.is(calls.length, 1);
  t.is(calls[0].address, ecdsaAccount.address);
  t.is(calls[0].nonce, 1n);
  t.is(calls[0].deadline, deadline);
  t.is(calls[0].operationDetails.operation, 'SetTargetAllocation');
  t.deepEqual(calls[0].operationDetails.domain, {
    name: 'Ymax',
    version: '1',
    chainId: CHAIN_ID,
    verifyingContract: MOCK_VERIFYING_CONTRACT,
  });
});

test('handleMessage extracts permit2 details and delegates to handleOperation', async t => {
  const { zone } = t.context;
  const { vowTools, handler, getHandleOperationCalls } =
    makeMessageHandlerTestSetup(zone, 'vow9', {
      namePrefix: 'test9_',
    });

  const deadline = CURRENT_TIME + 3600n;
  const witness = getYmaxWitness('Deposit', {
    portfolio: 1n,
  });

  const permit2Message = getPermitWitnessTransferFromData(
    {
      permitted: { token: MOCK_TOKEN_ADDRESS, amount: 500_000n },
      nonce: 1n,
      deadline,
      spender: MOCK_VERIFYING_CONTRACT,
    },
    MOCK_PERMIT2_ADDRESS,
    CHAIN_ID,
    witness,
  );

  const signature = await ecdsaAccount.signTypedData(permit2Message);

  const vow = handler.handleMessage(
    harden({
      ...permit2Message,
      signature,
    }) as any,
  );
  await vowTools.when(vow);

  const calls = getHandleOperationCalls();
  t.is(calls.length, 1);
  t.is(calls[0].address, ecdsaAccount.address);
  t.is(calls[0].nonce, 1n);
  t.is(calls[0].deadline, deadline);
  t.is(calls[0].operationDetails.operation, 'Deposit');
  t.truthy(calls[0].operationDetails.permitDetails);
  t.deepEqual(calls[0].operationDetails.domain, {
    name: 'Ymax',
    version: '1',
    chainId: CHAIN_ID,
    verifyingContract: MOCK_VERIFYING_CONTRACT,
  });
});

test('handleMessage normalizes verifiedSigner to checksum format and accepts non ECDSA signatures', async t => {
  const { zone } = t.context;
  const { vowTools, handler, getHandleOperationCalls } =
    makeMessageHandlerTestSetup(zone, 'vow13', { namePrefix: 'test13_' });

  const deadline = CURRENT_TIME + 3600n;
  const message = getYmaxStandaloneOperationData(
    {
      portfolio: 1n,
      nonce: 2n,
      deadline,
    },
    'Rebalance',
    CHAIN_ID,
    MOCK_VERIFYING_CONTRACT,
  );

  // Pass a lowercase address; handleMessage should normalize to checksum
  const vow = handler.handleMessage(
    harden({
      ...message,
      signature: '0x00',
      verifiedSigner: testSigner.toLowerCase() as `0x${string}`,
    }) as any,
  );
  await vowTools.when(vow);

  const calls = getHandleOperationCalls();
  t.is(calls.length, 1);
  // The address should be checksummed, not lowercase
  t.is(calls[0].address, testSigner);
});

test('handleMessage rejects expired deadline', async t => {
  const { zone } = t.context;
  const currentTime = CURRENT_TIME;
  const { vowTools, handler } = makeMessageHandlerTestSetup(zone, 'vow10', {
    namePrefix: 'test10_',
    currentTime,
  });

  const expiredDeadline = currentTime - 1n;
  const message = getYmaxStandaloneOperationData(
    {
      portfolio: 1n,
      nonce: 1n,
      deadline: expiredDeadline,
    },
    'Rebalance',
    CHAIN_ID,
    MOCK_VERIFYING_CONTRACT,
  );

  const signature = await ecdsaAccount.signTypedData(message);

  const vow = handler.handleMessage(
    harden({
      ...message,
      signature,
    }) as any,
  );

  await t.throwsAsync(() => vowTools.when(vow), {
    message: /Deadline has already passed/,
  });
});

test('handleMessage rejects deadline too far in the future', async t => {
  const { zone } = t.context;
  const currentTime = CURRENT_TIME;
  const { vowTools, handler } = makeMessageHandlerTestSetup(zone, 'vow11', {
    namePrefix: 'test11_',
    currentTime,
  });

  // MAX_DEADLINE_OFFSET is 1 day = 86400 seconds
  const tooFarDeadline = currentTime + 86_400n + 1n;
  const message = getYmaxStandaloneOperationData(
    {
      portfolio: 1n,
      nonce: 1n,
      deadline: tooFarDeadline,
    },
    'Rebalance',
    CHAIN_ID,
    MOCK_VERIFYING_CONTRACT,
  );

  const signature = await ecdsaAccount.signTypedData(message);

  const vow = handler.handleMessage(
    harden({
      ...message,
      signature,
    }) as any,
  );

  await t.throwsAsync(() => vowTools.when(vow), {
    message: /Deadline too far in the future/,
  });
});

test('handleMessage rejects replayed nonce', async t => {
  const { zone } = t.context;
  const { vowTools, handler } = makeMessageHandlerTestSetup(zone, 'vow12', {
    namePrefix: 'test12_',
  });

  const deadline = CURRENT_TIME + 3600n;
  const makeMsg = async (nonce: bigint) => {
    const data = getYmaxStandaloneOperationData(
      {
        portfolio: 1n,
        nonce,
        deadline,
      },
      'Rebalance',
      CHAIN_ID,
      MOCK_VERIFYING_CONTRACT,
    );
    const signature = await ecdsaAccount.signTypedData(data);
    return harden({
      ...data,
      signature,
    }) as any;
  };

  // First submission should succeed
  await vowTools.when(handler.handleMessage(await makeMsg(1n)));

  // Same nonce should be rejected
  const vow2 = handler.handleMessage(await makeMsg(1n));
  await t.throwsAsync(() => vowTools.when(vow2), {
    message: /already used/,
  });

  // Different nonce should succeed
  await vowTools.when(handler.handleMessage(await makeMsg(2n)));
});

test('handleMessage rejects permit2 message with wrong verifying contract', async t => {
  const { zone } = t.context;
  const { vowTools, handler, getHandleOperationCalls } =
    makeMessageHandlerTestSetup(zone, 'vow14', {
      namePrefix: 'test14_',
    });

  const deadline = CURRENT_TIME + 3600n;
  const witness = getYmaxWitness('Deposit', {
    portfolio: 1n,
  });

  // Use a WRONG permit2 address as verifyingContract (valid address, wrong contract)
  const wrongPermit2Address =
    '0x0000000000000000000000000000000000000001' as const;

  const permit2Message = getPermitWitnessTransferFromData(
    {
      permitted: { token: MOCK_TOKEN_ADDRESS, amount: 500_000n },
      nonce: 1n,
      deadline,
      spender: MOCK_VERIFYING_CONTRACT,
    },
    wrongPermit2Address,
    CHAIN_ID,
    witness,
  );

  const vow = handler.handleMessage(
    harden({
      ...permit2Message,
      signature: '0x00',
      verifiedSigner: testSigner,
    }) as any,
  );

  await t.throwsAsync(() => vowTools.when(vow), {
    message: /Invalid verifying contract/,
  });
  t.is(
    getHandleOperationCalls().length,
    0,
    'handleOperation should not be called',
  );
});
