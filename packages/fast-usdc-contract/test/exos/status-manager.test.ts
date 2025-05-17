import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { PendingTxStatus, TxStatus } from '@agoric/fast-usdc/src/constants.js';
import type { CctpTxEvidence } from '@agoric/fast-usdc/src/types.js';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/tools/mock-evidence.js';
import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { EReturn } from '@endo/far';
import {
  prepareStatusManager,
  stateShape,
  type StatusManager,
} from '../../src/exos/status-manager.ts';
import type { ForwardFailedTx } from '../../src/typeGuards.ts';
import { makeRouteHealth } from '../../src/utils/route-health.ts';
import { provideDurableZone, setupFastUsdcTest } from '../supports.js';

type Common = EReturn<typeof setupFastUsdcTest>;
type TestContext = {
  statusManager: StatusManager;
  storage: Common['bootstrap']['storage'];
} & Common;

const test = anyTest as TestFn<TestContext>;

test('stateShape', t => {
  t.snapshot(stateShape);
});

test.beforeEach(async t => {
  const common = await setupFastUsdcTest(t);
  const zone = provideDurableZone('status-test');
  const txnsNode = common.commonPrivateArgs.storageNode.makeChildNode('txns');
  const statusManager = prepareStatusManager(
    zone.subZone('status-manager'),
    txnsNode,
    { marshaller: defaultMarshaller, routeHealth: makeRouteHealth(1) },
  );
  t.context = {
    statusManager,
    storage: common.bootstrap.storage,
    ...common,
  };
});

test('advance creates new entry with ADVANCED status', t => {
  const { statusManager } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advance(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries[0]?.status, PendingTxStatus.Advancing);
});

test('ADVANCED transactions are published to vstorage', async t => {
  const { statusManager } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advance(evidence);
  await eventLoopIteration();

  const { storage } = t.context;
  t.deepEqual(storage.getDeserialized(`orchtest.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    { status: 'ADVANCING' },
  ]);
});

test('skipAdvance creates new entry with ADVANCE_SKIPPED status', t => {
  const { statusManager } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.skipAdvance(evidence, ['RISK1']);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries[0]?.status, PendingTxStatus.AdvanceSkipped);
});

test('ADVANCE_SKIPPED transactions are published to vstorage', async t => {
  const { statusManager } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.skipAdvance(evidence, ['RISK1']);
  await eventLoopIteration();

  const { storage } = t.context;
  t.deepEqual(storage.getDeserialized(`orchtest.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    { status: 'ADVANCE_SKIPPED', risksIdentified: ['RISK1'] },
  ]);
});

test('cannot process same tx twice', t => {
  const { statusManager } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advance(evidence);

  t.throws(() => statusManager.advance(evidence), {
    message:
      'Transaction already seen: "0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  // new txHash should not throw
  t.notThrows(() => statusManager.advance({ ...evidence, txHash: '0xtest2' }));
});

test('isSeen checks if a tx has been processed', t => {
  const { statusManager } = t.context;

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  t.false(statusManager.hasBeenObserved(e1));
  statusManager.advance(e1);
  t.true(statusManager.hasBeenObserved(e1));

  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  t.false(statusManager.hasBeenObserved(e2));
  statusManager.skipAdvance(e2, []);
  t.true(statusManager.hasBeenObserved(e2));
});

test('matchAndDequeueSettlement removes entries from PendingTxs', t => {
  const { statusManager } = t.context;
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();

  statusManager.advance(e1);
  statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);
  statusManager.advance(e2);
  statusManager.advanceOutcome(e2.tx.forwardingAddress, e2.tx.amount, false);
  statusManager.skipAdvance({ ...e1, txHash: '0xtest1' }, []);

  t.deepEqual(
    statusManager.matchAndDequeueSettlement(
      e1.tx.forwardingAddress,
      e1.tx.amount,
    ),
    [
      {
        ...e1,
        status: PendingTxStatus.Advanced,
      },
    ],
  );

  t.deepEqual(
    statusManager.matchAndDequeueSettlement(
      e2.tx.forwardingAddress,
      e2.tx.amount,
    ),
    [
      {
        ...e2,
        txHash: e2.txHash,
        status: PendingTxStatus.AdvanceFailed,
      },
    ],
  );

  t.deepEqual(
    statusManager.matchAndDequeueSettlement(
      e1.tx.forwardingAddress,
      e1.tx.amount,
    ),
    [
      {
        ...e1,
        txHash: '0xtest1',
        status: PendingTxStatus.AdvanceSkipped,
      },
    ],
  );

  t.is(
    statusManager.lookupPending(e1.tx.forwardingAddress, e1.tx.amount).length,
    0,
    'Settled entries should be deleted',
  );

  t.is(
    statusManager.lookupPending(e2.tx.forwardingAddress, e2.tx.amount).length,
    0,
    'Settled entry should be deleted',
  );
});

test('cannot advanceOutcome without ADVANCING entry', t => {
  const { statusManager } = t.context;
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const advanceOutcomeFn = () =>
    statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);

  t.throws(advanceOutcomeFn, {
    message:
      'key "noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd" not found in collection "PendingSettleTxs"',
  });

  statusManager.skipAdvance(e1, []);
  t.throws(advanceOutcomeFn, {
    message:
      'no advancing tx with {"amount":"[150000000n]","nfa":"noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd"}',
  });

  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  statusManager.advance(e2);
  t.notThrows(() =>
    statusManager.advanceOutcome(e2.tx.forwardingAddress, e2.tx.amount, true),
  );
});

test('advanceOutcome transitions to ADVANCED and ADVANCE_FAILED', async t => {
  const { storage } = t.context;
  const { statusManager } = t.context;
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();

  statusManager.advance(e1);
  statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);
  t.like(statusManager.lookupPending(e1.tx.forwardingAddress, e1.tx.amount), [
    {
      status: PendingTxStatus.Advanced,
    },
  ]);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`orchtest.txns.${e1.txHash}`), [
    { evidence: e1, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCED' },
  ]);

  statusManager.advance(e2);
  statusManager.advanceOutcome(e2.tx.forwardingAddress, e2.tx.amount, false);
  t.like(statusManager.lookupPending(e2.tx.forwardingAddress, e2.tx.amount), [
    {
      status: PendingTxStatus.AdvanceFailed,
    },
  ]);
  await eventLoopIteration();
  t.deepEqual(storage.getDeserialized(`orchtest.txns.${e2.txHash}`), [
    { evidence: e2, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCE_FAILED' },
  ]);
});

test('matchAndDequeueSettlement returns undefined when nothing is settleable', t => {
  const { statusManager } = t.context;
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  t.deepEqual(
    statusManager.matchAndDequeueSettlement(
      e1.tx.forwardingAddress,
      e1.tx.amount,
    ),
    [],
  );
});

test('matchAndDequeueSettlement returns first (earliest) matched entry', async t => {
  const { statusManager } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // advance two txs
  statusManager.advance(evidence);
  statusManager.advance({ ...evidence, txHash: '0xtest2' });

  t.is(
    statusManager.lookupPending(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ).length,
    2,
  );

  // `matchAndDequeueSettlement` is called when a mint is arrived and we want
  // to settle it
  const dequeued0 = statusManager.matchAndDequeueSettlement(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(dequeued0.length, 1, 'returns a single match');
  t.is(dequeued0[0].txHash, evidence.txHash, 'grabs first match');
  // In the contract, when an ADVANCING transaction is dequeued from
  // `pendingSettleTxs` it's added to `mintedEarly`. `Advancer` calls
  // `settler.notifier.notifyAdvancingResult` which looks in `mintedEarly` for
  // any "minted while advancing" txs and will .disburse() or .forward() based
  // on the outcome.
  // This test is not integrated with the Settler, but it demonstrates
  // that `Advancing` txs can be dequeued with `matchAndDequeueSettlement`.
  t.is(
    dequeued0[0].status,
    PendingTxStatus.Advancing,
    'can dequeue Tx at any stage',
  );

  t.is(
    statusManager.lookupPending(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ).length,
    1,
  );

  statusManager.advanceOutcome(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
    true,
  );

  // second transaction is dequeued
  const dequeued1 = statusManager.matchAndDequeueSettlement(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(dequeued1.length, 1);
  t.is(dequeued1[0].status, PendingTxStatus.Advanced);

  t.is(
    statusManager.lookupPending(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ).length,
    0,
  );
  t.deepEqual(
    statusManager.matchAndDequeueSettlement(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    [],
    'No more matches to settle',
  );
});

test('lookupPending returns empty array when presented a key it has not seen', t => {
  const { statusManager } = t.context;
  t.deepEqual(statusManager.lookupPending('noble123', 1n), []);
});

test('StatusManagerKey logic handles addresses with hyphens', t => {
  const { statusManager } = t.context;
  const evidence: CctpTxEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  evidence.tx.forwardingAddress = 'noble1-foo';

  statusManager.advance(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries.length, 1);
  t.is(entries[0]?.status, PendingTxStatus.Advancing);

  statusManager.advanceOutcome(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
    true,
  );

  statusManager.matchAndDequeueSettlement(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  const remainingEntries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(remainingEntries.length, 0, 'Entry should be dequeued from pending');
});

test('forwardFailed with retry details stores tx for getForwardsToRetry', async t => {
  const { statusManager, storage } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const { txHash } = evidence;
  const destination = 'cosmos:osmosis-1:osmo1testdestinationaddr';

  const failedTx: ForwardFailedTx = {
    txHash,
    destination,
    amount: 100n,
  };

  statusManager.forwardFailed(txHash, failedTx);
  await eventLoopIteration();

  // Check vstorage for FORWARD_FAILED status
  const storedRecords = storage.getDeserialized(`orchtest.txns.${txHash}`);
  t.true(
    storedRecords.some(
      (record: any) => record.status === TxStatus.ForwardFailed,
    ),
    'FORWARD_FAILED status should be published',
  );

  // Check getForwardsToRetry
  const failedForwards = statusManager.getForwardsToRetry('cosmos:osmosis-1');
  t.is(failedForwards.length, 1, 'Should retrieve one failed forward');
  t.deepEqual(
    failedForwards[0],
    { ...failedTx, chainId: 'cosmos:osmosis-1' },
    'Retrieved failed forward should match input',
  );
});

test('forwardFailed without retry details does not store tx for getForwardsToRetry', async t => {
  const { statusManager, storage } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const { txHash } = evidence;

  statusManager.forwardFailed(txHash); // No ForwardFailedTx provided
  await eventLoopIteration();

  // Check vstorage for FORWARD_FAILED status
  const storedRecords = storage.getDeserialized(`orchtest.txns.${txHash}`);
  t.true(
    storedRecords.some(
      (record: any) => record.status === TxStatus.ForwardFailed,
    ),
    'FORWARD_FAILED status should be published',
  );

  // Check getForwardsToRetry - should be empty
  const failedForwards = [
    ...statusManager.getForwardsToRetry('cosmos:osmosis-1'),
  ];
  t.is(
    failedForwards.length,
    0,
    'Should not retrieve failed forward when no details provided',
  );
});

test('forwardFailed with retry details is idempotent for storage', t => {
  const { statusManager } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  const { txHash } = evidence;
  const destination = 'cosmos:dydx-mainnet-1:dydx1testdest';

  const failedTx: ForwardFailedTx = {
    txHash,
    destination,
    amount: 100n,
  };

  statusManager.forwardFailed(txHash, failedTx);
  // Call again with the same details
  statusManager.forwardFailed(txHash, failedTx);

  // Check getForwardsToRetry
  const failedForwards = [
    ...statusManager.getForwardsToRetry('cosmos:dydx-mainnet-1'),
  ];
  t.is(
    failedForwards.length,
    1,
    'Should retrieve only one failed forward despite multiple calls',
  );
  t.deepEqual(
    failedForwards[0],
    { ...failedTx, chainId: 'cosmos:dydx-mainnet-1' },
    'Retrieved failed forward should match input',
  );
});

test('forwardFailed throws if txHash mismatches in ForwardFailedTx', t => {
  const { statusManager } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const { txHash } = evidence;
  const destination = 'cosmos:osmosis-1:osmo1testdestinationaddr';

  const failedTx: ForwardFailedTx = {
    txHash: '0xDifferentHash', // Mismatched hash
    destination,
    amount: 100n,
  };

  t.throws(() => statusManager.forwardFailed(txHash, failedTx), {
    message: 'txHash mismatch in forwardFailed',
  });
});

test.todo('ADVANCE_FAILED -> FORWARDED transition');
