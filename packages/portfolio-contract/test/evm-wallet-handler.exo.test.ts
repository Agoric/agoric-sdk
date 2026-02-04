import { test as rawTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { makeIssuerKit } from '@agoric/ertp';
import type { StorageNode } from '@agoric/internal/src/lib-chainStorage.js';
import type {
  FullMessageDetails,
  YmaxOperationDetails,
} from '@agoric/portfolio-api/src/evm-wallet/message-handler-helpers.ts';
import { makeScalarBigMapStore, type Baggage } from '@agoric/vat-data';
import type { VowTools } from '@agoric/vow';
import { prepareVowTools } from '@agoric/vow/vat.js';
import type { Zone } from '@agoric/zone';
import { makeDurableZone } from '@agoric/zone/durable.js';
import {
  makeNonceManager,
  prepareEVMPortfolioOperationManager,
  type EVMWallet,
} from '../src/evm-wallet-handler.exo.ts';
import type { contract, PublishStatus } from '../src/portfolio.contract.ts';
import type { PortfolioKit } from '../src/portfolio.exo.ts';

// ==================== Test Mocking Helpers ====================

type PortfolioEVMFacet = PortfolioKit['evmHandler'];
type ContractPublicFacet = Awaited<ReturnType<typeof contract>>['publicFacet'];

/** Tracks calls to mock portfolio methods */
type OpenPortfolioArgs = Parameters<
  ContractPublicFacet['openPortfolioFromEVM']
>;

type WithdrawArgs = Parameters<PortfolioEVMFacet['withdraw']>;

type DepositArgs = Parameters<PortfolioEVMFacet['deposit']>;

type RebalanceArgs = Parameters<PortfolioEVMFacet['rebalance']>;

type MockPortfolioCalls = {
  openPortfolioFromEVM: OpenPortfolioArgs[];
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
    deposit(...args: DepositArgs) {
      calls.deposit.push(args);
      throw Error('Not implemented');
    },
    rebalance(...args: RebalanceArgs) {
      calls.rebalance.push(args);
      throw Error('Not implemented');
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
  const publicFacet: Pick<ContractPublicFacet, 'openPortfolioFromEVM'> =
    zone.exo(`${namePrefix}MockPublicFacet`, undefined, {
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
