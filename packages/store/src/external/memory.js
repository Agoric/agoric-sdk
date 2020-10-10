// Copyright (C) 2019-20 Agoric, under Apache license 2.0

// @ts-check
import { makeWeakStore } from '../weak-store';
import '../types';

/**
 * Create a completely in-memory "external" store.  This store will be
 * garbage-collected in the usual way, but it will not page out any objects to
 * secondary storage.
 *
 * @template {(...args: any[]) => ExternalInstance} M
 * @param {string} keyName
 * @param {M} maker
 * @returns {ExternalStore<M>}
 */
export function makeMemoryExternalStore(keyName, maker) {
  return harden({
    makeInstance: maker,
    makeWeakStore() {
      return makeWeakStore(keyName);
    },
  });
}
harden(makeMemoryExternalStore);
