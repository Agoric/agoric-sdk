import type { TestFn } from 'ava';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { denomHash, type Denom } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { Zone } from '@agoric/zone';
import type { VowTools } from '@agoric/vow';
import { prepareAdvancer } from '../../src/exos/advancer.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { prepareTransactionFeedKit } from '../../src/exos/transaction-feed.js';

import { commonSetup } from '../supports.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import {
  makeTestLogger,
  prepareMockOrchAccounts,
  type TestLogger,
} from '../mocks.js';
import { PendingTxStatus } from '../../src/constants.js';

const test = anyTest as TestFn<{
  localDenom: Denom;
  makeAdvancer: ReturnType<typeof prepareAdvancer>;
  rootZone: Zone;
  statusManager: ReturnType<typeof prepareStatusManager>;
  vowTools: VowTools;
  inspectLogs: TestLogger['inspectLogs'];
}>;

test.beforeEach(async t => {
  const common = await commonSetup(t);
  const {
    bootstrap: { rootZone, vowTools },
    facadeServices: { chainHub },
  } = common;

  const { log, inspectLogs } = makeTestLogger(t.log);

  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);

  const statusManager = prepareStatusManager(
    rootZone.subZone('status-manager'),
  );
  const makeAdvancer = prepareAdvancer(rootZone.subZone('advancer'), {
    chainHub,
    statusManager,
    vowTools,
    log,
  });
  const localDenom = `ibc/${denomHash({
    denom: 'uusdc',
    channelId:
      fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId,
  })}`;

  t.context = {
    localDenom,
    makeAdvancer,
    rootZone,
    statusManager,
    vowTools,
    inspectLogs,
  };
});

test('advancer updated status to ADVANCED', async t => {
  const {
    inspectLogs,
    localDenom,
    makeAdvancer,
    statusManager,
    rootZone,
    vowTools,
  } = t.context;

  const { poolAccount, poolAccountTransferVResolver } = prepareMockOrchAccounts(
    rootZone.subZone('poolAcct'),
    { vowTools, log: t.log },
  );

  const advancer = makeAdvancer({
    poolAccount,
    localDenom,
  });
  t.truthy(advancer, 'advancer instantiates');

  // simulate input from EventFeed
  const mockCttpTxEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  advancer.handleTransactionEvent(mockCttpTxEvidence);
  t.log('Simulate advance `.transfer()` vow fulfillment');
  poolAccountTransferVResolver.resolve();
  await eventLoopIteration(); // wait for StatusManager to receive update
  const entries = statusManager.lookupPending(
    mockCttpTxEvidence.tx.forwardingAddress,
    mockCttpTxEvidence.tx.amount,
  );
  t.deepEqual(
    entries,
    [{ ...mockCttpTxEvidence, status: PendingTxStatus.Advanced }],
    'tx status updated to ADVANCED',
  );

  t.deepEqual(
    inspectLogs(0),
    [
      'Advance transfer fulfilled',
      '{"amount":"[150000000n]","destination":{"chainId":"osmosis-1","encoding":"bech32","value":"osmo183dejcnmkka5dzcu9xw6mywq0p2m5peks28men"},"result":"[undefined]"}',
    ],
    'contract logs advance',
  );
});

test('advancer does not update status on failed transfer', async t => {
  const {
    inspectLogs,
    localDenom,
    makeAdvancer,
    statusManager,
    rootZone,
    vowTools,
  } = t.context;

  const { poolAccount, poolAccountTransferVResolver } = prepareMockOrchAccounts(
    rootZone.subZone('poolAcct2'),
    { vowTools, log: t.log },
  );

  const advancer = makeAdvancer({ poolAccount, localDenom });
  t.truthy(advancer, 'advancer instantiates');

  // simulate input from EventFeed
  const mockCttpTxEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  advancer.handleTransactionEvent(mockCttpTxEvidence);
  t.log('Simulate advance `.transfer()` vow rejection');
  poolAccountTransferVResolver.reject(new Error('simulated error'));
  await eventLoopIteration(); // wait for StatusManager to receive update
  const entries = statusManager.lookupPending(
    mockCttpTxEvidence.tx.forwardingAddress,
    mockCttpTxEvidence.tx.amount,
  );
  t.deepEqual(
    entries,
    [{ ...mockCttpTxEvidence, status: PendingTxStatus.Advanced }],
    'tx status is still Advanced even though advance failed',
  );
  t.deepEqual(inspectLogs(0), [
    'Advance transfer rejected',
    '"[Error: simulated error]"',
  ]);
});

test('advancer updated status to OBSERVED if pre-condition checks fail', async t => {
  const { localDenom, makeAdvancer, statusManager, rootZone, vowTools } =
    t.context;

  const { poolAccount } = prepareMockOrchAccounts(
    rootZone.subZone('poolAcct2'),
    { vowTools, log: t.log },
  );

  const advancer = makeAdvancer({ poolAccount, localDenom });
  t.truthy(advancer, 'advancer instantiates');

  // simulate input from EventFeed
  const mockCttpTxEvidence = MockCctpTxEvidences.AGORIC_NO_PARAMS();
  t.throws(() => advancer.handleTransactionEvent(mockCttpTxEvidence), {
    message:
      'recipientAddress does not contain EUD param: "agoric16kv2g7snfc4q24vg3pjdlnnqgngtjpwtetd2h689nz09lcklvh5s8u37ek"',
  });

  const entries = statusManager.lookupPending(
    mockCttpTxEvidence.tx.forwardingAddress,
    mockCttpTxEvidence.tx.amount,
  );
  t.deepEqual(
    entries,
    [{ ...mockCttpTxEvidence, status: PendingTxStatus.Observed }],
    'tx status is still OBSERVED',
  );
});
