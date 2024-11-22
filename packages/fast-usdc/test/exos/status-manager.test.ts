import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { provideDurableZone } from '../supports.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import type { CctpTxEvidence } from '../../src/types.js';

test('advancing creates new entry with ADVANCING status', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advancing(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries[0]?.status, PendingTxStatus.Advancing);
});
test.todo('ADVANCING transactions are published to vstorage');

test('observe creates new entry with OBSERVED status', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.observe(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries[0]?.status, PendingTxStatus.Observed);
});
test.todo('OBSERVED transactions are published to vstorage');

test('cannot process same tx twice', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advancing(evidence);

  t.throws(() => statusManager.advancing(evidence), {
    message:
      'Transaction already seen: "seenTx:[\\"0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702\\",1]"',
  });

  t.throws(() => statusManager.observe(evidence), {
    message:
      'Transaction already seen: "seenTx:[\\"0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702\\",1]"',
  });

  // new txHash should not throw
  t.notThrows(() =>
    statusManager.advancing({ ...evidence, txHash: '0xtest2' }),
  );
  // new chainId with existing txHash should not throw
  t.notThrows(() => statusManager.advancing({ ...evidence, chainId: 9999 }));
});

test('isSeen checks if a tx has been processed', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  t.false(statusManager.isSeen(e1));
  statusManager.advancing(e1);
  t.true(statusManager.isSeen(e1));

  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  t.false(statusManager.isSeen(e2));
  statusManager.observe(e2);
  t.true(statusManager.isSeen(e2));
});

test('dequeueStatus removes entries from PendingTxs', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();

  statusManager.advancing(e1);
  statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);
  statusManager.advancing(e2);
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
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const advanceOutcomeFn = () =>
    statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);
  const expectedErrMsg =
    'no advancing tx with {"amount":"[150000000n]","sender":"noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd"}';

  t.throws(advanceOutcomeFn, {
    message: expectedErrMsg,
  });

  statusManager.observe(e1);
  t.throws(advanceOutcomeFn, {
    message: expectedErrMsg,
  });

  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();
  statusManager.advancing(e2);
  t.notThrows(() =>
    statusManager.advanceOutcome(e2.tx.forwardingAddress, e2.tx.amount, true),
  );
});

test('advanceOutcome transitions to ADVANCED and ADVANCE_FAILED', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));
  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  const e2 = MockCctpTxEvidences.AGORIC_PLUS_DYDX();

  statusManager.advancing(e1);
  statusManager.advanceOutcome(e1.tx.forwardingAddress, e1.tx.amount, true);
  t.like(statusManager.lookupPending(e1.tx.forwardingAddress, e1.tx.amount), [
    {
      status: PendingTxStatus.Advanced,
    },
  ]);

  statusManager.advancing(e2);
  statusManager.advanceOutcome(e2.tx.forwardingAddress, e2.tx.amount, false);
  t.like(statusManager.lookupPending(e2.tx.forwardingAddress, e2.tx.amount), [
    {
      status: PendingTxStatus.AdvanceFailed,
    },
  ]);
});
test.todo('ADVANCED transactions are published to vstorage');

test('dequeueStatus returns undefined when nothing is settleable', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const e1 = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  t.is(
    statusManager.dequeueStatus(e1.tx.forwardingAddress, e1.tx.amount),
    undefined,
  );
});

test('dequeueStatus returns first (earliest) matched entry', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // advance two txs
  statusManager.advancing(evidence);
  statusManager.advancing({ ...evidence, txHash: '0xtest2' });

  // cannot dequeue ADVANCING pendingTx
  t.is(
    statusManager.dequeueStatus(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    undefined,
  );

  statusManager.advanceOutcome(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
    true,
  );
  statusManager.advanceOutcome(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
    true,
  );

  // also can dequeue OBSERVED statuses
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
  t.is(entries0.length, 2);
  // TODO, check vstorage for PendingTxStatus.Settled for 1st tx
  t.is(
    entries0?.[0].status,
    PendingTxStatus.Advanced,
    'first settled entry deleted',
  );
  t.is(
    entries0?.[1].status,
    PendingTxStatus.Observed,
    'order of remaining entries preserved',
  );

  // dequeue again wih same args to settle 2nd advance
  t.like(
    statusManager.dequeueStatus(
      evidence.tx.forwardingAddress,
      evidence.tx.amount,
    ),
    {
      status: 'ADVANCED',
    },
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
  // TODO, check vstorage for TxStatus.Settled
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
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  t.deepEqual(statusManager.lookupPending('noble123', 1n), []);
});

// TODO: remove? this doesn't seem to hold it's weight
test('StatusManagerKey logic handles addresses with hyphens', async t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence: CctpTxEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  evidence.tx.forwardingAddress = 'noble1-foo';

  statusManager.advancing(evidence);

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
