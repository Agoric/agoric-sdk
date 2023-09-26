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
  makeKindHandle: (...args) => fakeVomKit.vom.makeKindHandle(...args),
  canBeDurable: (...args) => fakeVomKit.vom.canBeDurable(...args),
  providePromiseWatcher: (...args) =>
    fakeVomKit.wpm.providePromiseWatcher(...args),
  watchPromise: (...args) => fakeVomKit.wpm.watchPromise(...args),
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

  globalThis.WeakMap = fakeVomKit.vom.VirtualObjectAwareWeakMap;
  globalThis.WeakSet = fakeVomKit.vom.VirtualObjectAwareWeakSet;

  return { ...options, fakeStore, fakeVomKit };
};
