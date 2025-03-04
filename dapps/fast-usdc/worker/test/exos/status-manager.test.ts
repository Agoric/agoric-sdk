import { test as anyTest } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import type { TestFn } from 'ava';

import { defaultMarshaller } from '@agoric/internal/src/storage-test-utils.js';
import { eventLoopIteration } from '@agoric/internal/src/testing-utils.js';
import type { EReturn } from '@endo/far';
import { PendingTxStatus } from '../../src/constants.js';
import {
  prepareStatusManager,
  stateShape,
  type StatusManager,
} from '../../src/exos/status-manager.js';
import type { CctpTxEvidence } from '../../src/types.js';
import { MockCctpTxEvidences } from '@agoric/fast-usdc/src/fixtures.js';
import { commonSetup, provideDurableZone } from '../supports.js';

type Common = EReturn<typeof commonSetup>;
type TestContext = {
  statusManager: StatusManager;
  storage: Common['bootstrap']['storage'];
};

const test = anyTest as TestFn<TestContext>;

test('stateShape', t => {
  t.snapshot(stateShape);
});

test.beforeEach(async t => {
  const common = await commonSetup(t);
  const zone = provideDurableZone('status-test');
  const txnsNode = common.commonPrivateArgs.storageNode.makeChildNode('txns');
  const statusManager = prepareStatusManager(
    zone.subZone('status-manager'),
    txnsNode,
    { marshaller: defaultMarshaller },
  );
  t.context = {
    statusManager,
    storage: common.bootstrap.storage,
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
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
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
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
    { status: 'ADVANCE_SKIPPED', risksIdentified: ['RISK1'] },
  ]);
});

test('observe creates new entry with OBSERVED status', t => {
  const { statusManager } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.observe(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries[0]?.status, PendingTxStatus.Observed);
});

test('OBSERVED transactions are published to vstorage', async t => {
  const { statusManager } = t.context;

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.observe(evidence);
  await eventLoopIteration();

  const { storage } = t.context;
  t.deepEqual(storage.getDeserialized(`fun.txns.${evidence.txHash}`), [
    { evidence, status: 'OBSERVED' },
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

  t.throws(() => statusManager.observe(evidence), {
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
  statusManager.observe(e2);
  t.true(statusManager.hasBeenObserved(e2));
});

test('dequeueStatus removes entries from PendingTxs', t => {
  const { statusManager } = t.context;
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();

  statusManager.advance(e1);
  statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);
  statusManager.advance(e2);
  statusManager.advanceOutcome(e2.tx.forwardingAddress, e2.tx.amount, false);
  statusManager.observe({ ...e1, txHash: '0xtest1' });

  t.deepEqual(
    statusManager.dequeueStatus(e1.tx.forwardingAddress, e1.tx.amount),
    {
      txHash: e1.txHash,
      status: PendingTxStatus.Advanced,
    },
  );

  t.deepEqual(
    statusManager.dequeueStatus(e2.tx.forwardingAddress, e2.tx.amount),
    {
      txHash: e2.txHash,
      status: PendingTxStatus.AdvanceFailed,
    },
  );

  t.deepEqual(
    statusManager.dequeueStatus(e1.tx.forwardingAddress, e1.tx.amount),
    {
      txHash: '0xtest1',
      status: PendingTxStatus.Observed,
    },
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
  const expectedErrMsg =
    'no advancing tx with {"amount":"[150000000n]","nfa":"noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd"}';

  t.throws(advanceOutcomeFn, {
    message: expectedErrMsg,
  });

  statusManager.observe(e1);
  t.throws(advanceOutcomeFn, {
    message: expectedErrMsg,
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
  t.deepEqual(storage.getDeserialized(`fun.txns.${e1.txHash}`), [
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
  t.deepEqual(storage.getDeserialized(`fun.txns.${e2.txHash}`), [
    { evidence: e2, status: 'OBSERVED' },
    { status: 'ADVANCING' },
    { status: 'ADVANCE_FAILED' },
  ]);
});

test('dequeueStatus returns undefined when nothing is settleable', t => {
  const { statusManager } = t.context;
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  t.is(
    statusManager.dequeueStatus(e1.tx.forwardingAddress, e1.tx.amount),
    undefined,
  );
});

test('dequeueStatus returns first (earliest) matched entry', async t => {
  const { statusManager } = t.context;
  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // advance two txs
  statusManager.advance(evidence);
  statusManager.advance({ ...evidence, txHash: '0xtest2' });

  t.like(
    statusManager.dequeueStatus(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    {
      status: PendingTxStatus.Advancing,
    },
    'can dequeue Tx at any stage',
  );

  statusManager.advanceOutcome(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
    true,
  );

  // can dequeue OBSERVED statuses
  statusManager.observe({ ...evidence, txHash: '0xtest3' });

  // dequeue will return the first match
  t.like(
    statusManager.dequeueStatus(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    {
      status: PendingTxStatus.Advanced,
    },
  );
  const entries0 = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(entries0.length, 1);
  t.deepEqual(
    entries0?.[0].status,
    PendingTxStatus.Observed,
    'order of remaining entries preserved',
  );

  // dequeue again wih same ags to settle remaining observe
  t.like(
    statusManager.dequeueStatus(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    {
      status: 'OBSERVED',
    },
  );
  const entries1 = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(entries1?.length, 0, 'settled entries are deleted');

  t.is(
    statusManager.dequeueStatus(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    undefined,
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

  statusManager.dequeueStatus(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  const remainingEntries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(remainingEntries.length, 0, 'Entry should be dequeued from pending');
});

test.todo('ADVANCE_FAILED -> FORWARDED transition');
