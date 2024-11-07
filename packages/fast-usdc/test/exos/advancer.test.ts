import type { TestFn } from 'ava';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

import { denomHash, type DenomAmount } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareAdvancer } from '../../src/exos/advancer.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { prepareTransactionFeed } from '../../src/exos/transaction-feed.js';

import { commonSetup } from '../supports.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import { makeTestLogger, prepareMockOrchAccounts } from '../mocks.js';

const LOCAL_DENOM = `ibc/${denomHash({
  denom: 'uusdc',
  channelId:
    fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId,
})}`;

const MOCK_POOL_BALANCE: DenomAmount = harden({
  denom: LOCAL_DENOM,
  // XXX amountUtils at some point
  value: 1_000_000n * 10n ** 6n, // 1M USDC
});

type CommonSetup = Awaited<ReturnType<typeof commonSetup>>;

const createTestExtensions = (t, common: CommonSetup) => {
  const {
    bootstrap: { rootZone, vowTools },
    facadeServices: { chainHub },
    brands: { usdc },
  } = common;

  const { log, inspectLogs } = makeTestLogger(t.log);

  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);

  const statusManager = prepareStatusManager(
    rootZone.subZone('status-manager'),
  );
  const feed = prepareTransactionFeed(rootZone.subZone('feed'));
  const mockAccounts = prepareMockOrchAccounts(rootZone.subZone('accounts'), {
    vowTools,
    log: t.log,
  });

  const makeAdvancer = prepareAdvancer(rootZone.subZone('advancer'), {
    chainHub,
    feed,
    statusManager,
    vowTools,
    log,
  });

  const advancer = makeAdvancer({
    poolAccount: mockAccounts.pool.account,
    localDenom: LOCAL_DENOM,
    usdcBrand: usdc.brand,
  });

  return {
    accounts: mockAccounts,
    constants: {
      localDenom: LOCAL_DENOM,
    },
    helpers: {
      inspectLogs,
    },
    services: {
      advancer,
      feed,
      statusManager,
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

test('updates status to ADVANCED in happy path', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
      accounts: { pool },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  pool.getBalanceVResolver.resolve(MOCK_POOL_BALANCE);
  pool.transferVResolver.resolve();

  await handleTxP;
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Advanced }],
    'tx status updated to ADVANCED',
  );

  t.deepEqual(inspectLogs(0), [
    'Advance transfer fulfilled',
    '{"amount":"[150000000n]","destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
  ]);
});

test('updates status to OBSERVED on insufficient pool funds', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
      accounts: { pool },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  pool.getBalanceVResolver.resolve({ ...MOCK_POOL_BALANCE, value: 1n });
  await handleTxP;

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
    'Insufficient pool funds',
    'Requested {"denom":"ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9","value":"[200000000n]"} but only have {"denom":"ibc/FE98AAD68F02F03565E9FA39A5E627946699B2B07115889ED812D8BA639576A9","value":"[1n]"}',
  ]);
});

test('updates status to OBSERVED if balance query fails', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
      accounts: { pool },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  pool.getBalanceVResolver.reject(new Error('Unexpected balanceQuery error'));
  await handleTxP;

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
    '"[Error: Unexpected balanceQuery error]"',
  ]);
});

test('updates status to OBSERVED if getChainInfoByAddress fails', async t => {
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
    'tx is recorded as OBSERVED',
  );

  t.deepEqual(inspectLogs(0), [
    'Advancer error:',
    '"[Error: Chain info not found for bech32Prefix \\"random\\"]"',
  ]);
});

test('does not update status on failed transfer', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
      accounts: { pool },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  pool.getBalanceVResolver.resolve(MOCK_POOL_BALANCE);
  pool.transferVResolver.reject(new Error('simulated error'));

  await handleTxP;
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Advanced }],
    'tx status is still ADVANCED even though advance failed',
  );

  t.deepEqual(inspectLogs(0), [
    'Advance transfer rejected',
    '"[Error: simulated error]"',
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
    '"[Error: recipientAddress does not contain EUD param: \\"agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek\\"]"',
  ]);
});

test('will not advance same txHash:chainId evidence twice', async t => {
  const {
    extensions: {
      services: { advancer },
      helpers: { inspectLogs },
      accounts: { pool },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // First attempt
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);
  pool.getBalanceVResolver.resolve(MOCK_POOL_BALANCE);
  pool.transferVResolver.resolve();
  await handleTxP;
  await eventLoopIteration();

  t.deepEqual(inspectLogs(0), [
    'Advance transfer fulfilled',
    '{"amount":"[150000000n]","destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
  ]);

  // Second attempt
  await advancer.handleTransactionEvent(mockEvidence);

  t.deepEqual(inspectLogs(1), [
    'Advancer error:',
    '"[Error: Transaction already seen: \\"seenTx:[\\\\\\"0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702\\\\\\",1]\\"]"',
  ]);
});
