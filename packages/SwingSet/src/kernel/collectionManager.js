/* global BigUint64Array */
// @ts-check
import { assert, details as X, q } from '@agoric/assert';
import { makePatternKit, compareRank } from '@agoric/store';
import {
  passStyleOf,
  nameForPassableSymbol,
  passableSymbolForName,
} from '@agoric/marshal';

function zeroPad(n, size) {
  const str = `000000000000000000${n}`;
  return str.substring(str.length - size);
}

// Note: mutation of static state -- for use only in the short lifetime code below XXX reword
// This is invalid Jessie code
const asNumber = new Float64Array(1);
const asBits = new BigUint64Array(asNumber.buffer);

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
  if (k[0] < '8') {
    // eslint-disable-next-line no-bitwise
    bits ^= 0xffffffffffffffffn;
  } else {
    // eslint-disable-next-line no-bitwise
    bits ^= 0x8000000000000000n;
  }
  asBits[0] = bits;
  return asNumber[0];
}

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

function pattEq(p1, p2) {
  return compareRank(p1, p2) === 0;
}

let nextCollectionID = 1;

function allocateCollectionID() {
  const collectionID = nextCollectionID;
  nextCollectionID += 1;
  return collectionID;
}

const collections = new Map();

export function makeCollectionManager(
  syscall,
  vrm,
  getSlotForVal,
  getValForSlot,
  serialize,
  unserialize,
) {
  const { getRankCover, assertKeyPattern, matches, M } = makePatternKit();

  function makeCollection(name, keySchema = M.scalar()) {
    debugger;
    assert.typeof(name, 'string');
    assertKeyPattern(keySchema);

    assert(!collections.has(name), X`collection ${q(name)} already exists`);

    const collectionID = allocateCollectionID();
    const dbKeyPrefix = `vc.${collectionID}.`;

    // XXX size should be stored persistently, either explicitly or implicitly,
    // but I'm concerned about the cost.  In the explicit case we pay for an
    // extra database write each time `init` or `delete` is called, to increment
    // or decrement a size counter stored in the DB.  In the implicit case we
    // would pay a one-time O(n) cost at startup time to count the number of
    // entries that were there when we last exited (actually, this could be done
    // lazily instead of at startup, which could save the cost in the likely
    // common case where nobody ever looks at the size property, but it would
    // still be O(n) when and if it happens).  Neither of these alternatives
    // seems appetizing.
    let size = 0;

    function prefix(dbEntryKey) {
      return `${dbKeyPrefix}${dbEntryKey}`;
    }

    syscall.vatstoreSet(prefix('|nextOrdinal'), '1');

    function encodeKey(key) {
      const passStyle = passStyleOf(key);
      switch (passStyle) {
        case 'null':
          return 'z';
        case 'undefined':
          return 'u';
        case 'number':
          return numberToDBEntryKey(key);
        case 'string':
          return `s${key}`;
        case 'boolean':
          return `b${key}`;
        case 'bigint':
          return bigintToDBEntryKey(key);
        case 'remotable': {
          // eslint-disable-next-line no-use-before-define
          const ordinal = getOrdinal(key);
          assert(ordinal !== undefined, X`no ordinal for ${key}`);
          const ordinalTag = zeroPad(ordinal, BIGINT_TAG_LEN);
          return `r${ordinalTag}:${getSlotForVal(key)}`;
        }
        case 'symbol':
          return `y${nameForPassableSymbol(key)}`;
        default:
          assert.fail(X`a ${q(passStyle)} cannot be used as a collection key`);
      }
    }

    function generateOrdinal(remotable) {
      const nextOrdinal = Number.parseInt(
        syscall.vatstoreGet(prefix('|nextOrdinal')),
        10,
      );
      syscall.vatstoreSet(
        prefix(`|${getSlotForVal(remotable)}`),
        `${nextOrdinal}`,
      );
      syscall.vatstoreSet(prefix('|nextOrdinal'), `${nextOrdinal + 1}`);
    }

    function getOrdinal(remotable) {
      const ordinalString = syscall.vatstoreGet(
        prefix(`|${getSlotForVal(remotable)}`),
      );
      if (ordinalString) {
        return Number.parseInt(ordinalString, 10);
      } else {
        return undefined;
      }
    }

    function deleteOrdinal(remotable) {
      syscall.vatstoreDelete(prefix(`|${getSlotForVal(remotable)}`));
    }

    /*
    function isValueSchema(schema) {
      return pattEq(schema, M.any());
    }

    function assertValueSchema(schema) {
      assert(
        isValueSchema(schema),
        X`not a supported schema for collection values`,
      );
    }
    */

    function isValuePattern(patt) {
      return pattEq(patt, M.any());
    }

    function assertValuePattern(patt) {
      assert(
        isValuePattern(patt),
        X`not a supported pattern for collection values`,
      );
    }

    function keyToDBKey(key) {
      return prefix(encodeKey(key));
    }

    function dbKeyToKey(dbKey) {
      const dbEntryKey = dbKey.substring(dbKeyPrefix.length);
      switch (dbEntryKey[0]) {
        case 'z':
          return null;
        case 'u':
          return undefined;
        case 'f':
          return dbEntryKeyToNumber(dbEntryKey);
        case 's':
          return dbEntryKey.substring(1);
        case 'b':
          return dbEntryKey.substring(1) !== 'false';
        case 'n':
        case 'p':
          return dbEntryKeyToBigint(dbEntryKey);
        case 'r':
          return getValForSlot(dbEntryKey.substring(BIGINT_TAG_LEN + 2));
        case 'y':
          return passableSymbolForName(dbEntryKey.substring(1));
        default:
          assert.fail(X`invalid database key: ${dbEntryKey}`);
      }
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
        X`invalid key type for collection ${q(name)}`,
      );
      const result = syscall.vatstoreGet(keyToDBKey(key));
      if (result) {
        return unserialize(JSON.parse(result));
      }
      assert.fail(X`key ${key} not found in collection ${q(name)}`);
    }

    function init(key, value) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(name)}`,
      );
      assert(
        !has(key),
        X`key ${key} already registered in collection ${q(name)}`,
      );
      if (passStyleOf(key) === 'remotable') {
        generateOrdinal(key);
        vrm.addReachableVref(getSlotForVal(key));
      }
      const serializedValue = serialize(value);
      serializedValue.slots.map(vrm.addReachableVref);
      syscall.vatstoreSet(keyToDBKey(key), JSON.stringify(serializedValue));
      size += 1;
    }

    function set(key, value) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(name)}`,
      );
      assert(has(key), X`key ${key} not found in collection ${q(name)}`);
      const dbKey = keyToDBKey(key);
      const oldValue = JSON.parse(syscall.vatstoreGet(dbKey));
      const serializedValue = serialize(value);
      vrm.updateReferenceCounts(oldValue.slots, serializedValue.slots);
      syscall.vatstoreSet(dbKey, JSON.stringify(serializedValue));
    }

    function del(key) {
      assert(
        matches(key, keySchema),
        X`invalid key type for collection ${q(name)}`,
      );
      assert(has(key), X`key ${key} not found in collection ${q(name)}`);
      const dbKey = keyToDBKey(key);
      const oldValue = JSON.parse(syscall.vatstoreGet(dbKey));
      oldValue.slots.map(vrm.removeReachableVref);
      syscall.vatstoreDelete(dbKey);
      if (passStyleOf(key) === 'remotable') {
        vrm.removeReachableVref(getSlotForVal(key));
        deleteOrdinal(key);
      }
      size -= 1;
    }

    function keys(keyPatt = M.any(), valuePatt = M.any()) {
      assertKeyPattern(keyPatt);
      assertValuePattern(valuePatt);
      const [coverStart, coverEnd] = getRankCover(keyPatt, encodeKey);
      let priorDBKey = '';
      const start = prefix(coverStart);
      const end = prefix(coverEnd);
      const allValues = pattEq(valuePatt, M.any());
      function* iter() {
        while (priorDBKey !== undefined) {
          const getAfterResult = syscall.vatstoreGetAfter(
            priorDBKey,
            start,
            end,
          );
          if (!getAfterResult) {
            break;
          }
          const [dbKey, dbValue] = getAfterResult;
          if (dbKey < end) {
            priorDBKey = dbKey;
            const key = dbKeyToKey(dbKey);
            if (matches(key, keyPatt)) {
              // Skip unserializing value if we're never going to look at it
              if (!allValues) {
                const value = unserialize(JSON.parse(dbValue));
                if (!matches(value, valuePatt)) {
                  // eslint-disable-next-line no-continue
                  continue;
                }
              }
              yield key;
            }
          }
        }
      }
      return iter();
    }

    function clear() {
      for (const k of keys()) {
        del(k);
      }
    }

    function values(keyPatt = M.any(), valuePatt = M.any()) {
      assertKeyPattern(keyPatt);
      assertValuePattern(valuePatt);
      const [coverStart, coverEnd] = getRankCover(keyPatt, encodeKey);
      let priorDBKey = '';
      const start = prefix(coverStart);
      const end = prefix(coverEnd);
      function* iter() {
        while (priorDBKey !== undefined) {
          const getAfterResult = syscall.vatstoreGetAfter(
            priorDBKey,
            start,
            end,
          );
          if (!getAfterResult) {
            break;
          }
          const [dbKey, dbValue] = getAfterResult;
          if (dbKey < end) {
            priorDBKey = dbKey;
            const key = dbKeyToKey(dbKey);
            const value = unserialize(JSON.parse(dbValue));
            if (matches(key, keyPatt) && matches(value, valuePatt)) {
              yield value;
            }
          }
        }
      }
      return iter();
    }

    function entries(keyPatt = M.any(), valuePatt = M.any()) {
      assertKeyPattern(keyPatt);
      assertValuePattern(valuePatt);
      const [coverStart, coverEnd] = getRankCover(keyPatt, encodeKey);
      let priorDBKey = '';
      const start = prefix(coverStart);
      const end = prefix(coverEnd);
      function* iter() {
        while (priorDBKey !== undefined) {
          const getAfterResult = syscall.vatstoreGetAfter(
            priorDBKey,
            start,
            end,
          );
          if (!getAfterResult) {
            break;
          }
          const [dbKey, dbValue] = getAfterResult;
          if (dbKey < end) {
            priorDBKey = dbKey;
            const key = dbKeyToKey(dbKey);
            const value = unserialize(JSON.parse(dbValue));
            if (matches(key, keyPatt) && matches(value, valuePatt)) {
              yield [key, value];
            }
          }
        }
      }
      return iter();
    }

    const collection = harden({
      has,
      get,
      init,
      set,
      delete: del,
      keys,
      values,
      entries,
      clear,
      get size() {
        return size;
      },
    });
    collections.set(name, collection);
    return collection;
  }

  function getCollection(name) {
    return collections.get(name);
  }

  function makeScalarMapStore(name, keySchema) {
    return makeCollection(name, keySchema);
  }

  // XXX TODO: At this round of implementation we're treating "weak" as meaning
  // "non-iterable", rather actually implementing weak keys.  Weak keys (which
  // is to say, GC for weak keys) will come in due time; the machinery to do
  // this already exists in virtualObjectManager but still needs to be adapted
  // for collections here.
  function makeScalarWeakMapStore(name, keySchema) {
    const collection = makeCollection(name, keySchema);
    const { has, get, init, set, delete: del, clear } = collection;
    const weakMapStore = { has, get, init, set, delete: del, clear };
    return harden(weakMapStore);
  }

  function makeScalarSetStore(name, keySchema) {
    const collection = makeCollection(name, keySchema);
    const { has, init, delete: del, keys, clear } = collection;
    function* entries(patt) {
      for (const k of keys(patt)) {
        yield [k, k];
      }
    }

    const setStore = {
      has,
      add: elem => init(elem, null),
      delete: del,
      keys,
      values: keys,
      entries,
      clear,
      get size() {
        return collection.size;
      },
    };
    return harden(setStore);
  }

  // XXX TODO: see above comment about "weak"
  function makeScalarWeakSetStore(name, keySchema) {
    const collection = makeCollection(name, keySchema);
    const { has, init, delete: del, clear } = collection;
    const weakSetStore = {
      has,
      add: elem => init(elem, null),
      delete: del,
      clear,
    };
    return harden(weakSetStore);
  }

  return harden({
    makeCollection,
    makeScalarMapStore,
    makeScalarWeakMapStore,
    makeScalarSetStore,
    makeScalarWeakSetStore,
    getCollection,
    M,
  });
}
