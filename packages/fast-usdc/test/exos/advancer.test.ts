import type { TestFn } from 'ava';
import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { denomHash, type Denom } from '@agoric/orchestration';
import fetchedChainInfo from '@agoric/orchestration/src/fetched-chain-info.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { Zone } from '@agoric/zone';
import type { VowTools } from '@agoric/vow';
import { prepareAdvancer } from '../../src/exos/advancer.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { prepareTransactionFeed } from '../../src/exos/transaction-feed.js';

import { commonSetup } from '../supports.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import { prepareMockOrchAccounts } from '../mocks.js';
import { TxStatus } from '../../src/constants.js';

const test = anyTest as TestFn<{
  localDenom: Denom;
  makeAdvancer: ReturnType<typeof prepareAdvancer>;
  rootZone: Zone;
  statusManager: ReturnType<typeof prepareStatusManager>;
  vowTools: VowTools;
}>;

test.before(async t => {
  const common = await commonSetup(t);
  const {
    bootstrap: { rootZone, vowTools },
    facadeServices: { chainHub },
  } = common;

  chainHub.registerChain('dydx', fetchedChainInfo.dydx);
  chainHub.registerChain('osmosis', fetchedChainInfo.osmosis);

  const statusManager = prepareStatusManager(
    rootZone.subZone('status-manager'),
  );
  const feed = prepareTransactionFeed(rootZone.subZone('feed'));
  const makeAdvancer = prepareAdvancer(rootZone.subZone('advancer'), {
    chainHub,
    feed,
    statusManager,
    vowTools,
  });
  const localDenom = `ibc/${denomHash({
    denom: 'uusdc',
    channelId:
      fetchedChainInfo.agoric.connections['noble-1'].transferChannel.channelId,
  })}`;

  t.context = { localDenom, makeAdvancer, rootZone, statusManager, vowTools };
});

test('advancer updated status to ADVANCED on success', async t => {
  const { localDenom, makeAdvancer, statusManager, rootZone, vowTools } =
    t.context;

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
  advancer.handleEvent(mockCttpTxEvidence);
  t.log('Simulate advance `.transfer()` vow fulfillment');
  poolAccountTransferVResolver.resolve();
  await eventLoopIteration(); // wait for StatusManager to receive update
  const entries = statusManager.view(
    mockCttpTxEvidence.tx.forwardingAddress,
    mockCttpTxEvidence.tx.amount,
  );
  t.deepEqual(
    entries,
    [{ ...mockCttpTxEvidence, status: TxStatus.ADVANCED }],
    'tx status updated to ADVANCED',
  );
});

test('advancer does not update status on failed transfer', async t => {
  const { localDenom, makeAdvancer, statusManager, rootZone, vowTools } =
    t.context;

  const { poolAccount, poolAccountTransferVResolver } = prepareMockOrchAccounts(
    rootZone.subZone('poolAcct2'),
    { vowTools, log: t.log },
  );

  const advancer = makeAdvancer({ poolAccount, localDenom });
  t.truthy(advancer, 'advancer instantiates');

  // simulate input from EventFeed
  const mockCttpTxEvidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  advancer.handleEvent(mockCttpTxEvidence);
  t.log('Simulate advance `.transfer()` vow rejection');
  poolAccountTransferVResolver.reject(new Error('not a real error'));
  await eventLoopIteration(); // wait for StatusManager to receive update
  const entries = statusManager.view(
    mockCttpTxEvidence.tx.forwardingAddress,
    mockCttpTxEvidence.tx.amount,
  );
  t.deepEqual(
    entries,
    [{ ...mockCttpTxEvidence, status: TxStatus.OBSERVED }],
    'tx status is still OBSERVED',
  );
});
