// @ts-check
/* global globalThis */

// This file produces the globalThis.VatData property outside of a
// running SwingSet so that it can be used by '@agoric/vat-data'
// (which only *consumes* `globalThis.VatData`) in code under test. It
// also populates the passStyleOf symbol-named property.

import { passStyleOf } from '@endo/pass-style';
import { PassStyleOfEndowmentSymbol } from '@endo/pass-style/endow.js';
import { makeFakeVirtualStuff } from './fakeVirtualSupport.js';
import { initSerializedFakeStorageFromMap } from './fakeStorage.js';

/**
 * @import { FakeStorage, LiveFakeStorage, SerializedFakeStorage } from './fakeStorage.js';
 */

const { WeakMap, WeakSet } = globalThis;

/** @typedef {ReturnType<typeof makeFakeVirtualStuff>} FakeVomKit */

/** @type {FakeVomKit} */
let fakeVomKit;

/** @type {FakeStorage<any> | undefined} */
let currentFakeStorage;

let currentRelaxDurabilityRules = true;

globalThis.VatData = harden({
  // @ts-expect-error spread argument for non-rest parameter
  defineKind: (...args) => fakeVomKit.vom.defineKind(...args),
  // @ts-expect-error spread argument for non-rest parameter
  defineKindMulti: (...args) => fakeVomKit.vom.defineKindMulti(...args),
  // @ts-expect-error spread argument for non-rest parameter
  defineDurableKind: (...args) => fakeVomKit.vom.defineDurableKind(...args),
  defineDurableKindMulti: (...args) =>
    // @ts-expect-error spread argument for non-rest parameter
    fakeVomKit.vom.defineDurableKindMulti(...args),
  makeKindHandle: tag => fakeVomKit.vom.makeKindHandle(tag),
  canBeDurable: (...args) => fakeVomKit.vom.canBeDurable(...args),
  providePromiseWatcher: (...args) =>
    // @ts-expect-error spread argument for non-rest parameter
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

globalThis[PassStyleOfEndowmentSymbol] = passStyleOf;

/**
 * @typedef {import("@agoric/internal").Simplify<
 *   Omit<NonNullable<Parameters<typeof makeFakeVirtualStuff>[0]>,
 *     'WeakMap' | 'WeakSet' | 'fakeStore'>
 * >} FakeVirtualStuffOptions
 */

/**
 * @template [S=any]
 * @typedef {FakeVirtualStuffOptions & {
 *   fakeVomKit?: undefined;
 *   fakeStore?: undefined;
 *   fakeStorage: SerializedFakeStorage<S>;
 * }} FlushedIncarnation
 */

/**
 * @template [S=any]
 * @typedef {FakeVirtualStuffOptions & {
 *   fakeVomKit: FakeVomKit;
 *   fakeStore?: undefined;
 *   fakeStorage: LiveFakeStorage<S>;
 * }} LiveIncarnation
 */

/**
 * @template [S=any]
 * @typedef {(FakeVirtualStuffOptions & {
 *   fakeVomKit?: FakeVomKit;
 *   fakeStore?: Iterable<[string, string]>;
 *   fakeStorage?: undefined;
 * }) | LiveIncarnation | FlushedIncarnation} ReincarnateOptions
 */

/**
 * @param {FakeVomKit} [fvk]
 */
const flushVomKit = (fvk = fakeVomKit) => {
  if (fvk) {
    fvk.vom.flushStateCache();
    fvk.cm.flushSchemaCache();
    fvk.vrm.flushIDCounters();
  }
};

/**
 * @param {Pick<ReincarnateOptions, 'fakeVomKit' | 'fakeStorage'>} options
 * @returns {SerializedFakeStorage | undefined}
 */
const flushStorage = (options = {}) => {
  const { fakeVomKit: fvk, fakeStorage } = options;

  // Flush the global VOM
  flushVomKit();

  // Flush the provided VOM if different
  if (fvk && fvk !== fakeVomKit) {
    flushVomKit(fvk);
  }

  const globalFakeStorage = currentFakeStorage;

  /** @type {SerializedFakeStorage<any> | undefined}  */
  let resultFakeStorage;

  if (globalFakeStorage) {
    if (globalFakeStorage.kvStore) {
      // Commit the storage linked to the global VOM
      resultFakeStorage = globalFakeStorage.commit();
      currentFakeStorage = resultFakeStorage;
    } else {
      resultFakeStorage = globalFakeStorage;
    }
  }

  if (fakeStorage && fakeStorage !== globalFakeStorage) {
    if (fakeStorage.kvStore) {
      // Commit the provided storage if different. Should be a serialized storage
      // already but support anyway
      resultFakeStorage = fakeStorage.commit();
    } else {
      resultFakeStorage = fakeStorage;
    }
  }

  return resultFakeStorage;
};

/**
 * Flushes any live incarnation and resets the environment.
 *
 * Serialize the current fakeStorage for use by a future incarnation.
 *
 * @param {ReincarnateOptions} options
 * @returns {FlushedIncarnation}
 */
export const flushIncarnation = options => {
  const {
    fakeVomKit: fvk,
    fakeStorage: serializedFakeStorage,
    fakeStore,
    ...virtualStuffOptions
  } = options;

  if (serializedFakeStorage && fakeStore) {
    throw Error(`'fakeStore' and 'fakeStorage' options are mutually exclusive`);
  }
  const flushedFakeStorage = flushStorage({
    fakeVomKit: fvk,
    fakeStorage: serializedFakeStorage,
  });

  const fakeStorage =
    flushedFakeStorage || initSerializedFakeStorageFromMap(fakeStore);

  // @ts-expect-error fakeVomKit non nullable
  fakeVomKit = undefined;
  currentFakeStorage = fakeStorage;

  globalThis.WeakMap = WeakMap;
  globalThis.WeakSet = WeakSet;

  return harden({
    ...virtualStuffOptions,
    fakeStorage,
  });
};

/**
 * Flushes any live incarnation and setup a new live environment from the given
 * incarnation or the previously saved fakeStorage if none is provided.
 *
 * @param {ReincarnateOptions} options
 * @returns {LiveIncarnation}
 */
export const reincarnate = (options = {}) => {
  const { fakeStorage: serializedFakeStorage, ...virtualStuffOptions } =
    flushIncarnation(options);

  // Initialize storage from previously serialized data
  const fakeStorage = serializedFakeStorage.init(
    serializedFakeStorage.serialized,
  );

  // Carry previous relaxDurabilityRules if not specified
  const relaxDurabilityRules =
    virtualStuffOptions.relaxDurabilityRules ?? currentRelaxDurabilityRules;

  fakeVomKit = makeFakeVirtualStuff({
    ...virtualStuffOptions,
    relaxDurabilityRules,
    fakeStore: fakeStorage.kvStore,
    WeakMap,
    WeakSet,
  });
  currentFakeStorage = fakeStorage;
  currentRelaxDurabilityRules = relaxDurabilityRules;

  // @ts-expect-error toStringTag set imperatively so it doesn't show up in the type
  globalThis.WeakMap = fakeVomKit.vom.VirtualObjectAwareWeakMap;
  // @ts-expect-error ditto
  globalThis.WeakSet = fakeVomKit.vom.VirtualObjectAwareWeakSet;

  return { ...virtualStuffOptions, fakeVomKit, fakeStorage };
};

/**
 * Setup a new live environment from empty storage. The type of the storage is
 * derived either from provided fake storage or from the current storage if any.
 *
 * @param {Omit<ReincarnateOptions, 'fakeVomKit' | 'fakeStore'>} [options]
 * @returns {LiveIncarnation}
 */
export const annihilate = (options = {}) => {
  const {
    // @ts-expect-error fakeStore doesn't exist on type, but drop if it does at runtime
    fakeStore: _fs,
    // @ts-expect-error fakeVomKit doesn't exist on type, but drop if it does at runtime
    fakeVomKit: _fvk,
    fakeStorage = currentFakeStorage,
    ...opts
  } = options;

  const emptyFakeStorage =
    fakeStorage &&
    /** @type {SerializedFakeStorage} */ (
      harden({
        ...fakeStorage,
        serialized: undefined,
        kvStore: undefined,
      })
    );
  return reincarnate({ ...opts, fakeStorage: emptyFakeStorage });
};
