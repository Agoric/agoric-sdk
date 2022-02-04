/* global BigUint64Array */
// @ts-check
import { assert, details as X, q } from '@agoric/assert';
import {
  getRankCover,
  assertKeyPattern,
  assertPattern,
  matches,
  compareRank,
  M,
} from '@agoric/store';
import {
  Far,
  passStyleOf,
  nameForPassableSymbol,
  passableSymbolForName,
} from '@endo/marshal';
import { parseVatSlot } from '../parseVatSlots.js';

function zeroPad(n, size) {
  const nStr = `${n}`;
  assert(nStr.length <= size);
  const str = `00000000000000000000${nStr}`;
  const result = str.substring(str.length - size);
  assert(result.length === size);
  return result;
}

// This is the JavaScript analog to a C union: a way to map between a float as a
// number and the bits that represent the float as a buffer full of bytes.  Note
// that the mutation of static state here makes this invalid Jessie code, but
// doing it this way saves the nugatory and gratuitous allocations that would
// happen every time you do a conversion -- and in practical terms it's safe
// because we put the value in one side and then immediately take it out the
// other; there is no actual state retained in the classic sense and thus no
// re-entrancy issue.
const asNumber = new Float64Array(1);
const asBits = new BigUint64Array(asNumber.buffer);

// JavaScript numbers are encode as keys by outputting the base-16
// representation of the binary value of the underlying IEEE floating point
// representation.  For negative values, all bits of this representation are
// complemented prior to the base-16 conversion, while for positive values, the
// sign bit is complemented.  This ensures both that negative values sort before
// positive values and that negative values sort according to their negative
// magnitude rather than their positive magnitude.  This results in an ASCII
// encoding whose lexicographic sort order is the same as the numeric sort order
// of the corresponding numbers.

function numberToDBEntryKey(n) {
  asNumber[0] = n;
  let bits = asBits[0];
  if (n < 0) {
    // XXX Why is the no-bitwise lint rule even a thing??
    // eslint-disable-next-line no-bitwise
    bits ^= 0xffffffffffffffffn;
  } else {
    // eslint-disable-next-line no-bitwise
    bits ^= 0x8000000000000000n;
  }
  return `f${zeroPad(bits.toString(16), 16)}`;
}

function dbEntryKeyToNumber(k) {
  let bits = BigInt(`0x${k.substring(1)}`);
  if (k[1] < '8') {
    // eslint-disable-next-line no-bitwise
    bits ^= 0xffffffffffffffffn;
  } else {
    // eslint-disable-next-line no-bitwise
    bits ^= 0x8000000000000000n;
  }
  asBits[0] = bits;
  return asNumber[0];
}

// BigInts are encoded as keys as follows:
//   `${prefix}${length}:${encodedNumber}`
// Where:
//
//   ${prefix} is either 'n' or 'p' according to whether the BigInt is negative
//      or positive ('n' is less than 'p', so negative BigInts will sort below
//      positive ones)
//
//   ${encodedNumber} is the value of the BigInt itself, encoded as a decimal
//      number.  Positive BigInts use their normal decimal representation (i.e.,
//      what is returned when you call `toString()` on a BigInt).  Negative
//      BigInts are encoded as the unpadded 10s complement of their value; in
//      this encoding, all negative values that have same number of digits will
//      sort lexically in the inverse order of their numeric value (which is to
//      say, most negative to least negative).
//
//   ${length} is the decimal representation of the width (i.e., the count of
//      digits) of the BigInt.  This length value is then zero padded to a fixed
//      number (currently 10) of digits.  Note that the fixed width length field
//      means that we cannot encode BigInts whose values have more than 10**10
//      digits, but we are willing to live with this limitation since we could
//      never store such large numbers anyway.  The length field is used in lieu
//      of zero padding the BigInts themselves for sorting, which would be
//      impractical for the same reason that storing large values directly would
//      be.  The length is zero padded so that numbers are sorted within groups
//      according to their decimal orders of magnitude in size and then these
//      groups are sorted smallest to largest.
//
// This encoding allows all BigInts to be represented as ASCII strings that sort
// lexicographically in the same order as the values of the BigInts themselves
// would sort numerically.

const BIGINT_TAG_LEN = 10;
const BIGINT_LEN_MODULUS = 10 ** BIGINT_TAG_LEN;

function bigintToDBEntryKey(n) {
  if (n < 0n) {
    const raw = (-n).toString();
    const modulus = 10n ** BigInt(raw.length);
    const numstr = (modulus + n).toString(); // + because n is negative
    const lenTag = zeroPad(BIGINT_LEN_MODULUS - raw.length, BIGINT_TAG_LEN);
    return `n${lenTag}:${zeroPad(numstr, raw.length)}`;
  } else {
    const numstr = n.toString();
    return `p${zeroPad(numstr.length, BIGINT_TAG_LEN)}:${numstr}`;
  }
}

function dbEntryKeyToBigint(k) {
  const numstr = k.substring(BIGINT_TAG_LEN + 2);
  const n = BigInt(numstr);
  if (k[0] === 'n') {
    const modulus = 10n ** BigInt(numstr.length);
    return -(modulus - n);
  } else {
    return n;
  }
}

/**
 * Exported for unit testing
 *
 * @param {(remotable: Object) => string} encodeRemotable
 * @returns {(key: Key) => string}
 */
function makeEncodeKey(encodeRemotable) {
  const encodeKey = key => {
    const passStyle = passStyleOf(key);
    switch (passStyle) {
      case 'null':
        return 'v';
      case 'undefined':
        return 'z';
      case 'number':
        return numberToDBEntryKey(key);
      case 'string':
        return `s${key}`;
      case 'boolean':
        return `b${key}`;
      case 'bigint':
        return bigintToDBEntryKey(key);
      case 'remotable': {
        const result = encodeRemotable(key);
        assert(
          result.startsWith('r'),
          X`internal: Remotable encoding must start with "r": ${result}`,
        );
        return result;
      }
      case 'symbol':
        return `y${nameForPassableSymbol(key)}`;
      default:
        assert.fail(X`a ${q(passStyle)} cannot be used as a collection key`);
    }
  };
  return harden(encodeKey);
}

function makeDecodeKey(decodeRemotable) {
  const decodeKey = encodedKey => {
    switch (encodedKey[0]) {
      case 'v':
        return null;
      case 'z':
        return undefined;
      case 'f':
        return dbEntryKeyToNumber(encodedKey);
      case 's':
        return encodedKey.substring(1);
      case 'b':
        return encodedKey.substring(1) !== 'false';
      case 'n':
      case 'p':
        return dbEntryKeyToBigint(encodedKey);
      case 'r':
        return decodeRemotable(encodedKey);
      case 'y':
        return passableSymbolForName(encodedKey.substring(1));
      default:
        assert.fail(X`invalid database key: ${encodedKey}`);
    }
  };
  return harden(decodeKey);
}

function pattEq(p1, p2) {
  return compareRank(p1, p2) === 0;
}

export function makeCollectionManager(
  syscall,
  vrm,
  allocateExportID,
  convertValToSlot,
  convertSlotToVal,
  registerEntry,
  serialize,
  unserialize,
) {
  const storeKindIDToName = new Map();

  let storeKindInfoNeedsInitialization = true;
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

  function obtainStoreKindID(kindName) {
    if (storeKindInfoNeedsInitialization) {
      storeKindInfoNeedsInitialization = false;

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
    return storeKindInfo[kindName].kindID;
  }

  function summonCollectionInternal(
    initial,
    label,
    collectionID,
    kindName,
    keySchema = M.any(),
    valueSchema,
  ) {
    const { hasWeakKeys, durable } = storeKindInfo[kindName];
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

    const encodeKey = makeEncodeKey(encodeRemotable);

    const decodeRemotable = encodedKey =>
      convertSlotToVal(encodedKey.substring(BIGINT_TAG_LEN + 2));

    const decodeKey = makeDecodeKey(decodeRemotable);

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
      return prefix(encodeKey(key));
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

    function entryDeleter(vobjID) {
      const ordinalKey = prefix(`|${vobjID}`);
      const ordinalString = syscall.vatstoreGet(ordinalKey);
      syscall.vatstoreDelete(ordinalKey);
      const ordinalTag = zeroPad(ordinalString, BIGINT_TAG_LEN);
      syscall.vatstoreDelete(prefix(`r${ordinalTag}:${vobjID}`));
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
        serializedValue.slots.map(vref =>
          assert(vrm.isDurable(vref), X`value is not durable`),
        );
      }
      if (passStyleOf(key) === 'remotable') {
        const vref = convertValToSlot(key);
        if (durable) {
          assert(vrm.isDurable(vref), X`key is not durable`);
        }
        generateOrdinal(key);
        if (hasWeakKeys) {
          vrm.addRecognizableValue(key, entryDeleter);
        } else {
          vrm.addReachableVref(vref);
        }
      }
      serializedValue.slots.map(vrm.addReachableVref);
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
        after.slots.map(vref =>
          assert(vrm.isDurable(vref), X`value is not durable`),
        );
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
      value.slots.map(vrm.removeReachableVref);
      syscall.vatstoreDelete(dbKey);
      let doMoreGC = false;
      if (passStyleOf(key) === 'remotable') {
        deleteOrdinal(key);
        if (hasWeakKeys) {
          vrm.removeRecognizableValue(key, entryDeleter);
        } else {
          doMoreGC = vrm.removeReachableVref(convertValToSlot(key));
        }
      }
      return doMoreGC;
    }

    function del(key) {
      currentGenerationNumber += 1;
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
      function* iter() {
        const generationAtStart = currentGenerationNumber;
        while (priorDBKey !== undefined) {
          assert(
            generationAtStart === currentGenerationNumber,
            X`keys in store cannot be changed during iteration`,
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
      currentGenerationNumber += 1;
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

    function snapshot() {
      assert.fail(X`snapshot not yet implemented`);
    }

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
      snapshot,
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
      const { keys, values, entries, sizeInternal, getSize, snapshot, clear } =
        raw;
      collection = {
        ...weakMethods,
        keys,
        values,
        entries,
        sizeInternal,
        getSize,
        snapshot,
        clear,
      };
    }
    return collection;
  }

  function storeSizeInternal(vobjID) {
    const { id, subid } = parseVatSlot(vobjID);
    const kindName = storeKindIDToName.get(`${id}`);
    const collection = summonCollectionInternal(false, 'test', subid, kindName);
    return collection.sizeInternal();
  }

  function deleteCollection(vobjID) {
    const { id, subid } = parseVatSlot(vobjID);
    const kindName = storeKindIDToName.get(`${id}`);
    const collection = summonCollectionInternal(false, 'GC', subid, kindName);

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

  let nextCollectionID = 1;

  function makeCollection(label, kindName, keySchema, valueSchema) {
    assert.typeof(label, 'string');
    assert(storeKindInfo[kindName]);
    assertKeyPattern(keySchema);
    const schemata = [keySchema];
    if (valueSchema) {
      assertPattern(valueSchema);
      schemata.push(valueSchema);
    }
    const collectionID = nextCollectionID;
    nextCollectionID += 1;
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
    return Far('mapStore', collection);
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
      snapshot,
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
      snapshot,
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
    registerEntry(vobjID, store);
    return store;
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
    registerEntry(vobjID, store);
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
    registerEntry(vobjID, store);
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
    registerEntry(vobjID, store);
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

  function reanimateScalarMapStore(vobjID, proForma) {
    return proForma ? null : collectionToMapStore(reanimateCollection(vobjID));
  }

  function reanimateScalarWeakMapStore(vobjID, proForma) {
    return proForma
      ? null
      : collectionToWeakMapStore(reanimateCollection(vobjID));
  }

  function reanimateScalarSetStore(vobjID, proForma) {
    return proForma ? null : collectionToSetStore(reanimateCollection(vobjID));
  }

  function reanimateScalarWeakSetStore(vobjID, proForma) {
    return proForma
      ? null
      : collectionToWeakSetStore(reanimateCollection(vobjID));
  }

  const testHooks = { storeSizeInternal, makeCollection };

  return harden({
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
    testHooks,
  });
}
