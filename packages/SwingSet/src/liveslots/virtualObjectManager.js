// @ts-check
/* eslint-disable no-use-before-define */

import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
// import { kdebug } from './kdebug.js';

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
  let dirtyCount = 0;
  const liveTable = new Map();

  const cache = {
    makeRoom() {
      while (liveTable.size > size && lruTail) {
        // kdebug(`### vo LRU evict ${lruTail.vobjID} (dirty=${lruTail.dirty})`);
        liveTable.delete(lruTail.vobjID);
        if (lruTail.dirty) {
          store(lruTail.vobjID, lruTail.rawData);
          lruTail.dirty = false;
          dirtyCount -= 1;
        }
        lruTail.rawData = null;
        if (lruTail.prev) {
          lruTail.prev.next = undefined;
        } else {
          lruHead = undefined;
        }
        const deadEntry = lruTail;
        lruTail = lruTail.prev;
        deadEntry.next = undefined;
        deadEntry.prev = undefined;
      }
    },
    markDirty(entry) {
      if (!entry.dirty) {
        entry.dirty = true;
        dirtyCount += 1;
      }
    },
    flush() {
      if (dirtyCount > 0) {
        let entry = lruTail;
        while (entry) {
          if (entry.dirty) {
            store(entry.vobjID, entry.rawData);
            entry.dirty = false;
          }
          entry = entry.prev;
        }
        dirtyCount = 0;
      }
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
 * @param {*} syscall  Vat's syscall object, used to access the vatstore operations.
 * @param {*} vrm  Virtual reference manager, to handle reference counting and GC
 *   of virtual references.
 * @param {() => number} allocateExportID  Function to allocate the next object
 *   export ID for the enclosing vat.
 * @param { (val: Object) => string} getSlotForVal  A function that returns the
 *   object ID (vref) for a given object, if any.  their corresponding export
 *   IDs
 * @param {*} registerEntry  Function to register a new slot+value in liveSlot's
 *   various tables
 * @param {*} serialize  Serializer for this vat
 * @param {*} unserialize  Unserializer for this vat
 * @param {number} cacheSize  How many virtual objects this manager should cache
 *   in memory.
 *
 * @returns {Object} a new virtual object manager.
 *
 * The virtual object manager allows the creation of persistent objects that do
 * not need to occupy memory when they are not in use.  It provides five
 * functions:
 *
 * - `defineKind` and `defineDurableKind` enable users to define new types of
 *    virtual object by providing an implementation of the new kind of object's
 *    behavior.  The result is a maker function that will produce new
 *    virtualized instances of the defined object type on demand.
 *
 * - `VirtualObjectAwareWeakMap` and `VirtualObjectAwareWeakSet` are drop-in
 *    replacements for JavaScript's builtin `WeakMap` and `WeakSet` classes
 *    which understand the magic internal voodoo used to implement virtual
 *    objects and will do the right thing when virtual objects are used as keys.
 *    The intent is that the hosting environment will inject these as
 *    substitutes for their regular JS analogs in way that should be transparent
 *    to ordinary users of those classes.
 *
 * - `flushCache` will empty the object manager's cache of in-memory object
 *    instances, writing any changed state to the persistent store.  This is
 *    provided for testing and to ensure that state that should be persisted
 *    actually is prior to a controlled shutdown; normal code should not use
 *    this.
 *
 * `defineKind` and `defineDurableKind` are made available to user vat code in
 * the `VatData` global (along with various other storage functions defined
 * elsewhere).
 */
export function makeVirtualObjectManager(
  syscall,
  vrm,
  allocateExportID,
  getSlotForVal,
  registerEntry,
  serialize,
  unserialize,
  cacheSize,
) {
  const cache = makeCache(cacheSize, fetch, store);

  /**
   * Fetch an object's state from secondary storage.
   *
   * @param {string} vobjID  The virtual object ID of the object whose state is
   *    being fetched.
   * @returns {*} an object representing the object's stored state.
   */
  function fetch(vobjID) {
    const raw = syscall.vatstoreGet(`vom.${vobjID}`);
    if (raw) {
      return JSON.parse(raw);
    } else {
      return undefined;
    }
  }

  /**
   * Write an object's state to secondary storage.
   *
   * @param {string} vobjID  The virtual object ID of the object whose state is
   *    being stored.
   * @param {*} rawData  A data object representing the state to be written.
   */
  function store(vobjID, rawData) {
    syscall.vatstoreSet(`vom.${vobjID}`, JSON.stringify(rawData));
  }

  /* eslint max-classes-per-file: ["error", 2] */

  const actualWeakMaps = new WeakMap();
  const virtualObjectMaps = new WeakMap();

  function voAwareWeakMapDeleter(descriptor) {
    for (const vref of descriptor.vmap.keys()) {
      vrm.removeRecognizableVref(vref, descriptor.vmap);
    }
  }

  class VirtualObjectAwareWeakMap {
    constructor() {
      actualWeakMaps.set(this, new WeakMap());
      const vmap = new Map();
      virtualObjectMaps.set(this, vmap);
      vrm.droppedCollectionRegistry.register(this, {
        collectionDeleter: voAwareWeakMapDeleter,
        vmap,
      });
    }

    has(key) {
      const vkey = vrm.vrefKey(key);
      if (vkey) {
        return virtualObjectMaps.get(this).has(vkey);
      } else {
        return actualWeakMaps.get(this).has(key);
      }
    }

    get(key) {
      const vkey = vrm.vrefKey(key);
      if (vkey) {
        return virtualObjectMaps.get(this).get(vkey);
      } else {
        return actualWeakMaps.get(this).get(key);
      }
    }

    set(key, value) {
      const vkey = vrm.vrefKey(key);
      if (vkey) {
        const vmap = virtualObjectMaps.get(this);
        if (!vmap.has(vkey)) {
          vrm.addRecognizableValue(key, vmap);
        }
        vmap.set(vkey, value);
      } else {
        actualWeakMaps.get(this).set(key, value);
      }
      return this;
    }

    delete(key) {
      const vkey = vrm.vrefKey(key);
      if (vkey) {
        const vmap = virtualObjectMaps.get(this);
        if (vmap.has(vkey)) {
          vrm.removeRecognizableValue(key, vmap);
          return vmap.delete(vkey);
        } else {
          return false;
        }
      } else {
        return actualWeakMaps.get(this).delete(key);
      }
    }
  }

  Object.defineProperty(VirtualObjectAwareWeakMap, Symbol.toStringTag, {
    value: 'WeakMap',
    writable: false,
    enumerable: false,
    configurable: true,
  });

  const actualWeakSets = new WeakMap();
  const virtualObjectSets = new WeakMap();

  function voAwareWeakSetDeleter(descriptor) {
    for (const vref of descriptor.vset.values()) {
      vrm.removeRecognizableVref(vref, descriptor.vset);
    }
  }

  class VirtualObjectAwareWeakSet {
    constructor() {
      actualWeakSets.set(this, new WeakSet());
      const vset = new Set();
      virtualObjectSets.set(this, vset);

      vrm.droppedCollectionRegistry.register(this, {
        collectionDeleter: voAwareWeakSetDeleter,
        vset,
      });
    }

    has(value) {
      const vkey = vrm.vrefKey(value);
      if (vkey) {
        return virtualObjectSets.get(this).has(vkey);
      } else {
        return actualWeakSets.get(this).has(value);
      }
    }

    add(value) {
      const vkey = vrm.vrefKey(value);
      if (vkey) {
        const vset = virtualObjectSets.get(this);
        if (!vset.has(value)) {
          vrm.addRecognizableValue(value, vset);
          vset.add(vkey);
        }
      } else {
        actualWeakSets.get(this).add(value);
      }
      return this;
    }

    delete(value) {
      const vkey = vrm.vrefKey(value);
      if (vkey) {
        const vset = virtualObjectSets.get(this);
        if (vset.has(vkey)) {
          vrm.removeRecognizableValue(value, vset);
          return vset.delete(vkey);
        } else {
          return false;
        }
      } else {
        return actualWeakSets.get(this).delete(value);
      }
    }
  }

  Object.defineProperty(VirtualObjectAwareWeakSet, Symbol.toStringTag, {
    value: 'WeakSet',
    writable: false,
    enumerable: false,
    configurable: true,
  });

  /**
   * Define a new kind of virtual object.
   *
   * @param {string} tag  A descriptive tag string as used in calls to `Far`
   *
   * @param {*} init  An initialization function that will return the initial
   *    state of a new instance of the kind of virtual object being defined.
   *
   * @param {*} actualize  An actualization function that will provide the
   *    in-memory representative object that wraps behavior around the
   *    virtualized state of an instance of the object kind being defined.
   *
   * @param {*} finish  An optional finisher function that can perform
   *    post-creation initialization operations, such as inserting the new
   *    object in a cyclical object graph.
   *
   * @param {boolean} durable  A flag indicating whether or not the newly defined
   *    kind should be a durable kind.
   *
   * @returns {*} a maker function that can be called to manufacture new
   *    instances of this kind of object.  The parameters of the maker function
   *    are those of the `init` function.
   *
   * Notes on theory of operation:
   *
   * Virtual objects are structured in three layers: representatives, inner
   * selves, and state data.
   *
   * A representative is the manifestation of a virtual object that vat code has
   * direct access to.  A given virtual object can have at most one
   * representative, which will be created as needed.  This will happen when the
   * instance is initially made, and can also happen (if it does not already
   * exist) when the instance's virtual object ID is deserialized, either when
   * delivered as part of an incoming message or read as part of another virtual
   * object's state.  A representative will be kept alive in memory as long as
   * there is a variable somewhere that references it directly or indirectly.
   * However, if a representative becomes unreferenced in memory it is subject
   * to garbage collection, leaving the representation that is kept in the vat
   * store as the record of its state from which a mew representative can be
   * reconsituted at need.  Since only one representative exists at a time,
   * references to them may be compared with the equality operator (===).
   * Although the identity of a representative can change over time, this is
   * never visible to code running in the vat.  Methods invoked on a
   * representative always operate on the underyling virtual object state.
   *
   * The inner self represents the in-memory information about an object, aside
   * from its state.  There is an inner self for each virtual object that is
   * currently resident in memory; that is, there is an inner self for each
   * virtual object for which there is currently a representative present
   * somewhere in the vat.  The inner self maintains two pieces of information:
   * its corresponding virtual object's virtual object ID, and a pointer to the
   * virtual object's state in memory if the virtual object's state is, in fact,
   * currently resident in memory.  If the state is not in memory, the inner
   * self's pointer to the state is null.  In addition, the virtual object
   * manager maintains an LRU cache of inner selves.  Inner selves that are in
   * the cache are not necessarily referenced by any existing representative,
   * but are available to be used should such a representative be needed.  How
   * this all works will be explained in a moment.
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
   * promoted to the head of the LRU cache but the overall contents of the cache
   * remain unchanged.  When an inner self falls off the end of the LRU, its
   * reference to the state is nulled out and the object holding the state
   * becomes garbage collectable.
   */
  function defineKindInternal(tag, init, actualize, finish, durable) {
    const kindID = `${allocateExportID()}`;
    let nextInstanceID = 1;
    const propertyNames = new Set();

    function makeRepresentative(innerSelf, initializing, proForma) {
      if (!proForma) {
        assert(
          innerSelf.repCount === 0,
          X`${innerSelf.vobjID} already has a representative`,
        );
        innerSelf.repCount += 1;
      }

      function ensureState() {
        if (innerSelf.rawData) {
          cache.refresh(innerSelf);
        } else {
          innerSelf = cache.lookup(innerSelf.vobjID, true);
          assert(
            innerSelf.rawData,
            `Missing rawData for innerSelf '${innerSelf.vobjID}'`,
          );
        }
      }

      const wrappedData = {};
      for (const prop of propertyNames) {
        Object.defineProperty(wrappedData, prop, {
          get: () => {
            ensureState();
            return unserialize(innerSelf.rawData[prop]);
          },
          set: value => {
            ensureState();
            const before = innerSelf.rawData[prop];
            const after = serialize(value);
            if (durable) {
              after.slots.map(vref =>
                assert(
                  vrm.isDurable(vref),
                  X`value for ${prop} is not durable`,
                ),
              );
            }
            vrm.updateReferenceCounts(before.slots, after.slots);
            innerSelf.rawData[prop] = after;
            cache.markDirty(innerSelf);
          },
        });
      }
      harden(wrappedData);

      if (initializing) {
        cache.remember(innerSelf);
      }
      const representative = Far(tag, actualize(wrappedData));
      if (!proForma) {
        innerSelf.representative = representative;
      }
      return [representative, wrappedData];
    }

    function reanimate(vobjID, proForma) {
      // kdebug(`vo reanimate ${vobjID}`);
      const innerSelf = cache.lookup(vobjID, false);
      const [representative] = makeRepresentative(innerSelf, false, proForma);
      if (proForma) {
        return null;
      } else {
        return representative;
      }
    }

    function deleteStoredVO(vobjID) {
      let doMoreGC = false;
      const state = fetch(vobjID);
      if (state) {
        for (const propValue of Object.values(state)) {
          propValue.slots.map(
            vref => (doMoreGC = doMoreGC || vrm.removeReachableVref(vref)),
          );
        }
      }
      syscall.vatstoreDelete(`vom.${vobjID}`);
      return doMoreGC;
    }

    vrm.registerKind(kindID, reanimate, deleteStoredVO, durable);

    function makeNewInstance(...args) {
      const vobjID = `o+${kindID}/${nextInstanceID}`;
      nextInstanceID += 1;
      // kdebug(`vo make ${vobjID}`);

      const initialData = init ? init(...args) : {};
      const rawData = {};
      for (const prop of Object.getOwnPropertyNames(initialData)) {
        const data = serialize(initialData[prop]);
        if (durable) {
          data.slots.map(vref =>
            assert(vrm.isDurable(vref), X`value for ${prop} is not durable`),
          );
        }
        data.slots.map(vrm.addReachableVref);
        rawData[prop] = data;
        propertyNames.add(prop);
      }
      const innerSelf = { vobjID, rawData, repCount: 0 };
      const [initialRepresentative, wrappedData] = makeRepresentative(
        innerSelf,
        true,
        false,
      );
      registerEntry(vobjID, initialRepresentative);
      if (finish) {
        finish(wrappedData, initialRepresentative);
      }
      cache.markDirty(innerSelf);
      return initialRepresentative;
    }

    return makeNewInstance;
  }

  function defineKind(tag, init, actualize, finish) {
    return defineKindInternal(tag, init, actualize, finish, false);
  }

  function defineDurableKind(tag, init, actualize, finish) {
    return defineKindInternal(tag, init, actualize, finish, true);
  }

  function countWeakKeysForCollection(collection) {
    const virtualObjectMap = virtualObjectMaps.get(collection);
    if (virtualObjectMap) {
      return virtualObjectMap.size;
    }
    const virtualObjectSet = virtualObjectSets.get(collection);
    if (virtualObjectSet) {
      return virtualObjectSet.size;
    }
    return 0;
  }

  const testHooks = {
    countWeakKeysForCollection,
  };

  return harden({
    defineKind,
    defineDurableKind,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    flushCache: cache.flush,
    testHooks,
  });
}
