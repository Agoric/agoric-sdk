// @ts-check
/* global globalThis */
// This file produces the globalThis.VatData property outside of a running
// SwingSet so that it can be used by '@agoric/vat-data' (which only *consumes*
// `globalThis.VatData`) in code under test.
import { makeFakeVirtualStuff } from './fakeVirtualSupport.js';

const { WeakMap, WeakSet } = globalThis;

/** @type {ReturnType<makeFakeVirtualStuff>} */
let fakeVomKit;

globalThis.VatData = harden({
  defineKind: (...args) => fakeVomKit.vom.defineKind(...args),
  defineKindMulti: (...args) => fakeVomKit.vom.defineKindMulti(...args),
  defineDurableKind: (...args) => fakeVomKit.vom.defineDurableKind(...args),
  defineDurableKindMulti: (...args) =>
    fakeVomKit.vom.defineDurableKindMulti(...args),
  makeKindHandle: tag => fakeVomKit.vom.makeKindHandle(tag),
  canBeDurable: (...args) => fakeVomKit.vom.canBeDurable(...args),
  providePromiseWatcher: (...args) =>
    fakeVomKit.wpm.providePromiseWatcher(...args),
  watchPromise: (p, watcher, ...args) =>
    fakeVomKit.wpm.watchPromise(p, watcher, ...args),
  makeScalarBigMapStore: (...args) =>
    fakeVomKit.cm.makeScalarBigMapStore(...args),
  makeScalarBigWeakMapStore: (...args) =>
    fakeVomKit.cm.makeScalarBigWeakMapStore(...args),
  makeScalarBigSetStore: (...args) =>
    fakeVomKit.cm.makeScalarBigSetStore(...args),
  makeScalarBigWeakSetStore: (...args) =>
    fakeVomKit.cm.makeScalarBigWeakSetStore(...args),
});

export const reincarnate = (options = {}) => {
  const { fakeStore = new Map(), fakeVomKit: fvk } = options;

  if (options.fakeVomKit) {
    fvk.vom.flushStateCache();
    fvk.cm.flushSchemaCache();
    fvk.vrm.flushIDCounters();
  }

  fakeVomKit = makeFakeVirtualStuff({
    ...options,
    fakeStore,
    WeakMap,
    WeakSet,
  });

  // @ts-expect-error toStringTag set imperatively so it doesn't show up in the type
  globalThis.WeakMap = fakeVomKit.vom.VirtualObjectAwareWeakMap;
  // @ts-expect-error ditto
  globalThis.WeakSet = fakeVomKit.vom.VirtualObjectAwareWeakSet;

  return { ...options, fakeStore, fakeVomKit };
};
