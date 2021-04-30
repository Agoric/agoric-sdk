import { assert, details as X, quote as q } from '@agoric/assert';
import { parseVatSlot } from '../parseVatSlots';
// import { kdebug } from './kdebug';

const initializationsInProgress = new WeakSet();

/**
 * Make a simple LRU cache of virtual object inner selves.
 *
 * @param {number} size  Maximum number of entries to keep in the cache before
 *    starting to throw them away.
 * @param {(vobjID: string) => Object} fetch  Function to retrieve an
 *    object's raw state from the store by its vobjID
 * @param {(vobjID: string, rawData: Object) => void} store  Function to
 *   store raw object state by its vobjID
 *
 * @returns {Object}  An LRU cache of (up to) the given size
 *
 * This cache is part of the virtual object manager and is not intended to be
 * used independently; it is exported only for the benefit of test code.
 */
export function makeCache(size, fetch, store) {
  let lruHead;
  let lruTail;
  const liveTable = new Map();

  const cache = {
    makeRoom() {
      while (liveTable.size > size && lruTail) {
        if (initializationsInProgress.has(lruTail.rawData)) {
          let refreshCount = 1;
          while (initializationsInProgress.has(lruTail.rawData)) {
            assert(
              refreshCount <= size,
              X`cache overflowed with objects being initialized`,
            );
            cache.refresh(lruTail);
            refreshCount += 1;
          }
        }
        // kdebug(`### vo LRU evict ${lruTail.vobjID} (dirty=${lruTail.dirty})`);
        liveTable.delete(lruTail.vobjID);
        if (lruTail.dirty) {
          store(lruTail.vobjID, lruTail.rawData);
          lruTail.dirty = false;
        }
        lruTail.rawData = null;
        if (lruTail.prev) {
          lruTail.prev.next = undefined;
        } else {
          lruHead = undefined;
        }
        lruTail = lruTail.prev;
      }
    },
    flush() {
      const saveSize = size;
      size = 0;
      cache.makeRoom();
      size = saveSize;
    },
    remember(innerObj) {
      if (liveTable.has(innerObj.vobjID)) {
        return;
      }
      cache.makeRoom();
      liveTable.set(innerObj.vobjID, innerObj);
      innerObj.prev = undefined;
      innerObj.next = lruHead;
      if (lruHead) {
        lruHead.prev = innerObj;
      }
      lruHead = innerObj;
      if (!lruTail) {
        lruTail = innerObj;
      }
      // kdebug(`### vo LRU remember ${lruHead.vobjID}`);
    },
    refresh(innerObj) {
      if (innerObj !== lruHead) {
        const oldPrev = innerObj.prev;
        const oldNext = innerObj.next;
        if (oldPrev) {
          oldPrev.next = oldNext;
        } else {
          lruHead = oldNext;
        }
        if (oldNext) {
          oldNext.prev = oldPrev;
        } else {
          lruTail = oldPrev;
        }
        innerObj.prev = undefined;
        innerObj.next = lruHead;
        lruHead.prev = innerObj;
        lruHead = innerObj;
        // kdebug(`### vo LRU refresh ${lruHead.vobjID}`);
      }
    },
    lookup(vobjID, load) {
      let innerObj = liveTable.get(vobjID);
      if (innerObj) {
        cache.refresh(innerObj);
      } else {
        innerObj = { vobjID, rawData: null, repCount: 0 };
        cache.remember(innerObj);
      }
      if (load && !innerObj.rawData) {
        innerObj.rawData = fetch(vobjID);
      }
      return innerObj;
    },
  };
  return cache;
}

/**
 * Create a new virtual object manager.  There is one of these for each vat.
 *
 * @param {*} syscall  Vat's syscall object, used to access the `vatstoreGet`
 *   and `vatstoreSet` operations.
 * @param {() => number} allocateExportID  Function to allocate the next object
 *   export ID for the enclosing vat.
 * @param {*} valToSlot  The vat's table that maps object identities to
 *   their corresponding export IDs
 * @param {*} registerValue  Function to register a new value in liveSlot's
 *   various tables
 * @param {*} m The vat's marshaler.
 * @param {number} cacheSize How many virtual objects this manager should cache
 *   in memory.
 * @returns {Object} a new virtual object manager.
 *
 * The virtual object manager allows the creation of persistent objects that do
 * not need to occupy memory when they are not in use.  It provides four
 * functions:
 *
 * - `makeKind` enables users to define new types of virtual object by providing
 *    an implementation of the new kind of object's behavior.  The result is a
 *    maker function that will produce new virtualized instances of the defined
 *    object type on demand.
 *
 * - `makeWeakStore` creates an instance of WeakStore that can be keyed by these
     virtual objects.
 *
 * - `flushCache` will empty the object manager's cache of in-memory object
 *    instances, writing any changed state to the persistent store.  This
 *    provided for testing; it otherwise has little use.
 *
 * - `makeVirtualObjectRepresentation` will provide a useeable, in-memory
 *    version of a virtual object, given its vat slot ID.  This is used when
 *    deserializing a reference to an object that has been received in a message
 *    or is part of the persistent state of another virtual object that is being
 *    swapped in from storage.
 *
 * `makeKind` and `makeWeakStore` are made available to user vat code as
 * globals.  The other two methods are for internal use by liveslots.
 */
export function makeVirtualObjectManager(
  syscall,
  allocateExportID,
  valToSlot,
  registerValue,
  m,
  cacheSize,
) {
  /**
   * Fetch an object's state from secondary storage.
   *
   * @param {string} vobjID  The virtual object ID of the object whose state is
   *    being fetched.
   * @returns {*} an object representing the object's stored state.
   */
  function fetch(vobjID) {
    return JSON.parse(syscall.vatstoreGet(vobjID));
  }

  /**
   * Write an object's state to secondary storage.
   *
   * @param {string} vobjID  The virtual object ID of the object whose state is
   *    being stored.
   * @param {*} rawData  A data object representing the state to be written.
   */
  function store(vobjID, rawData) {
    syscall.vatstoreSet(vobjID, JSON.stringify(rawData));
  }

  const cache = makeCache(cacheSize, fetch, store);

  /**
   * Map from virtual object kind IDs to reanimator functions for the
   * corresponding kinds of virtual objects.
   */
  const kindTable = new Map();

  /**
   * Produce a representative given a virtual object ID.  Used for
   * deserializing.
   *
   * @param {string} vobjID  The virtual object ID of the object being dereferenced
   *
   * @returns {Object}  A representative of the object identified by `vobjID`
   */
  function makeVirtualObjectRepresentative(vobjID) {
    const { id } = parseVatSlot(vobjID);
    const kindID = `${id}`;
    const reanimator = kindTable.get(kindID);
    if (reanimator) {
      return reanimator(vobjID);
    } else {
      assert.fail(X`unknown kind ${kindID}`);
    }
  }

  let nextWeakStoreID = 1;

  /**
   * This is essentially a copy of makeWeakStore from the @agoric/store package,
   * modified to key a virtual object representative using its virtual object ID
   * (rather than its object identity) and stash the corresponding value in
   * persistent storage.  Note this means that (1) non-virtual objects all
   * continue to be tracked in an in-memory WeakMap, meaning the keys are held
   * weakly but table size is bounded by memory capacity, while (2) virtual
   * objects are not actually held weakly and so will never (at this point) be
   * garbage collected since there's no way to tell when they keys become
   * unreferenced.
   *
   * This should be considered a placeholder for developmental purposes.  It is
   * not integrated with the regular @agoric/store package in a general way.
   *
   * @template {Record<any, any>} K
   * @template {any} V
   *
   * @param {string} [keyName='key']
   *
   * @returns {WeakStore<K, V>}
   */
  function makeWeakStore(keyName = 'key') {
    const backingMap = new WeakMap();
    const storeID = nextWeakStoreID;
    nextWeakStoreID += 1;

    function assertKeyDoesNotExist(key) {
      assert(!backingMap.has(key), X`${q(keyName)} already registered: ${key}`);
    }

    function assertKeyExists(key) {
      assert(backingMap.has(key), X`${q(keyName)} not found: ${key}`);
    }

    function virtualObjectKey(key) {
      const vobjID = valToSlot.get(key);
      if (vobjID) {
        const { type, virtual } = parseVatSlot(vobjID);
        if (type === 'object' && virtual) {
          return `ws${storeID}.${vobjID}`;
        }
      }
      return undefined;
    }

    return harden({
      has(key) {
        const vkey = virtualObjectKey(key);
        if (vkey) {
          return !!syscall.vatstoreGet(vkey);
        } else {
          return backingMap.has(key);
        }
      },
      init(key, value) {
        const vkey = virtualObjectKey(key);
        if (vkey) {
          assert(
            !syscall.vatstoreGet(vkey),
            X`${q(keyName)} already registered: ${key}`,
          );
          syscall.vatstoreSet(vkey, JSON.stringify(m.serialize(value)));
        } else {
          assertKeyDoesNotExist(key);
          backingMap.set(key, value);
        }
      },
      get(key) {
        const vkey = virtualObjectKey(key);
        if (vkey) {
          const rawValue = syscall.vatstoreGet(vkey);
          assert(rawValue, X`${q(keyName)} not found: ${key}`);
          return m.unserialize(JSON.parse(rawValue));
        } else {
          assertKeyExists(key);
          return backingMap.get(key);
        }
      },
      set(key, value) {
        const vkey = virtualObjectKey(key);
        if (vkey) {
          assert(syscall.vatstoreGet(vkey), X`${q(keyName)} not found: ${key}`);
          syscall.vatstoreSet(vkey, JSON.stringify(m.serialize(harden(value))));
        } else {
          assertKeyExists(key);
          backingMap.set(key, value);
        }
      },
      delete(key) {
        const vkey = virtualObjectKey(key);
        if (vkey) {
          assert(syscall.vatstoreGet(vkey), X`${q(keyName)} not found: ${key}`);
          syscall.vatstoreDelete(vkey);
        } else {
          assertKeyExists(key);
          backingMap.delete(key);
        }
      },
    });
  }

  function vrefKey(value) {
    const vobjID = valToSlot.get(value);
    if (vobjID) {
      const { type, virtual } = parseVatSlot(vobjID);
      if (type === 'object' && virtual) {
        return vobjID;
      }
    }
    return undefined;
  }

  /* eslint max-classes-per-file: ["error", 2] */

  const actualWeakMaps = new WeakMap();
  const virtualObjectMaps = new WeakMap();

  class RepairedWeakMap {
    constructor() {
      actualWeakMaps.set(this, new WeakMap());
      virtualObjectMaps.set(this, new Map());
    }

    has(key) {
      const vkey = vrefKey(key);
      if (vkey) {
        return virtualObjectMaps.get(this).has(vkey);
      } else {
        return actualWeakMaps.get(this).has(key);
      }
    }

    get(key) {
      const vkey = vrefKey(key);
      if (vkey) {
        return virtualObjectMaps.get(this).get(vkey);
      } else {
        return actualWeakMaps.get(this).get(key);
      }
    }

    set(key, value) {
      const vkey = vrefKey(key);
      if (vkey) {
        virtualObjectMaps.get(this).set(vkey, value);
      } else {
        actualWeakMaps.get(this).set(key, value);
      }
      return this;
    }

    delete(key) {
      const vkey = vrefKey(key);
      if (vkey) {
        return virtualObjectMaps.get(this).delete(vkey);
      } else {
        return actualWeakMaps.get(this).delete(key);
      }
    }
  }

  Object.defineProperty(RepairedWeakMap, Symbol.toStringTag, {
    value: 'WeakMap',
    writable: false,
    enumerable: false,
    configurable: true,
  });

  const actualWeakSets = new WeakMap();
  const virtualObjectSets = new WeakMap();

  class RepairedWeakSet {
    constructor() {
      actualWeakSets.set(this, new WeakSet());
      virtualObjectSets.set(this, new Set());
    }

    has(value) {
      const vkey = vrefKey(value);
      if (vkey) {
        return virtualObjectSets.get(this).has(vkey);
      } else {
        return actualWeakSets.get(this).has(value);
      }
    }

    add(value) {
      const vkey = vrefKey(value);
      if (vkey) {
        virtualObjectSets.get(this).add(vkey);
      } else {
        actualWeakSets.get(this).add(value);
      }
      return this;
    }

    delete(value) {
      const vkey = vrefKey(value);
      if (vkey) {
        return virtualObjectSets.get(this).delete(vkey);
      } else {
        return actualWeakSets.get(this).delete(value);
      }
    }
  }

  Object.defineProperty(RepairedWeakSet, Symbol.toStringTag, {
    value: 'WeakSet',
    writable: false,
    enumerable: false,
    configurable: true,
  });

  /**
   * Define a new kind of virtual object.
   *
   * @param {*} instanceKitMaker A function of the form
   *    `instanceKitMaker(state)` that will return an "instance kit" describing
   *    the parts of a new instance of the virtual object kind being defined.
   *    The instance kit is an object with two properties: `init`, a function
   *    that will initialize the state of the new instance, and `self`, an
   *    object with methods implementing the new virtual object's behavior,
   *    which will become the new virtual object instance's initial
   *    representative.
   *
   * @returns {*} a maker function that can be called to manufacture new
   *    instances of this kind of object.  The parameters of the maker function
   *    are those of the `init` method provided by the `instanceKitMaker`
   *    function.
   *
   * Notes on theory of operation:
   *
   * Virtual objects are structured in three layers: representatives, inner
   * selves, and state data.
   *
   * A representative is the manifestation of a virtual object that vat code has
   * direct access to.  A given virtual object can have multiple
   * representatives: one is created when the instance is initially made and
   * another is generated each time the instance's virtual object ID is
   * deserialized, either when delivered as part of an incoming message or read
   * as part of another virtual object's state.  These representatives are not
   * === but do obey the `sameKey` equivalence relation.  In particular, methods
   * invoked on them all operate on the same underyling virtual object state.  A
   * representative is garbage collectable once it becomes unreferenced in the
   * vat.
   *
   * The inner self represents the in-memory information about an object, aside
   * from its state.  There is an inner self for each virtual object that is
   * currently resident in memory; that is, there is an inner self for each
   * virtual object for which there is currently at least one representative
   * present somewhere in the vat.  The inner self maintains two pieces of
   * information: its corresponding virtual object's virtual object ID, and a
   * pointer to the virtual object's state in memory if the virtual object's
   * state is, in fact, currently resident in memory.  If the state is not in
   * memory, the inner self's pointer to the state is null.  In addition, the
   * virtual object manager maintains an LRU cache of inner selves.  Inner
   * selves that are in the cache are not necessarily referenced by any existing
   * representative, but are available to be used should such a representative
   * be needed.  How this all works will be explained in a moment.
   *
   * The state of a virtual object is a collection of mutable properties, each
   * of whose values is itself immutable and serializable.  The methods of a
   * virtual object have access to this state by closing over a state object.
   * However, the state object they close over is not the actual state object,
   * but a wrapper with accessor methods that both ensure that a representation
   * of the state is in memory when needed and perform deserialization on read
   * and serialization on write; this wrapper is held by the representative, so
   * that method invocations always see the wrapper belonging to the invoking
   * representative.  The actual state object holds marshaled serializations of
   * each of the state properties.  When written to persistent storage, this is
   * representated as a JSON-stringified object each of whose properties is one
   * of the marshaled property values.
   *
   * When a method of a virtual object attempts to access one of the properties
   * of the object's state, the accessor first checks to see if the state is in
   * memory.  If it is not, it is loaded from persistent storage, the
   * corresponding inner self is made to point at it, and then the inner self is
   * placed at the head of the LRU cache (causing the least recently used inner
   * self to fall off the end of the cache).  If it *is* in memory, it is
   * promoted to the head of the LRU cache but the contents of the cache remains
   * unchanged.  When an inner self falls off the end of the LRU, its reference
   * to the state is nulled out and the object holding the state becomes garbage
   * collectable.
   */
  function makeKind(instanceKitMaker) {
    const kindID = `${allocateExportID()}`;
    let nextInstanceID = 1;
    const propertyNames = new Set();

    function makeRepresentative(innerSelf, initializing) {
      assert(
        innerSelf.repCount === 0,
        X`${innerSelf.vobjID} already has a representative`,
      );
      innerSelf.repCount += 1;

      function ensureState() {
        if (innerSelf.rawData) {
          cache.refresh(innerSelf);
        } else {
          innerSelf = cache.lookup(innerSelf.vobjID, true);
        }
      }

      function wrapData(target) {
        assert(
          !initializationsInProgress.has(target),
          `object is still being initialized`,
        );
        for (const prop of propertyNames) {
          Object.defineProperty(target, prop, {
            get: () => {
              ensureState();
              return m.unserialize(innerSelf.rawData[prop]);
            },
            set: value => {
              const serializedValue = m.serialize(value);
              ensureState();
              innerSelf.rawData[prop] = serializedValue;
              innerSelf.dirty = true;
            },
          });
        }
        innerSelf.wrapData = undefined;
        harden(target);
      }

      let instanceKit;
      if (initializing) {
        innerSelf.wrapData = wrapData;
        instanceKit = harden(instanceKitMaker(innerSelf.rawData));
        cache.remember(innerSelf);
      } else {
        const activeData = {};
        wrapData(activeData);
        instanceKit = harden(instanceKitMaker(activeData));
      }
      return instanceKit;
    }

    function reanimate(vobjID) {
      // kdebug(`vo reanimate ${vobjID}`);
      const innerSelf = cache.lookup(vobjID, false);
      const representative = makeRepresentative(innerSelf, false).self;
      innerSelf.representative = representative;
      return representative;
    }
    kindTable.set(kindID, reanimate);

    function makeNewInstance(...args) {
      const vobjID = `o+${kindID}/${nextInstanceID}`;
      nextInstanceID += 1;

      const initialData = {};
      initializationsInProgress.add(initialData);
      const innerSelf = { vobjID, rawData: initialData, repCount: 0 };
      // kdebug(`vo make ${vobjID}`);
      // prettier-ignore
      const { self: initialRepresentative, init } =
        makeRepresentative(innerSelf, true);
      if (init) {
        init(...args);
      }
      innerSelf.representative = initialRepresentative;
      registerValue(vobjID, initialRepresentative);
      initializationsInProgress.delete(initialData);
      const rawData = {};
      for (const prop of Object.getOwnPropertyNames(initialData)) {
        try {
          rawData[prop] = m.serialize(initialData[prop]);
        } catch (e) {
          console.error(`state property ${String(prop)} is not serializable`);
          throw e;
        }
      }
      innerSelf.rawData = rawData;
      for (const prop of Object.getOwnPropertyNames(initialData)) {
        propertyNames.add(prop);
      }
      innerSelf.wrapData(initialData);
      innerSelf.dirty = true;
      return initialRepresentative;
    }

    return makeNewInstance;
  }

  return harden({
    makeWeakStore,
    makeKind,
    RepairedWeakMap,
    RepairedWeakSet,
    flushCache: cache.flush,
    makeVirtualObjectRepresentative,
  });
}
