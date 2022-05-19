// @ts-check
import { assert, details as X, q } from '@agoric/assert';
import {
  getRankCover,
  assertKeyPattern,
  assertPattern,
  matches,
  compareRank,
  M,
  zeroPad,
  makeEncodePassable,
  makeDecodePassable,
  makeCopySet,
  makeCopyMap,
} from '@agoric/store';
import { Far, passStyleOf } from '@endo/marshal';
import { decodeToJustin } from '@endo/marshal/src/marshal-justin.js';
import { parseVatSlot } from '../lib/parseVatSlots.js';

// The maximum length of an LMDB key is 254 characters, which puts an upper
// bound on the post-encoding size of keys than can be used to index entries in
// collections.  In addition to the encoding of the collection entry key, the
// storage key will also be prefixed with additional indexing information that
// includes the collection ID (an integer that will grow over time as more
// collections are created), the vat ID (which includes an integer that will
// grow over time as vats are created), and some fixed overhead (currently 9
// characters).  If we allot 10 characters for each ID and another 14 for
// overhead (which includes room for change and fiddling around), this leaves
// 220 characters for encoding collection keys.  We believe that 10 characters
// per ID will leave plenty of room for growth -- given the kinds of transaction
// throughput that SwingSet can support, we assess that reaching 10**10
// collections in 10**10 vats is not a realistic danger to be overly concerned
// about at present, though it does merit monitoring.  We expect that we will
// have migrated off LMDB many years before the hazard could become a realistic
// worry.
//
// Note that LMDB itself will throw an exception if you try to use a key that is
// too large, but this will happen inside the kernel where recovery (from the
// vat's perspective) is much more difficult.  Fortunately, only collection keys
// can contain arbitrarily sized values originating from user code inside the
// vat.  We check for such oversized keys in the collection access functions and
// throw exceptions back to user code.  All other vatstore accesses by liveslots
// can stay under the key size limit by construction.
//
// We're aware that declaring this limit here is a bit of an abstraction
// boundary violation.  We have striven to code liveslots in a way that is
// agnostic about what persistent storage medium it sits on top of, whereas this
// limit is specific to LMDB.  However, the constraint that the underlying
// storage medium is a string-to-string key-value store is entirely baked into
// the current design, and we think it likely that migration to a different
// storage substrate would also involve moving away from a purely string-indexed
// store.  In such a case, significant engineering rework would be required
// anyway and this minor bit of modularity ugliness would become irrelevant.
// Realistically, attempting to acquire the size limit from the storage API
// would be a lot of engineering work for little to no actual benefit, so we've
// made the pragmatic decision to simply declare the size limit right here.
// Obviously, if we were to move off LMDB to a different purely string-based KV
// store, the size constraint would almost certainly change and this limit with
// it, but for now this seems good enough.
const MAX_DBKEY_LENGTH = 220;

function pattEq(p1, p2) {
  return compareRank(p1, p2) === 0;
}

function throwNotDurable(value, slotIndex, serializedValue) {
  assert.fail(
    X`value is not durable: ${value} at slot ${slotIndex} of ${decodeToJustin(
      {
        body: JSON.parse(serializedValue.body),
        slots: serializedValue.slots,
      },
      true,
    )}`,
  );
}

export function makeCollectionManager(
  syscall,
  vrm,
  allocateExportID,
  allocateCollectionID,
  convertValToSlot,
  convertSlotToVal,
  registerValue,
  serialize,
  unserialize,
) {
  // TODO(#5058): we hold a list of all collections (both virtual and
  // durable) in RAM, so we can delete the virtual ones during
  // stopVat(), and tolerate subsequent GC-triggered duplication
  // deletion without crashing. This needs to move to the DB to avoid
  // the RAM consumption of a large number of collections.
  const allCollectionObjIDs = new Set();
  const storeKindIDToName = new Map();

  const storeKindInfo = {
    scalarMapStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarMapStore,
      durable: false,
    },
    scalarWeakMapStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarWeakMapStore,
      durable: false,
    },
    scalarSetStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarSetStore,
      durable: false,
    },
    scalarWeakSetStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarWeakSetStore,
      durable: false,
    },
    scalarDurableMapStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarMapStore,
      durable: true,
    },
    scalarDurableWeakMapStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarWeakMapStore,
      durable: true,
    },
    scalarDurableSetStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarSetStore,
      durable: true,
    },
    scalarDurableWeakSetStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateScalarWeakSetStore,
      durable: true,
    },
  };

  function prefixc(collectionID, dbEntryKey) {
    return `vc.${collectionID}.${dbEntryKey}`;
  }

  function initializeStoreKindInfo() {
    let storeKindIDs = {};
    const rawTable = syscall.vatstoreGet('storeKindIDTable');
    if (rawTable) {
      storeKindIDs = JSON.parse(rawTable);
    }
    for (const kind of Object.getOwnPropertyNames(storeKindInfo)) {
      let kindID = storeKindIDs[kind];
      if (!kindID) {
        kindID = allocateExportID();
        storeKindIDs[kind] = kindID;
      }
      storeKindInfo[kind].kindID = kindID;
      storeKindIDToName.set(`${kindID}`, kind);
      vrm.registerKind(
        kindID,
        storeKindInfo[kind].reanimator,
        // eslint-disable-next-line no-use-before-define
        deleteCollection,
        storeKindInfo[kind].durable,
      );
    }
    syscall.vatstoreSet('storeKindIDTable', JSON.stringify(storeKindIDs));
  }

  function obtainStoreKindID(kindName) {
    return storeKindInfo[kindName].kindID;
  }

  // Not that it's only used for this purpose, what should it be called?
  // TODO Should we be using the new encodeBigInt scheme instead, anyway?
  const BIGINT_TAG_LEN = 10;

  /**
   * Delete an entry from a collection as part of garbage collecting the entry's key.
   *
   * @param {string} collectionID - the collection from which the entry is to be deleted
   * @param {string} vobjID - the entry key being removed
   *
   * @returns {boolean} true if this removal possibly introduces a further GC opportunity
   */
  function deleteCollectionEntry(collectionID, vobjID) {
    const ordinalKey = prefixc(collectionID, `|${vobjID}`);
    const ordinalString = syscall.vatstoreGet(ordinalKey);
    syscall.vatstoreDelete(ordinalKey);
    const ordinalTag = zeroPad(ordinalString, BIGINT_TAG_LEN);
    const recordKey = prefixc(collectionID, `r${ordinalTag}:${vobjID}`);
    const rawValue = syscall.vatstoreGet(recordKey);
    let doMoreGC = false;
    if (rawValue !== undefined) {
      const value = JSON.parse(rawValue);
      doMoreGC = value.slots.map(vrm.removeReachableVref).some(b => b);
      syscall.vatstoreDelete(recordKey);
    }
    return doMoreGC;
  }
  vrm.setDeleteCollectionEntry(deleteCollectionEntry);

  function summonCollectionInternal(
    _initial,
    label,
    collectionID,
    kindName,
    keySchema = M.any(),
    valueSchema,
  ) {
    assert.typeof(kindName, 'string');
    const kindInfo = storeKindInfo[kindName];
    assert(kindInfo, `unknown collection kind ${kindName}`);
    const { hasWeakKeys, durable } = kindInfo;
    const dbKeyPrefix = `vc.${collectionID}.`;
    let currentGenerationNumber = 0;

    function prefix(dbEntryKey) {
      return `${dbKeyPrefix}${dbEntryKey}`;
    }

    const encodeRemotable = remotable => {
      // eslint-disable-next-line no-use-before-define
      const ordinal = getOrdinal(remotable);
      assert(ordinal !== undefined, X`no ordinal for ${remotable}`);
      const ordinalTag = zeroPad(ordinal, BIGINT_TAG_LEN);
      return `r${ordinalTag}:${convertValToSlot(remotable)}`;
    };

    // `makeEncodePassable` has three named options:
    // `encodeRemotable`, `encodeError`, and `encodePromise`.
    // Those which are omitted default to a function that always throws.
    // So by omitting `encodeError` and `encodePromise`, we know that
    // the resulting function will encode only `Key` arguments.
    const encodeKey = makeEncodePassable({ encodeRemotable });

    const decodeRemotable = encodedKey =>
      convertSlotToVal(encodedKey.substring(BIGINT_TAG_LEN + 2));

    // `makeDecodePassable` has three named options:
    // `decodeRemotable`, `decodeError`, and `decodePromise`.
    // Those which are omitted default to a function that always throws.
    // So by omitting `decodeError` and `decodePromise`, we know that
    // the resulting function will decode only to `Key` results.
    const decodeKey = makeDecodePassable({ decodeRemotable });

    function generateOrdinal(remotable) {
      const nextOrdinal = Number.parseInt(
        syscall.vatstoreGet(prefix('|nextOrdinal')),
        10,
      );
      syscall.vatstoreSet(
        prefix(`|${convertValToSlot(remotable)}`),
        `${nextOrdinal}`,
      );
      syscall.vatstoreSet(prefix('|nextOrdinal'), `${nextOrdinal + 1}`);
    }

    function getOrdinal(remotable) {
      return syscall.vatstoreGet(prefix(`|${convertValToSlot(remotable)}`));
    }

    function deleteOrdinal(remotable) {
      syscall.vatstoreDelete(prefix(`|${convertValToSlot(remotable)}`));
    }

    function keyToDBKey(key) {
      const encodedKey = encodeKey(key);
      assert(encodedKey.length < MAX_DBKEY_LENGTH, 'key too large');
      return prefix(encodedKey);
    }

    function dbKeyToKey(dbKey) {
      const dbEntryKey = dbKey.substring(dbKeyPrefix.length);
      return decodeKey(dbEntryKey);
    }

    function has(key) {
      if (!matches(key, keySchema)) {
        return false;
      }
      if (passStyleOf(key) === 'remotable') {
        return getOrdinal(key) !== undefined;
      } else {
        return syscall.vatstoreGet(keyToDBKey(key)) !== undefined;
      }
    }

    function get(key) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(label)}`,
      );
      const result = syscall.vatstoreGet(keyToDBKey(key));
      if (result) {
        return unserialize(JSON.parse(result));
      }
      assert.fail(X`key ${key} not found in collection ${q(label)}`);
    }

    function updateEntryCount(delta) {
      if (!hasWeakKeys) {
        const entryCount = Number.parseInt(
          syscall.vatstoreGet(prefix('|entryCount')),
          10,
        );
        syscall.vatstoreSet(prefix('|entryCount'), `${entryCount + delta}`);
      }
    }

    function init(key, value) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(label)}`,
      );
      assert(
        !has(key),
        X`key ${key} already registered in collection ${q(label)}`,
      );
      if (valueSchema) {
        assert(
          matches(value, valueSchema),
          X`invalid value type for collection ${q(label)}`,
        );
      }
      currentGenerationNumber += 1;
      const serializedValue = serialize(value);
      if (durable) {
        serializedValue.slots.forEach((vref, slotIndex) => {
          if (!vrm.isDurable(vref)) {
            throwNotDurable(value, slotIndex, serializedValue);
          }
        });
      }
      if (passStyleOf(key) === 'remotable') {
        const vref = convertValToSlot(key);
        if (durable) {
          assert(
            vrm.isDurable(vref),
            X`key (${key}) is not durable in ${value}`,
          );
        }
        generateOrdinal(key);
        if (hasWeakKeys) {
          vrm.addRecognizableValue(key, `${collectionID}`, true);
        } else {
          vrm.addReachableVref(vref);
        }
      }
      serializedValue.slots.forEach(vrm.addReachableVref);
      syscall.vatstoreSet(keyToDBKey(key), JSON.stringify(serializedValue));
      updateEntryCount(1);
    }

    function set(key, value) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(label)}`,
      );
      if (valueSchema) {
        assert(
          matches(value, valueSchema),
          X`invalid value type for collection ${q(label)}`,
        );
      }
      const after = serialize(harden(value));
      if (durable) {
        after.slots.forEach((vref, i) => {
          if (!vrm.isDurable(vref)) {
            throwNotDurable(value, i, after);
          }
        });
      }
      const dbKey = keyToDBKey(key);
      const rawBefore = syscall.vatstoreGet(dbKey);
      assert(rawBefore, X`key ${key} not found in collection ${q(label)}`);
      const before = JSON.parse(rawBefore);
      vrm.updateReferenceCounts(before.slots, after.slots);
      syscall.vatstoreSet(dbKey, JSON.stringify(after));
    }

    function deleteInternal(key) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(label)}`,
      );
      const dbKey = keyToDBKey(key);
      const rawValue = syscall.vatstoreGet(dbKey);
      assert(rawValue, X`key ${key} not found in collection ${q(label)}`);
      const value = JSON.parse(rawValue);
      const doMoreGC1 = value.slots.map(vrm.removeReachableVref).some(b => b);
      syscall.vatstoreDelete(dbKey);
      let doMoreGC2 = false;
      if (passStyleOf(key) === 'remotable') {
        deleteOrdinal(key);
        if (hasWeakKeys) {
          vrm.removeRecognizableValue(key, `${collectionID}`, true);
        } else {
          doMoreGC2 = vrm.removeReachableVref(convertValToSlot(key));
        }
      }
      return doMoreGC1 || doMoreGC2;
    }

    function del(key) {
      deleteInternal(key);
      updateEntryCount(-1);
    }

    function entriesInternal(
      needKeys,
      needValues,
      keyPatt = M.any(),
      valuePatt = M.any(),
    ) {
      assert(needKeys || needValues);
      assertKeyPattern(keyPatt);
      assertPattern(valuePatt);
      const [coverStart, coverEnd] = getRankCover(keyPatt, encodeKey);
      let priorDBKey = '';
      const start = prefix(coverStart);
      const end = prefix(coverEnd);
      const ignoreKeys = !needKeys && pattEq(keyPatt, M.any());
      const ignoreValues = !needValues && pattEq(valuePatt, M.any());
      /**
       * @yields {[any, any]}
       * @returns {Generator<[any, any], void, unknown>}
       */
      function* iter() {
        const generationAtStart = currentGenerationNumber;
        while (priorDBKey !== undefined) {
          assert(
            generationAtStart === currentGenerationNumber,
            X`keys in store cannot be added to during iteration`,
          );
          const [dbKey, dbValue] = syscall.vatstoreGetAfter(
            priorDBKey,
            start,
            end,
          );
          if (!dbKey) {
            break;
          }
          if (dbKey < end) {
            priorDBKey = dbKey;
            if (ignoreKeys) {
              const value = unserialize(JSON.parse(dbValue));
              if (matches(value, valuePatt)) {
                yield [undefined, value];
              }
            } else if (ignoreValues) {
              const key = dbKeyToKey(dbKey);
              if (matches(key, keyPatt)) {
                yield [key, undefined];
              }
            } else {
              const key = dbKeyToKey(dbKey);
              if (matches(key, keyPatt)) {
                const value = unserialize(JSON.parse(dbValue));
                if (matches(value, valuePatt)) {
                  yield [key, value];
                }
              }
            }
          }
        }
      }
      return iter();
    }

    function keys(keyPatt, valuePatt) {
      function* iter() {
        for (const entry of entriesInternal(true, false, keyPatt, valuePatt)) {
          yield entry[0];
        }
      }
      return iter();
    }

    function clearInternal(isDeleting, keyPatt, valuePatt) {
      let doMoreGC = false;
      for (const k of keys(keyPatt, valuePatt)) {
        doMoreGC = doMoreGC || deleteInternal(k);
      }
      if (!hasWeakKeys && !isDeleting) {
        syscall.vatstoreSet(prefix('|entryCount'), '0');
      }
      return doMoreGC;
    }

    function clear(keyPatt, valuePatt) {
      clearInternal(false, keyPatt, valuePatt);
    }

    function values(keyPatt, valuePatt) {
      function* iter() {
        for (const entry of entriesInternal(false, true, keyPatt, valuePatt)) {
          yield entry[1];
        }
      }
      return iter();
    }

    function entries(keyPatt, valuePatt) {
      function* iter() {
        for (const entry of entriesInternal(true, true, keyPatt, valuePatt)) {
          yield entry;
        }
      }
      return iter();
    }

    function countEntries(keyPatt, valuePatt) {
      let count = 0;
      // eslint-disable-next-line no-use-before-define, no-unused-vars
      for (const k of keys(keyPatt, valuePatt)) {
        count += 1;
      }
      return count;
    }

    function getSize(keyPatt, valuePatt) {
      if (
        (keyPatt === undefined || pattEq(keyPatt, M.any())) &&
        (valuePatt === undefined || pattEq(valuePatt, M.any()))
      ) {
        return Number.parseInt(syscall.vatstoreGet(prefix('|entryCount')), 10);
      }
      return countEntries(keyPatt, valuePatt);
    }

    function sizeInternal() {
      return countEntries();
    }

    const snapshotSet = keyPatt => makeCopySet(keys(keyPatt));

    const snapshotMap = (keyPatt, valuePatt) =>
      makeCopyMap(entries(keyPatt, valuePatt));

    return {
      has,
      get,
      getSize,
      init,
      set,
      delete: del,
      keys,
      values,
      entries,
      snapshotSet,
      snapshotMap,
      sizeInternal,
      clear,
      clearInternal,
    };
  }

  function summonCollection(
    initial,
    label,
    collectionID,
    kindName,
    keySchema,
    valueSchema,
  ) {
    const hasWeakKeys = storeKindInfo[kindName].hasWeakKeys;
    const raw = summonCollectionInternal(
      initial,
      label,
      collectionID,
      kindName,
      keySchema,
      valueSchema,
    );

    const { has, get, init, set, delete: del } = raw;
    const weakMethods = {
      has,
      get,
      init,
      set,
      delete: del,
    };

    let collection;
    if (hasWeakKeys) {
      collection = weakMethods;
    } else {
      const {
        keys,
        values,
        entries,
        sizeInternal,
        getSize,
        snapshotSet,
        snapshotMap,
        clear,
      } = raw;
      collection = {
        ...weakMethods,
        keys,
        values,
        entries,
        sizeInternal,
        getSize,
        snapshotSet,
        snapshotMap,
        clear,
      };
    }
    return collection;
  }

  function storeSizeInternal(vobjID) {
    const { id, subid } = parseVatSlot(vobjID);
    const kindName = storeKindIDToName.get(`${id}`);
    assert(kindName, `unknown kind ID ${id}`);
    const collection = summonCollectionInternal(false, 'test', subid, kindName);
    return collection.sizeInternal();
  }

  function deleteCollection(vobjID) {
    if (!allCollectionObjIDs.has(vobjID)) {
      return false; // already deleted
    }
    const { id, subid } = parseVatSlot(vobjID);
    const kindName = storeKindIDToName.get(`${id}`);
    const collection = summonCollectionInternal(false, 'GC', subid, kindName);
    allCollectionObjIDs.delete(vobjID);

    const doMoreGC = collection.clearInternal(true);
    let priorKey = '';
    const keyPrefix = prefixc(subid, '|');
    while (priorKey !== undefined) {
      [priorKey] = syscall.vatstoreGetAfter(priorKey, keyPrefix);
      if (!priorKey) {
        break;
      }
      syscall.vatstoreDelete(priorKey);
    }
    return doMoreGC;
  }

  function deleteAllVirtualCollections() {
    const vobjIDs = Array.from(allCollectionObjIDs).sort();
    for (const vobjID of vobjIDs) {
      const { id } = parseVatSlot(vobjID);
      const kindName = storeKindIDToName.get(`${id}`);
      const { durable } = storeKindInfo[kindName];
      if (!durable) {
        deleteCollection(vobjID);
      }
    }
  }

  function makeCollection(label, kindName, keySchema, valueSchema) {
    assert.typeof(label, 'string');
    assert(storeKindInfo[kindName]);
    assertKeyPattern(keySchema);
    const schemata = [keySchema];
    if (valueSchema) {
      assertPattern(valueSchema);
      schemata.push(valueSchema);
    }
    const collectionID = allocateCollectionID();
    const kindID = obtainStoreKindID(kindName);
    const vobjID = `o+${kindID}/${collectionID}`;

    syscall.vatstoreSet(prefixc(collectionID, '|nextOrdinal'), '1');
    const { hasWeakKeys } = storeKindInfo[kindName];
    if (!hasWeakKeys) {
      syscall.vatstoreSet(prefixc(collectionID, '|entryCount'), '0');
    }
    syscall.vatstoreSet(
      prefixc(collectionID, '|schemata'),
      JSON.stringify(serialize(harden(schemata))),
    );
    syscall.vatstoreSet(prefixc(collectionID, '|label'), label);
    allCollectionObjIDs.add(vobjID);

    return [
      vobjID,
      summonCollection(
        true,
        label,
        collectionID,
        kindName,
        keySchema,
        valueSchema,
      ),
    ];
  }

  function collectionToMapStore(collection) {
    const { snapshotSet: _, snapshotMap, ...rest } = collection;
    return Far('mapStore', { snapshot: snapshotMap, ...rest });
  }

  function collectionToWeakMapStore(collection) {
    return Far('weakMapStore', collection);
  }

  function collectionToSetStore(collection) {
    const {
      has,
      init,
      delete: del,
      keys,
      sizeInternal,
      getSize,
      snapshotSet,
      clear,
    } = collection;
    function* entries(patt) {
      for (const k of keys(patt)) {
        yield [k, k];
      }
    }
    function addAll(elems) {
      for (const elem of elems) {
        init(elem, null);
      }
    }

    const setStore = {
      has,
      add: elem => init(elem, null),
      addAll,
      delete: del,
      keys: patt => keys(patt),
      values: patt => keys(patt),
      entries,
      sizeInternal,
      getSize: patt => getSize(patt),
      snapshot: snapshotSet,
      clear,
    };
    return Far('setStore', setStore);
  }

  function collectionToWeakSetStore(collection) {
    const { has, init, delete: del } = collection;
    function addAll(elems) {
      for (const elem of elems) {
        init(elem, null);
      }
    }

    const weakSetStore = {
      has,
      add: elem => init(elem, null),
      addAll,
      delete: del,
    };
    return Far('weakSetStore', weakSetStore);
  }

  /**
   * Produce a *scalar* big map: keys can only be atomic values, primitives, or
   * remotables.
   *
   * @template K,V
   * @param {string} [label='map'] - diagnostic label for the store
   * @param {StoreOptions=} options
   * @returns {MapStore<K,V>}
   */
  function makeScalarBigMapStore(
    label = 'map',
    { keySchema = M.scalar(), valueSchema = undefined, durable = false } = {},
  ) {
    const kindName = durable ? 'scalarDurableMapStore' : 'scalarMapStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      keySchema,
      valueSchema,
    );
    const store = collectionToMapStore(collection);
    registerValue(vobjID, store, false);
    return store;
  }

  function provideBaggage() {
    let baggageID = syscall.vatstoreGet('baggageID');
    if (baggageID) {
      return convertSlotToVal(baggageID);
    } else {
      const baggage = makeScalarBigMapStore('baggage', {
        keySchema: M.string(),
        durable: true,
      });
      baggageID = convertValToSlot(baggage);
      syscall.vatstoreSet('baggageID', baggageID);
      // artificially increment the baggage's refcount so it never gets GC'd
      vrm.addReachableVref(baggageID);
      return baggage;
    }
  }

  /**
   * Produce a *scalar* weak big map: keys can only be atomic values,
   * primitives, or remotables.
   *
   * @template K,V
   * @param {string} [label='weakMap'] - diagnostic label for the store
   * @param {StoreOptions=} options
   * @returns {WeakMapStore<K,V>}
   */
  function makeScalarBigWeakMapStore(
    label = 'weakMap',
    { keySchema = M.scalar(), valueSchema = undefined, durable = false } = {},
  ) {
    const kindName = durable
      ? 'scalarDurableWeakMapStore'
      : 'scalarWeakMapStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      keySchema,
      valueSchema,
    );
    const store = collectionToWeakMapStore(collection);
    registerValue(vobjID, store, false);
    return store;
  }

  /**
   * Produce a *scalar* big set: keys can only be atomic values, primitives, or
   * remotables.
   *
   * @template K
   * @param {string} [label='set'] - diagnostic label for the store
   * @param {StoreOptions=} options
   * @returns {SetStore<K>}
   */
  function makeScalarBigSetStore(
    label = 'set',
    { keySchema = M.scalar(), valueSchema = undefined, durable = false } = {},
  ) {
    const kindName = durable ? 'scalarDurableSetStore' : 'scalarSetStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      keySchema,
      valueSchema,
    );
    const store = collectionToSetStore(collection);
    registerValue(vobjID, store, false);
    return store;
  }

  /**
   * Produce a *scalar* weak big set: keys can only be atomic values,
   * primitives, or remotables.
   *
   * @template K
   * @param {string} [label='weakSet'] - diagnostic label for the store
   * @param {StoreOptions=} options
   * @returns {WeakSetStore<K>}
   */
  function makeScalarBigWeakSetStore(
    label = 'weakSet',
    { keySchema = M.scalar(), valueSchema = undefined, durable = false } = {},
  ) {
    const kindName = durable
      ? 'scalarDurableWeakSetStore'
      : 'scalarWeakSetStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      keySchema,
      valueSchema,
    );
    const store = collectionToWeakSetStore(collection);
    registerValue(vobjID, store, false);
    return store;
  }

  function reanimateCollection(vobjID) {
    const { id, subid } = parseVatSlot(vobjID);
    const kindName = storeKindIDToName.get(`${id}`);
    const rawSchemata = JSON.parse(
      syscall.vatstoreGet(prefixc(subid, '|schemata')),
    );
    const [keySchema, valueSchema] = unserialize(rawSchemata);
    const label = syscall.vatstoreGet(prefixc(subid, '|label'));
    return summonCollection(
      false,
      label,
      subid,
      kindName,
      keySchema,
      valueSchema,
    );
  }

  function reanimateScalarMapStore(vobjID) {
    return collectionToMapStore(reanimateCollection(vobjID));
  }

  function reanimateScalarWeakMapStore(vobjID) {
    return collectionToWeakMapStore(reanimateCollection(vobjID));
  }

  function reanimateScalarSetStore(vobjID) {
    return collectionToSetStore(reanimateCollection(vobjID));
  }

  function reanimateScalarWeakSetStore(vobjID) {
    return collectionToWeakSetStore(reanimateCollection(vobjID));
  }

  const testHooks = { obtainStoreKindID, storeSizeInternal, makeCollection };

  return harden({
    initializeStoreKindInfo,
    deleteAllVirtualCollections,
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
    provideBaggage,
    testHooks,
  });
}
