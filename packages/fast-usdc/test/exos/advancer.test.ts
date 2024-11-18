import type { TestFn } from 'ava';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';

import { denomHash } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { Far } from '@endo/pass-style';
import { makePromiseKit } from '@endo/promise-kit';
import type { NatAmount } from '@agoric/ertp';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareAdvancer } from '../../src/exos/advancer.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';

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
    utils: { pourPayment },
  } = common;

  const { log, inspectLogs } = makeTestLogger(t.log);

  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);

  const statusManager = prepareStatusManager(
    rootZone.subZone('status-manager'),
  );

  const mockAccounts = prepareMockOrchAccounts(rootZone.subZone('accounts'), {
    vowTools,
    log: t.log,
    usdc,
  });

  const feeConfig = makeTestFeeConfig(usdc);
  const makeAdvancer = prepareAdvancer(rootZone.subZone('advancer'), {
    chainHub,
    feeConfig,
    log,
    statusManager,
    usdc: harden({
      brand: usdc.brand,
      denom: LOCAL_DENOM,
    }),
    vowTools,
  });

  /** pretend we have 1M USDC in pool deposits */
  let mockPoolBalance = usdc.units(1_000_000);
  /**
   * adjust balance from 1M default to test insufficient funds
   * @param value
   */
  const setMockPoolBalance = (value: bigint) => {
    mockPoolBalance = usdc.make(value);
  };

  const borrowUnderlyingPK = makePromiseKit<Payment<'nat'>>();
  const resolveBorrowUnderlyingP = async (amount: Amount<'nat'>) => {
    const pmt = await pourPayment(amount);
    return borrowUnderlyingPK.resolve(pmt);
  };
  const rejectBorrowUnderlyingP = () =>
    borrowUnderlyingPK.reject('Mock unable to borrow.');

  const advancer = makeAdvancer({
    assetManagerFacet: Far('AssetManager', {
      lookupBalance: () => mockPoolBalance,
      borrow: (amount: NatAmount) => {
        t.log('borrowUnderlying called with', amount);
        return borrowUnderlyingPK.promise;
      },
      repay: () => Promise.resolve(),
    }),
    poolAccount: mockAccounts.mockPoolAccount.account,
  });

  return {
    constants: {
      localDenom: LOCAL_DENOM,
      feeConfig,
    },
    helpers: {
      inspectLogs,
    },
    mocks: {
      ...mockAccounts,
      setMockPoolBalance,
      resolveBorrowUnderlyingP,
      rejectBorrowUnderlyingP,
    },
    services: {
      advancer,
      makeAdvancer,
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
      mocks: { mockPoolAccount, resolveBorrowUnderlyingP },
    },
    brands: { usdc },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  await resolveBorrowUnderlyingP(usdc.make(mockEvidence.tx.amount));
  await eventLoopIteration();
  mockPoolAccount.transferVResolver.resolve();

  await handleTxP;
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Advanced }],
    'ADVANCED status in happy path',
  );

  t.deepEqual(inspectLogs(0), [
    'Advance transfer fulfilled',
    '{"amount":{"brand":"[Alleged: USDC brand]","value":"[150000000n]"},"destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
  ]);
});

test('updates status to OBSERVED on insufficient pool funds', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
      mocks: { setMockPoolBalance },
    },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  setMockPoolBalance(1n);
  await handleTxP;

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
    'Insufficient pool funds',
    'Requested {"brand":"[Alleged: USDC brand]","value":"[195000000n]"} but only have {"brand":"[Alleged: USDC brand]","value":"[1n]"}',
  ]);
});

test('updates status to OBSERVED if balance query fails', async t => {
  const {
    extensions: {
      services: { makeAdvancer, statusManager },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount },
    },
    brands: { usdc },
  } = t.context;

  // make a new advancer that intentionally throws
  const advancer = makeAdvancer({
    // @ts-expect-error mock
    assetManagerFacet: Far('AssetManager', {
      lookupBalance: () => {
        throw new Error('lookupBalance failed');
      },
    }),
    poolAccount: mockPoolAccount.account,
  });

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  await advancer.handleTransactionEvent(mockEvidence);

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  t.deepEqual(
    entries,
    [{ ...mockEvidence, status: PendingTxStatus.Observed }],
    'OBSERVED status on balance query failure',
  );

  t.deepEqual(inspectLogs(0), [
    'Advancer error:',
    '"[Error: lookupBalance failed]"',
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

// TODO, this failure should be handled differently
test('does not update status on failed transfer', async t => {
  const {
    extensions: {
      services: { advancer, statusManager },
      helpers: { inspectLogs },
      mocks: { mockPoolAccount, resolveBorrowUnderlyingP },
    },
    brands: { usdc },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);

  await resolveBorrowUnderlyingP(usdc.make(mockEvidence.tx.amount));
  mockPoolAccount.transferVResolver.reject(new Error('simulated error'));

  await handleTxP;
  await eventLoopIteration();

  const entries = statusManager.lookupPending(
    mockEvidence.tx.forwardingAddress,
    mockEvidence.tx.amount,
  );

  // TODO, this failure should be handled differently
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

// TODO: might be consideration of `EventFeed`
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
      mocks: { mockPoolAccount, resolveBorrowUnderlyingP },
    },
    brands: { usdc },
  } = t.context;

  const mockEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // First attempt
  const handleTxP = advancer.handleTransactionEvent(mockEvidence);
  await resolveBorrowUnderlyingP(usdc.make(mockEvidence.tx.amount));
  mockPoolAccount.transferVResolver.resolve();
  await handleTxP;
  await eventLoopIteration();

  t.deepEqual(inspectLogs(0), [
    'Advance transfer fulfilled',
    '{"amount":{"brand":"[Alleged: USDC brand]","value":"[150000000n]"},"destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
  ]);

  // Second attempt
  await advancer.handleTransactionEvent(mockEvidence);

  t.deepEqual(inspectLogs(1), [
    'Advancer error:',
    '"[Error: Transaction already seen: \\"seenTx:[\\\\\\"0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702\\\\\\",1]\\"]"',
  ]);
});
