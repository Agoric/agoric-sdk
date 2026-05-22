/**
 * Unit tests for `getResolvedTx`, `setResolvedTx`, `deleteResolvedTx`,
 * `getIgnoredTx`, `setIgnoredTx`, `deleteIgnoredTx`.
 */
import test from 'ava';

import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';
import { TxType } from '@agoric/portfolio-api/src/resolver.js';

import {
  deleteDerivedOutcome,
  deleteIgnoredTx,
  deleteResolvedTx,
  getDerivedOutcome,
  getIgnoredTx,
  getResolvedTx,
  setDerivedOutcome,
  setIgnoredTx,
  setResolvedTx,
} from '../src/kv-store.ts';

test('getResolvedTx returns undefined for an unknown txId', t => {
  const store = makeKVStoreFromMap(new Map());
  t.is(getResolvedTx(store, 'tx1'), undefined);
});

test('setResolvedTx then getResolvedTx roundtrips the status', t => {
  const store = makeKVStoreFromMap(new Map());
  setResolvedTx(store, 'tx1', 'success');
  t.is(getResolvedTx(store, 'tx1'), 'success');
});

test('setResolvedTx overwrites a prior entry', t => {
  const store = makeKVStoreFromMap(new Map());
  setResolvedTx(store, 'tx1', 'success');
  setResolvedTx(store, 'tx1', 'failed');
  t.is(getResolvedTx(store, 'tx1'), 'failed');
});

test('deleteResolvedTx removes the entry', t => {
  const store = makeKVStoreFromMap(new Map());
  setResolvedTx(store, 'tx1', 'success');
  deleteResolvedTx(store, 'tx1');
  t.is(getResolvedTx(store, 'tx1'), undefined);
});

test('entries are keyed independently per txId', t => {
  const store = makeKVStoreFromMap(new Map());
  setResolvedTx(store, 'tx1', 'success');
  setResolvedTx(store, 'tx2', 'failed');
  t.is(getResolvedTx(store, 'tx1'), 'success');
  t.is(getResolvedTx(store, 'tx2'), 'failed');

  deleteResolvedTx(store, 'tx1');
  t.is(getResolvedTx(store, 'tx1'), undefined);
  t.is(getResolvedTx(store, 'tx2'), 'failed');
});

test('getIgnoredTx returns undefined for an unknown txId', t => {
  const store = makeKVStoreFromMap(new Map());
  t.is(getIgnoredTx(store, 'tx1'), undefined);
});

test('setIgnoredTx then getIgnoredTx roundtrips the type', t => {
  const store = makeKVStoreFromMap(new Map());
  setIgnoredTx(store, 'tx1', TxType.IBC_FROM_AGORIC);
  t.is(getIgnoredTx(store, 'tx1'), TxType.IBC_FROM_AGORIC);
});

test('deleteIgnoredTx removes the entry', t => {
  const store = makeKVStoreFromMap(new Map());
  setIgnoredTx(store, 'tx1', TxType.IBC_FROM_AGORIC);
  deleteIgnoredTx(store, 'tx1');
  t.is(getIgnoredTx(store, 'tx1'), undefined);
});

test('resolved and ignored caches are keyed independently', t => {
  const store = makeKVStoreFromMap(new Map());
  setResolvedTx(store, 'tx1', 'success');
  setIgnoredTx(store, 'tx1', TxType.IBC_FROM_AGORIC);
  // Both helpers see their own value for the same txId.
  t.is(getResolvedTx(store, 'tx1'), 'success');
  t.is(getIgnoredTx(store, 'tx1'), TxType.IBC_FROM_AGORIC);
});

test('getDerivedOutcome returns undefined for an unknown txId', t => {
  const store = makeKVStoreFromMap(new Map());
  t.is(getDerivedOutcome(store, 'tx1'), undefined);
});

test('setDerivedOutcome then getDerivedOutcome roundtrips the record', t => {
  const store = makeKVStoreFromMap(new Map());
  setDerivedOutcome(store, 'tx1', { status: 'success', txHash: '0xabc' });
  t.deepEqual(getDerivedOutcome(store, 'tx1'), {
    status: 'success',
    txHash: '0xabc',
  });
});

test('setDerivedOutcome roundtrips a record without a txHash', t => {
  const store = makeKVStoreFromMap(new Map());
  setDerivedOutcome(store, 'tx1', { status: 'failed' });
  t.deepEqual(getDerivedOutcome(store, 'tx1'), { status: 'failed' });
});

test('deleteDerivedOutcome removes the entry', t => {
  const store = makeKVStoreFromMap(new Map());
  setDerivedOutcome(store, 'tx1', { status: 'success' });
  deleteDerivedOutcome(store, 'tx1');
  t.is(getDerivedOutcome(store, 'tx1'), undefined);
});

test('derivedOutcome is keyed independently from resolved/ignored', t => {
  const store = makeKVStoreFromMap(new Map());
  setResolvedTx(store, 'tx1', 'success');
  setIgnoredTx(store, 'tx1', TxType.IBC_FROM_AGORIC);
  setDerivedOutcome(store, 'tx1', { status: 'failed', txHash: '0xdef' });
  t.is(getResolvedTx(store, 'tx1'), 'success');
  t.is(getIgnoredTx(store, 'tx1'), TxType.IBC_FROM_AGORIC);
  t.deepEqual(getDerivedOutcome(store, 'tx1'), {
    status: 'failed',
    txHash: '0xdef',
  });
});

test('getDerivedOutcome throws on a malformed value', t => {
  const store = makeKVStoreFromMap(new Map());
  store.set('tx1.derivedOutcome', '{not json');
  t.throws(() => getDerivedOutcome(store, 'tx1'), {
    message: /Invalid derivedOutcome for tx1/,
  });
});
