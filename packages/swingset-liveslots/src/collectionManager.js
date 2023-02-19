import { assert, details as X, q, Fail } from '@agoric/assert';
import {
  zeroPad,
  makeEncodePassable,
  makeDecodePassable,
  isEncodedRemotable,
} from '@endo/marshal/src/encodePassable.js';
import { compareRank } from '@endo/marshal/src/rankOrder.js';
import {
  getRankCover,
  assertPattern,
  matches,
  mustMatch,
  M,
  makeCopySet,
  makeCopyMap,
} from '@agoric/store';
import { Far, passStyleOf } from '@endo/marshal';
import { makeBaseRef, parseVatSlot } from './parseVatSlots.js';
import {
  enumerateKeysStartEnd,
  enumerateKeysWithPrefix,
} from './vatstore-iterators.js';

// XXX TODO: The following key length limit was put in place due to limitations
// in LMDB.  With the move away from LMDB, it is no longer relevant, but I'm
// leaving it in place for the time being as a general defensive measure against
// various kind of resource exhaustion mischief.  Although the switch to a
// database without the limitation that motivated this would enable this max
// length value to be made larger, current code is already engineered with this
// max in mind, so leaving it in place for the time being it should not pose any
// new challenges.  Later, when we have time to examine this more deeply, we
// should consider relaxing or removing this cap.
const MAX_DBKEY_LENGTH = 220;

function pattEq(p1, p2) {
  return compareRank(p1, p2) === 0;
}

function matchAny(patt) {
  return patt === undefined || pattEq(patt, M.any());
}

function throwNotDurable(value, slotIndex, serializedValue) {
  assert.fail(
    // prettier-ignore
    X`value is not durable: ${value} at slot ${q(slotIndex)} of ${serializedValue.body}`,
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
  assertAcceptableSyscallCapdataSize,
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
      reanimator: reanimateMapStore,
      durable: false,
    },
    scalarWeakMapStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateWeakMapStore,
      durable: false,
    },
    scalarSetStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateSetStore,
      durable: false,
    },
    scalarWeakSetStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateWeakSetStore,
      durable: false,
    },
    scalarDurableMapStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateMapStore,
      durable: true,
    },
    scalarDurableWeakMapStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateWeakMapStore,
      durable: true,
    },
    scalarDurableSetStore: {
      hasWeakKeys: false,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateSetStore,
      durable: true,
    },
    scalarDurableWeakSetStore: {
      hasWeakKeys: true,
      kindID: 0,
      // eslint-disable-next-line no-use-before-define
      reanimator: reanimateWeakSetStore,
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

  // Now that it's only used for this purpose, what should it be called?
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
    keyShape = M.any(),
    valueShape,
  ) {
    assert.typeof(kindName, 'string');
    const kindInfo = storeKindInfo[kindName];
    assert(kindInfo, `unknown collection kind ${kindName}`);
    const { hasWeakKeys, durable } = kindInfo;
    const dbKeyPrefix = `vc.${collectionID}.`;
    let currentGenerationNumber = 0;

    const invalidKeyTypeMsg = `invalid key type for collection ${q(label)}`;
    const invalidValueTypeMsg = `invalid value type for collection ${q(label)}`;

    const serializeValue = value => {
      if (valueShape !== undefined) {
        mustMatch(value, valueShape, invalidValueTypeMsg);
      }
      return serialize(value);
    };

    const unserializeValue = data => {
      const value = unserialize(data);
      if (valueShape !== undefined) {
        mustMatch(value, valueShape, invalidValueTypeMsg);
      }
      return value;
    };

    function prefix(dbEntryKey) {
      return `${dbKeyPrefix}${dbEntryKey}`;
    }

    const encodeRemotable = remotable => {
      // eslint-disable-next-line no-use-before-define
      const ordinal = getOrdinal(remotable);
      ordinal !== undefined || Fail`no ordinal for ${remotable}`;
      const ordinalTag = zeroPad(ordinal, BIGINT_TAG_LEN);
      return `r${ordinalTag}:${convertValToSlot(remotable)}`;
    };

    // `makeEncodePassable` has three named options:
    // `encodeRemotable`, `encodeError`, and `encodePromise`.
    // Those which are omitted default to a function that always throws.
    // So by omitting `encodeError` and `encodePromise`, we know that
    // the resulting function will encode only `Key` arguments.
    const encodeKey = makeEncodePassable({ encodeRemotable });

    const vrefFromDBKey = dbKey => dbKey.substring(BIGINT_TAG_LEN + 2);

    const decodeRemotable = encodedKey =>
      convertSlotToVal(vrefFromDBKey(encodedKey));

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
      if (!matches(key, keyShape)) {
        return false;
      }
      if (passStyleOf(key) === 'remotable') {
        return getOrdinal(key) !== undefined;
      } else {
        return syscall.vatstoreGet(keyToDBKey(key)) !== undefined;
      }
    }

    function get(key) {
      mustMatch(key, keyShape, invalidKeyTypeMsg);
      const result = syscall.vatstoreGet(keyToDBKey(key));
      if (result) {
        return unserializeValue(JSON.parse(result));
      }
      throw Fail`key ${key} not found in collection ${q(label)}`;
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
      mustMatch(key, keyShape, invalidKeyTypeMsg);
      !has(key) ||
        Fail`key ${key} already registered in collection ${q(label)}`;
      const serializedValue = serializeValue(value);
      currentGenerationNumber += 1;
      assertAcceptableSyscallCapdataSize([serializedValue]);
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
          vrm.isDurable(vref) || Fail`key (${key}) is not durable in ${value}`;
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
      mustMatch(key, keyShape, invalidKeyTypeMsg);
      const after = serializeValue(harden(value));
      assertAcceptableSyscallCapdataSize([after]);
      if (durable) {
        after.slots.forEach((vref, i) => {
          if (!vrm.isDurable(vref)) {
            throwNotDurable(value, i, after);
          }
        });
      }
      const dbKey = keyToDBKey(key);
      const rawBefore = syscall.vatstoreGet(dbKey);
      rawBefore || Fail`key ${key} not found in collection ${q(label)}`;
      const before = JSON.parse(rawBefore);
      vrm.updateReferenceCounts(before.slots, after.slots);
      syscall.vatstoreSet(dbKey, JSON.stringify(after));
    }

    function deleteInternal(key) {
      mustMatch(key, keyShape, invalidKeyTypeMsg);
      const dbKey = keyToDBKey(key);
      const rawValue = syscall.vatstoreGet(dbKey);
      rawValue || Fail`key ${key} not found in collection ${q(label)}`;
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
      yieldKeys,
      yieldValues,
      keyPatt = M.any(),
      valuePatt = M.any(),
    ) {
      assert(yieldKeys || yieldValues, 'useless entries()');
      assertPattern(keyPatt);
      assertPattern(valuePatt);

      const [coverStart, coverEnd] = getRankCover(keyPatt, encodeKey);
      const start = prefix(coverStart); // inclusive
      const end = prefix(coverEnd); // exclusive

      const generationAtStart = currentGenerationNumber;
      function checkGen() {
        if (generationAtStart !== currentGenerationNumber) {
          Fail`keys in store cannot be added to during iteration`;
        }
      }

      const needToMatchKey = !matchAny(keyPatt);
      const needToMatchValue = !matchAny(valuePatt);

      // we always get the dbKey, but we might not need to unserialize it
      const needKeys = yieldKeys || needToMatchKey;
      // we don't always need the dbValue
      const needValues = yieldValues || needToMatchValue;

      /**
       * @yields {[any, any]}
       * @returns {Generator<[any, any], void, unknown>}
       */
      function* iter() {
        // the inner iterator yields all keys for which (start <= key < end)
        const iterKeys = enumerateKeysStartEnd(syscall, start, end, checkGen);

        // and the outer iterator filters by keyPatt/valuePatt and
        // yields the right [key,value] tuples
        for (const dbKey of iterKeys) {
          const key = needKeys ? dbKeyToKey(dbKey) : undefined;
          // safe because needToMatchKey implies needKeys
          if (needToMatchKey && !matches(key, keyPatt)) {
            continue;
          }
          const value = needValues
            ? unserializeValue(JSON.parse(syscall.vatstoreGet(dbKey)))
            : undefined;
          if (needToMatchValue && !matches(value, valuePatt)) {
            continue;
          }
          yield [yieldKeys ? key : undefined, yieldValues ? value : undefined];
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

    /**
     * Clear the entire contents of a collection non-selectively.  Since we are
     * being unconditional, we don't need to inspect any of the keys to decide
     * what to do and therefore can avoid deserializing the keys. In particular,
     * this avoids swapping in any virtual objects that were used as keys, which
     * can needlessly thrash the virtual object cache when an entire collection
     * is being deleted.
     *
     * @returns {boolean} true if this operation introduces a potential
     *   opportunity to do further GC.
     */
    function clearInternalFull() {
      let doMoreGC = false;
      const [coverStart, coverEnd] = getRankCover(M.any(), encodeKey);
      const start = prefix(coverStart);
      const end = prefix(coverEnd);

      // this yields all keys for which (start <= key < end)
      for (const dbKey of enumerateKeysStartEnd(syscall, start, end)) {
        const value = JSON.parse(syscall.vatstoreGet(dbKey));
        doMoreGC =
          value.slots.map(vrm.removeReachableVref).some(b => b) || doMoreGC;
        syscall.vatstoreDelete(dbKey);
        if (isEncodedRemotable(dbKey)) {
          const keyVref = vrefFromDBKey(dbKey);
          if (hasWeakKeys) {
            vrm.removeRecognizableVref(keyVref, `${collectionID}`, true);
          } else {
            doMoreGC = vrm.removeReachableVref(keyVref) || doMoreGC;
          }
          syscall.vatstoreDelete(prefix(`|${keyVref}`));
        }
      }
      return doMoreGC;
    }

    function clearInternal(isDeleting, keyPatt, valuePatt) {
      let doMoreGC = false;
      if (isDeleting || (matchAny(keyPatt) && matchAny(valuePatt))) {
        doMoreGC = clearInternalFull();
      } else {
        for (const k of keys(keyPatt, valuePatt)) {
          doMoreGC = deleteInternal(k) || doMoreGC;
        }
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
      if (matchAny(keyPatt) && matchAny(valuePatt)) {
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
    keyShape,
    valueShape,
  ) {
    const hasWeakKeys = storeKindInfo[kindName].hasWeakKeys;
    const raw = summonCollectionInternal(
      initial,
      label,
      collectionID,
      kindName,
      keyShape,
      valueShape,
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
    for (const dbKey of enumerateKeysWithPrefix(syscall, prefixc(subid, '|'))) {
      syscall.vatstoreDelete(dbKey);
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

  function makeCollection(label, kindName, isDurable, keyShape, valueShape) {
    assert.typeof(label, 'string');
    assert(storeKindInfo[kindName]);
    assertPattern(keyShape);
    const schemata = [keyShape];
    if (valueShape) {
      assertPattern(valueShape);
      schemata.push(valueShape);
    }
    const collectionID = allocateCollectionID();
    const kindID = obtainStoreKindID(kindName);
    const vobjID = makeBaseRef(kindID, collectionID, isDurable);

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
        keyShape,
        valueShape,
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
   * Produce a big map.
   *
   * @template K,V
   * @param {string} [label='map'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {MapStore<K,V>}
   */
  function makeBigMapStore(label = 'map', options = {}) {
    const {
      keyShape = M.any(),
      valueShape = undefined,
      durable = false,
    } = options;
    const kindName = durable ? 'scalarDurableMapStore' : 'scalarMapStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      durable,
      keyShape,
      valueShape,
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
      const baggage = makeBigMapStore('baggage', {
        keyShape: M.string(),
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
   * Produce a weak big map.
   *
   * @template K,V
   * @param {string} [label='weakMap'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {WeakMapStore<K,V>}
   */
  function makeBigWeakMapStore(label = 'weakMap', options = {}) {
    const {
      keyShape = M.any(),
      valueShape = undefined,
      durable = false,
    } = options;
    const kindName = durable
      ? 'scalarDurableWeakMapStore'
      : 'scalarWeakMapStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      durable,
      keyShape,
      valueShape,
    );
    const store = collectionToWeakMapStore(collection);
    registerValue(vobjID, store, false);
    return store;
  }

  /**
   * Produce a big set.
   *
   * @template K
   * @param {string} [label='set'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {SetStore<K>}
   */
  function makeBigSetStore(label = 'set', options = {}) {
    const {
      keyShape = M.scalar(),
      valueShape = undefined,
      durable = false,
    } = options;
    const kindName = durable ? 'scalarDurableSetStore' : 'scalarSetStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      durable,
      keyShape,
      valueShape,
    );
    const store = collectionToSetStore(collection);
    registerValue(vobjID, store, false);
    return store;
  }

  /**
   * Produce a weak big set.
   *
   * @template K
   * @param {string} [label='weakSet'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {WeakSetStore<K>}
   */
  function makeBigWeakSetStore(label = 'weakSet', options = {}) {
    const {
      keyShape = M.scalar(),
      valueShape = undefined,
      durable = false,
    } = options;
    const kindName = durable
      ? 'scalarDurableWeakSetStore'
      : 'scalarWeakSetStore';
    const [vobjID, collection] = makeCollection(
      label,
      kindName,
      durable,
      keyShape,
      valueShape,
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
    const [keyShape, valueShape] = unserialize(rawSchemata);
    const label = syscall.vatstoreGet(prefixc(subid, '|label'));
    return summonCollection(
      false,
      label,
      subid,
      kindName,
      keyShape,
      valueShape,
    );
  }

  function reanimateMapStore(vobjID) {
    return collectionToMapStore(reanimateCollection(vobjID));
  }

  function reanimateWeakMapStore(vobjID) {
    return collectionToWeakMapStore(reanimateCollection(vobjID));
  }

  function reanimateSetStore(vobjID) {
    return collectionToSetStore(reanimateCollection(vobjID));
  }

  function reanimateWeakSetStore(vobjID) {
    return collectionToWeakSetStore(reanimateCollection(vobjID));
  }

  const testHooks = { obtainStoreKindID, storeSizeInternal, makeCollection };

  /**
   * @param {Pattern} conjunct
   * @param {StoreOptions} options
   * @returns {StoreOptions}
   */
  const narrowKeyShapeOption = (conjunct, options) => {
    const { keyShape: baseKeyShape } = options;
    // To prepare for pattern-based compression
    // https://github.com/Agoric/agoric-sdk/pull/6432
    // put the substantive pattern, if any, last in the `M.and` since
    // an `M.and` pattern compresses only according to its last conjunct.
    const keyShape =
      baseKeyShape === undefined ? conjunct : M.and(conjunct, baseKeyShape);
    return harden({ ...options, keyShape });
  };

  /**
   * Produce a *scalar* big map: keys can only be atomic values, primitives, or
   * remotables.
   *
   * @template K,V
   * @param {string} [label='map'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {MapStore<K,V>}
   */
  const makeScalarBigMapStore = (label = 'map', options = {}) =>
    makeBigMapStore(label, narrowKeyShapeOption(M.scalar(), options));

  /**
   * Produce a *scalar* weak big map: keys can only be atomic values,
   * primitives, or remotables.
   *
   * @template K,V
   * @param {string} [label='weakMap'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {WeakMapStore<K,V>}
   */
  const makeScalarBigWeakMapStore = (label = 'weakMap', options = {}) =>
    makeBigWeakMapStore(label, narrowKeyShapeOption(M.scalar(), options));

  /**
   * Produce a *scalar* big set: keys can only be atomic values, primitives, or
   * remotables.
   *
   * @template K
   * @param {string} [label='set'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {SetStore<K>}
   */
  const makeScalarBigSetStore = (label = 'set', options = {}) =>
    makeBigSetStore(label, narrowKeyShapeOption(M.scalar(), options));

  /**
   * Produce a *scalar* weak big set: keys can only be atomic values,
   * primitives, or remotables.
   *
   * @template K
   * @param {string} [label='weakSet'] - diagnostic label for the store
   * @param {StoreOptions} [options]
   * @returns {WeakSetStore<K>}
   */
  const makeScalarBigWeakSetStore = (label = 'weakSet', options = {}) =>
    makeBigWeakSetStore(label, narrowKeyShapeOption(M.scalar(), options));

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
