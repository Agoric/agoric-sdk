import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { PendingTxStatus } from '../../src/constants.js';
import { prepareStatusManager } from '../../src/exos/status-manager.js';
import { provideDurableZone } from '../supports.js';
import { MockCctpTxEvidences } from '../fixtures.js';
import type { CctpTxEvidence } from '../../src/types.js';

test('advance creates new entry with ADVANCED status', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advance(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries[0]?.status, PendingTxStatus.Advanced);
});
test.todo('ADVANCED transactions are published to vstorage');

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
  statusManager.advance(evidence);

  t.throws(() => statusManager.advance(evidence), {
    message:
      'Transaction already seen: "seenTx:0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  t.throws(() => statusManager.observe(evidence), {
    message:
      'Transaction already seen: "seenTx:0xc81bc6105b60a234c7c50ac17816ebcd5561d366df8bf3be59ff387552761702"',
  });

  // new txHash should not throw
  t.notThrows(() => statusManager.advance({ ...evidence, txHash: '0xtest2' }));
});

test('settle removes entries from PendingTxs', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  statusManager.advance(evidence);
  statusManager.observe({ ...evidence, txHash: '0xtest1' });

  statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount);
  statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(entries.length, 0, 'Settled entry should be deleted');
});

test('cannot SETTLE without an ADVANCED or OBSERVED entry', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  t.throws(
    () =>
      statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount),
    {
      message:
        'key "pendingTx:[\\"noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd\\",\\"150000000\\"]" not found in collection "PendingTxs"',
    },
  );
});

test('settle SETTLES first matched entry', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();

  // advance two
  statusManager.advance(evidence);
  statusManager.advance({ ...evidence, txHash: '0xtest2' });
  // also settles OBSERVED statuses
  statusManager.observe({ ...evidence, txHash: '0xtest3' });

  // settle will settle the first match
  statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount);
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

  // settle again wih same args settles 2nd advance
  statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount);
  // settle again wih same args settles remaining observe
  statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount);
  const entries1 = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  // TODO, check vstorage for TxStatus.Settled
  t.is(entries1?.length, 0, 'settled entries are deleted');

  t.throws(
    () =>
      statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount),
    {
      message:
        'No unsettled entry for "pendingTx:[\\"noble1x0ydg69dh6fqvr27xjvp6maqmrldam6yfelqkd\\",\\"150000000\\"]"',
    },
    'No more matches to settle',
  );
});

test('lookup throws when presented a key it has not seen', t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  t.throws(() => statusManager.lookupPending('noble123', 1n), {
    message: 'Key "pendingTx:[\\"noble123\\",\\"1\\"]" not yet observed',
  });
});

test('StatusManagerKey logic handles addresses with hyphens', async t => {
  const zone = provideDurableZone('status-test');
  const statusManager = prepareStatusManager(zone.subZone('status-manager'));

  const evidence: CctpTxEvidence = MockCctpTxEvidences.AGORIC_PLUS_OSMO();
  evidence.tx.forwardingAddress = 'noble1-foo';

  statusManager.advance(evidence);

  const entries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );

  t.is(entries.length, 1);
  t.is(entries[0]?.status, PendingTxStatus.Advanced);

  statusManager.settle(evidence.tx.forwardingAddress, evidence.tx.amount);
  const remainingEntries = statusManager.lookupPending(
    evidence.tx.forwardingAddress,
    evidence.tx.amount,
  );
  t.is(remainingEntries.length, 0, 'Entry should be settled');
});
