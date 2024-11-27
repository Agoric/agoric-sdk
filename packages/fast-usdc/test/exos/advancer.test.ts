import type { TestFn } from 'ava';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import { denomHash } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { Far } from '@endo/pass-style';
import type { NatAmount } from '@agoric/ertp';
import { type ZoeTools } from '@agoric/orchestration/src/utils/zoe-tools.js';
import { q } from '@endo/errors';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareAdvancer } from '../../src/exos/advancer.js';
import type { SettlerKit } from '../../src/exos/settler.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { makeFeeTools } from '../../src/utils/fees.js';
import { addressTools } from '../../src/utils/address.js';
import { commonSetup } from '../supports.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import {
  makeTestFeeConfig,
  makeTestLogger,
  prepareMockOrchAccounts,
} from '../mocks.js';

const LOCAL_DENOM = `ibc/${denomHash({
  denom: 'uusdc',
  channelId:
    fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId,
})}`;

type CommonSetup = Awaited<ReturnType<typeof commonSetup>>;

const createTestExtensions = (t, common: CommonSetup) => {
  const {
    bootstrap: { rootZone, vowTools },
    facadeServices: { chainHub },
    brands: { usdc },
    commonPrivateArgs: { storageNode },
  } = common;

  const { log, inspectLogs } = makeTestLogger(t.log);

  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);

  const statusManager = prepareStatusManager(
    rootZone.subZone('status-manager'),
    async () => storageNode.makeChildNode('status'),
  );

  const mockAccounts = prepareMockOrchAccounts(rootZone.subZone('accounts'), {
    vowTools,
    log: t.log,
    usdc,
  });

  const mockZCF = Far('MockZCF', {
    makeEmptySeatKit: () => ({ zcfSeat: Far('MockZCFSeat', {}) }),
  });

  const localTransferVK = vowTools.makeVowKit<void>();
  const resolveLocalTransferV = () => {
    // pretend funds move from tmpSeat to poolAccount
    localTransferVK.resolver.resolve();
  };
  const mockZoeTools = Far('MockZoeTools', {
    localTransfer(...args: Parameters<ZoeTools['localTransfer']>) {
      console.log('ZoeTools.localTransfer called with', args);
      return localTransferVK.vow;
    },
  });

  const feeConfig = makeTestFeeConfig(usdc);
  const makeAdvancer = prepareAdvancer(rootZone.subZone('advancer'), {
    chainHub,
    feeConfig,
    localTransfer: mockZoeTools.localTransfer,
    log,
    statusManager,
    usdc: harden({
      brand: usdc.brand,
      denom: LOCAL_DENOM,
    }),
    vowTools,
    // @ts-expect-error mocked zcf
    zcf: mockZCF,
  });

  type NotifyArgs = Parameters<SettlerKit['notify']['notifyAdvancingResult']>;
  const notifyAdvancingResultCalls: NotifyArgs[] = [];
  const mockNotifyF = Far('Settler Notify Facet', {
    notifyAdvancingResult: (...args: NotifyArgs) => {
      console.log('Settler.notifyAdvancingResult called with', args);
      notifyAdvancingResultCalls.push(args);
    },
  });

  const mockBorrowerF = Far('LiquidityPool Borrow Facet', {
    borrow: (seat: ZCFSeat, amounts: { USDC: NatAmount }) => {
      console.log('LP.borrow called with', amounts);
    },
  });

  const mockBorrowerErrorF = Far('LiquidityPool Borrow Facet', {
    borrow: (seat: ZCFSeat, amounts: { USDC: NatAmount }) => {
      console.log('LP.borrow called with', amounts);
      throw new Error(
        `Cannot borrow. Requested ${q(amounts.USDC)} must be less than pool balance ${q(usdc.make(1n))}.`,
      );
    },
  });

  const advancer = makeAdvancer({
    borrowerFacet: mockBorrowerF,
    notifyFacet: mockNotifyF,
    poolAccount: mockAccounts.mockPoolAccount.account,
  });

  return {
    constants: {
      localDenom: LOCAL_DENOM,
      feeConfig,
    },
    helpers: {
      inspectLogs,
      inspectNotifyCalls: () => harden(notifyAdvancingResultCalls),
    },
    mocks: {
      ...mockAccounts,
      mockBorrowerErrorF,
      mockNotifyF,
      resolveLocalTransferV,
    },
    services: {
      advancer,
      makeAdvancer,
      statusManager,
      feeTools: makeFeeTools(feeConfig),
    },
  } as const;
};

type TestContext = CommonSetup & {
  extensions: ReturnType<typeof createTestExtensions>;
};

const test = anyTest as TestFn<TestContext>;

test.beforeEach(async t => {
  const common = await commonSetup(t);
  t.context = {
    ...common,
    extensions: createTestExtensions(t, common),
  };
});

test('updates status to ADVANCING in happy path', async t => {
  const {
    extensions: {
      services: { advancer, feeTools, statusManager },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV },
    },
    brands: { usdc },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  void advancer.handleTransactionEvent(mockEvidence);

  // pretend borrow succeeded and funds were depositing to the LCA
  resolveLocalTransferV();
  // pretend the IBC Transfer settled
  mockPoolAccount.transferVResolver.resolve();
  // wait for handleTransactionEvent to do work
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Advancing }],
    'ADVANCED status in happy path',
  );

  t.deepEqual(inspectLogs(0), [
    'Advance transfer fulfilled',
    '{"advanceAmount":{"brand":"[Alleged: USDC brand]","value":"[146999999n]"},"destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
  ]);

  // We expect to see an `Advanced` update, but that is now Settler's job.
  // but we can ensure it's called
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: mockEvidence.txHash,
        forwardingAddress: mockEvidence.tx.forwardingAddress,
        fullAmount: usdc.make(mockEvidence.tx.amount),
        destination: {
          value: addressTools.getQueryParams(mockEvidence.aux.recipientAddress)
            .EUD,
        },
      },
      true, // indicates transfer succeeded
    ],
  ]);
});

test('updates status to OBSERVED on insufficient pool funds', async t => {
  const {
    extensions: {
      services: { makeAdvancer, statusManager },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount, mockBorrowerErrorF, mockNotifyF },
    },
  } = t.context;

  // make a new advancer that intentionally throws
  const advancer = makeAdvancer({
    borrowerFacet: mockBorrowerErrorF,
    notifyFacet: mockNotifyF,
    poolAccount: mockPoolAccount.account,
  });

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  void advancer.handleTransactionEvent(mockEvidence);
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Observed }],
    'OBSERVED status on insufficient pool funds',
  );

  t.deepEqual(inspectLogs(0), [
    'Advancer error:',
    '"[Error: Cannot borrow. Requested {\\"brand\\":\\"[Alleged: USDC brand]\\",\\"value\\":\\"[294999999n]\\"} must be less than pool balance {\\"brand\\":\\"[Alleged: USDC brand]\\",\\"value\\":\\"[1n]\\"}.]"',
  ]);
});

test('updates status to OBSERVED if makeChainAddress fails', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_UNKNOWN_EUD();
  await advancer.handleTransactionEvent(mockEvidence);

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Observed }],
    'OBSERVED status on makeChainAddress failure',
  );

  t.deepEqual(inspectLogs(0), [
    'Advancer error:',
    '"[Error: Chain info not found for bech32Prefix \\"random\\"]"',
  ]);
});

test('calls notifyAdvancingResult (AdvancedFailed) on failed transfer', async t => {
  const {
    extensions: {
      services: { advancer, feeTools, statusManager },
      helpers: { inspectLogs, inspectNotifyCalls },
      mocks: { mockPoolAccount, resolveLocalTransferV },
    },
    brands: { usdc },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  void advancer.handleTransactionEvent(mockEvidence);

  // pretend borrow and deposit to LCA succeed
  resolveLocalTransferV();
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Advancing }],
    'tx is Advancing',
  );

  mockPoolAccount.transferVResolver.reject(new Error('simulated error'));
  await eventLoopIteration();

  t.deepEqual(inspectLogs(0), [
    'Advance transfer rejected',
    '"[Error: simulated error]"',
  ]);

  // We expect to see an `AdvancedFailed` update, but that is now Settler's job.
  // but we can ensure it's called
  t.like(inspectNotifyCalls(), [
    [
      {
        txHash: mockEvidence.txHash,
        forwardingAddress: mockEvidence.tx.forwardingAddress,
        fullAmount: usdc.make(mockEvidence.tx.amount),
        advanceAmount: feeTools.calculateAdvance(
          usdc.make(mockEvidence.tx.amount),
        ),
        destination: {
          value: addressTools.getQueryParams(mockEvidence.aux.recipientAddress)
            .EUD,
        },
      },
      false, // this indicates transfer failed
    ],
  ]);
});

test('updates status to OBSERVED if pre-condition checks fail', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_NO_PARAMS();

  await advancer.handleTransactionEvent(mockEvidence);

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Observed }],
    'tx is recorded as OBSERVED',
  );

  t.deepEqual(inspectLogs(0), [
    'Advancer error:',
    '"[Error: Unable to parse query params: \\"agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek\\"]"',
  ]);
});

test('will not advance same txHash:chainId evidence twice', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount, resolveLocalTransferV },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // First attempt
  void advancer.handleTransactionEvent(mockEvidence);
  resolveLocalTransferV();
  mockPoolAccount.transferVResolver.resolve();
  await eventLoopIteration();

  t.deepEqual(inspectLogs(0), [
    'Advance transfer fulfilled',
    '{"advanceAmount":{"brand":"[Alleged: USDC brand]","value":"[146999999n]"},"destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
  ]);

  // Second attempt
  void advancer.handleTransactionEvent(mockEvidence);
  await eventLoopIteration();
  t.deepEqual(inspectLogs(1), [
    'txHash already seen:',
    '0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702',
  ]);
});

test.todo(
  '#10510 zoeTools.localTransfer fails to deposit borrowed USDC to LOA',
);
