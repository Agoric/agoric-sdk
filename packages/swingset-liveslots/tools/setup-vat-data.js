/* global globalThis */

// This file produces the globalThis.VatData property outside of a
// running SwingSet so that it can be used by '@agoric/vat-data'
// (which only *consumes* `globalThis.VatData`) in code under test. It
// also populates the passStyleOf symbol-named property.

import { passStyleOf } from '@endo/pass-style';
import { PassStyleOfEndowmentSymbol } from '@endo/pass-style/endow.js';

import { makeFakeVirtualStuff } from './fakeVirtualSupport.js';

/**
 * @import {Simplify} from '@agoric/internal';
 * @import {VatData} from '../src/vatDataTypes.js';
 */

const { WeakMap, WeakSet } = globalThis;

/** @typedef {ReturnType<typeof makeFakeVirtualStuff>} FakeVomKit */

/** @type {FakeVomKit} */
let fakeVomKit;

globalThis.VatData = /** @type {VatData} */ (
  harden({
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
  })
);

globalThis[PassStyleOfEndowmentSymbol] = passStyleOf;

/**
 * @typedef {Simplify<
 *   Omit<NonNullable<Parameters<typeof makeFakeVirtualStuff>[0]>, 'WeakMap' | 'WeakSet'> &
 *   { fakeVomKit: FakeVomKit; fakeStore: Map<string, string> }
 * >} ReincarnateOptions
 */

/**
 *
 * @param {Partial<ReincarnateOptions>} options
 * @returns {Omit<ReincarnateOptions, 'fakeVomKit'>}
 */
export const flushIncarnation = (options = {}) => {
  const { fakeVomKit: fvk = fakeVomKit, ...fakeStuffOptions } = options;

  if (fvk) {
    fvk.vom.flushStateCache();
    fvk.cm.flushSchemaCache();
    fvk.vrm.flushIDCounters();
  }

  // Clone previous fakeStore (if any) to avoid mutations from previous incarnation
  const fakeStore = new Map(options.fakeStore);

  return { ...fakeStuffOptions, fakeStore };
};

/**
 *
 * @param {Partial<ReincarnateOptions>} options
 * @returns {ReincarnateOptions}
 */
export const reincarnate = (options = {}) => {
  const clonedIncarnation = flushIncarnation(options);

  fakeVomKit = makeFakeVirtualStuff({
    ...clonedIncarnation,
    WeakMap,
    WeakSet,
  });

  // @ts-expect-error toStringTag set imperatively so it doesn't show up in the type
  globalThis.WeakMap = fakeVomKit.vom.VirtualObjectAwareWeakMap;
  // @ts-expect-error ditto
  globalThis.WeakSet = fakeVomKit.vom.VirtualObjectAwareWeakSet;

  return { ...clonedIncarnation, fakeVomKit };
};
