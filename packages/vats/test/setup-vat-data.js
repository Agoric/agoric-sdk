/* global globalThis */
// This file produces the globalThis.VatData property outside of SwingSet so
// that it can be used by '@agoric/vat-data' (which only *consumes*
// `globalThis.VatData`) in code under test.
import { makeFakeVirtualStuff } from '@agoric/swingset-liveslots/tools/fakeVirtualSupport.js';

export const fakeVomKit = makeFakeVirtualStuff({
  relaxDurabilityRules: false,
});

globalThis.WeakMap = fakeVomKit.vom.VirtualObjectAwareWeakMap;
globalThis.WeakSet = fakeVomKit.vom.VirtualObjectAwareWeakSet;

const { vom, wpm: watchedPromiseManager, cm: collectionManager } = fakeVomKit;
globalThis.VatData = harden({
  defineKind: vom.defineKind,
  defineKindMulti: vom.defineKindMulti,
  defineDurableKind: vom.defineDurableKind,
  defineDurableKindMulti: vom.defineDurableKindMulti,
  makeKindHandle: vom.makeKindHandle,
  canBeDurable: vom.canBeDurable,
  providePromiseWatcher: watchedPromiseManager.providePromiseWatcher,
  watchPromise: watchedPromiseManager.watchPromise,
  makeScalarBigMapStore: collectionManager.makeScalarBigMapStore,
  makeScalarBigWeakMapStore: collectionManager.makeScalarBigWeakMapStore,
  makeScalarBigSetStore: collectionManager.makeScalarBigSetStore,
  makeScalarBigWeakSetStore: collectionManager.makeScalarBigWeakSetStore,
});
