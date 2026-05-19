/**
 * Unit tests for `getResolvedTx`, `setResolvedTx`, `deleteResolvedTx`.
 */
import test from 'ava';

import { makeKVStoreFromMap } from '@agoric/internal/src/kv-store.js';

import {
  deleteResolvedTx,
  getResolvedTx,
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
