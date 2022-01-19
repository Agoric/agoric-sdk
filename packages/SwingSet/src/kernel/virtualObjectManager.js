// @ts-check
/* eslint-disable no-use-before-define */

import { assert, details as X, quote as q } from '@agoric/assert';
import { Nat } from '@agoric/nat';
import { getInterfaceOf } from '@agoric/marshal';
import { parseVatSlot } from '../parseVatSlots.js';
// import { kdebug } from './kdebug.js';

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
        const deadEntry = lruTail;
        lruTail = lruTail.prev;
        deadEntry.next = undefined;
        deadEntry.prev = undefined;
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
 * @param { (val: Object) => string} getSlotForVal  A function that returns the object ID (vref) for a given object, if any.
 *   their corresponding export IDs
 * @param { (slot: string) => Object} requiredValForSlot  A function that converts an object ID (vref) to an
 *   object.
 * @param {*} registerEntry  Function to register a new slot+value in liveSlot's
 *   various tables
 * @param {*} serialize  Serializer for this vat
 * @param {*} unserialize  Unserializer for this vat
 * @param {number} cacheSize How many virtual objects this manager should cache
 *   in memory.
 * @param {*} FinalizationRegistry  Powerful JavaScript intrinsic normally denied by SES
 * @param {*} addToPossiblyDeadSet  Function to record objects whose deaths should be reinvestigated
 * @param {*} addToPossiblyRetiredSet Function to record dead objects whose retirement should be
 *   reinvestigated
 *
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
 * - `makeVirtualScalarWeakMap` creates an instance of WeakStore that can be keyed by these
 *    virtual objects.
 *
 * - `flushCache` will empty the object manager's cache of in-memory object
 *    instances, writing any changed state to the persistent store.  This
 *    provided for testing; it otherwise has little use.
 *
 * - `makeVirtualObjectRepresentative` will provide a useeable, in-memory
 *    version of a virtual object, given its vat slot ID.  This is used when
 *    deserializing a reference to an object that has been received in a message
 *    or is part of the persistent state of another virtual object that is being
 *    swapped in from storage.
 *
 * `makeKind` and `makeVirtualScalarWeakMap` are made available to user vat code as
 * globals.  The other two methods are for internal use by liveslots.
 */
export function makeVirtualObjectManager(
  syscall,
  allocateExportID,
  getSlotForVal,
  requiredValForSlot,
  registerEntry,
  serialize,
  unserialize,
  cacheSize,
  FinalizationRegistry,
  addToPossiblyDeadSet,
  addToPossiblyRetiredSet,
) {
  const droppedCollectionRegistry = new FinalizationRegistry(
    finalizeDroppedCollection,
  );

  /**
   * Fetch an object's state from secondary storage.
   *
   * @param {string} vobjID  The virtual object ID of the object whose state is
   *    being fetched.
   * @returns {*} an object representing the object's stored state.
   */
  function fetch(vobjID) {
    return JSON.parse(syscall.vatstoreGet(`vom.${vobjID}`));
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

  /**
   * Check if a virtual object is truly dead - i.e., unreachable - and truly
   * delete it if so.
   *
   * A virtual object is kept alive by being reachable by any of three legs:
   *  - any in-memory references to it (if so, it will have a representative and
   *    thus a non-null slot-to-val entry)
   *  - any virtual references to it (if so, it will have a refcount > 0)
   *  - being exported (if so, its export flag will be set)
   *
   * This function is called after a leg has been reported missing, and only
   * if the memory (Representative) leg is currently missing, to see if the
   * other two legs are now gone also.
   *
   * Deletion consists of removing the vatstore entries that describe its state
   * and track its refcount status.  In addition, when a virtual object is
   * deleted, we delete any weak collection entries for which it was a key. If
   * it had been exported, we also inform the kernel that the vref has been
   * retired, so other vats can delete their weak collection entries too.
   *
   * @param {string} vobjID  The vref of the virtual object that's plausibly dead
   *
   * @returns {[boolean, boolean]} A pair of flags: the first is true if this
   *    possibly created a new GC opportunity, the second is true if the object
   *    should now be regarded as unrecognizable
   */
  function possibleVirtualObjectDeath(vobjID) {
    const refCount = getRefCount(vobjID);
    const exportStatus = getExportStatus(vobjID);
    if (exportStatus !== 'reachable' && refCount === 0) {
      const rawState = fetch(vobjID);
      let doMoreGC = false;
      for (const propValue of Object.values(rawState)) {
        propValue.slots.map(
          vref => (doMoreGC = doMoreGC || removeReachableVref(vref)),
        );
      }
      syscall.vatstoreDelete(`vom.${vobjID}`);
      syscall.vatstoreDelete(`vom.rc.${vobjID}`);
      syscall.vatstoreDelete(`vom.es.${vobjID}`);
      doMoreGC = doMoreGC || ceaseRecognition(vobjID);
      return [doMoreGC, exportStatus !== 'none'];
    }
    return [false, false];
  }

  function getRefCount(vobjID) {
    const raw = syscall.vatstoreGet(`vom.rc.${vobjID}`);
    if (raw) {
      return Number(raw);
    } else {
      return 0;
    }
  }

  function getExportStatus(vobjID) {
    const raw = syscall.vatstoreGet(`vom.es.${vobjID}`);
    switch (raw) {
      case '0':
        return 'recognizable';
      case '1':
        return 'reachable';
      default:
        return 'none';
    }
  }

  function setRefCount(vobjID, refCount) {
    const { virtual } = parseVatSlot(vobjID);
    syscall.vatstoreSet(`vom.rc.${vobjID}`, `${Nat(refCount)}`);
    if (refCount === 0) {
      if (!virtual) {
        syscall.vatstoreDelete(`vom.rc.${vobjID}`);
      }
      addToPossiblyDeadSet(vobjID);
    }
  }

  function setExportStatus(vobjID, exportStatus) {
    const key = `vom.es.${vobjID}`;
    switch (exportStatus) {
      // POSSIBLE TODO: An anticipated refactoring may merge
      // dispatch.dropExports with dispatch.retireExports. If this happens, and
      // the export status can drop from 'reachable' to 'none' in a single step, we
      // must perform this "the export pillar has dropped" check in both the
      // reachable and the none cases (possibly reading the old status first, if
      // we must ensure addToPossiblyDeadSet only happens once).
      case 'recognizable': {
        syscall.vatstoreSet(key, '0');
        const refCount = getRefCount(vobjID);
        if (refCount === 0) {
          addToPossiblyDeadSet(vobjID);
        }
        break;
      }
      case 'reachable':
        syscall.vatstoreSet(key, '1');
        break;
      case 'none':
        syscall.vatstoreDelete(key);
        break;
      default:
        assert.fail(`invalid set export status ${exportStatus}`);
    }
  }

  function incRefCount(vobjID) {
    const oldRefCount = getRefCount(vobjID);
    setRefCount(vobjID, oldRefCount + 1);
  }

  function decRefCount(vobjID) {
    const oldRefCount = getRefCount(vobjID);
    assert(oldRefCount > 0, `attempt to decref ${vobjID} below 0`);
    setRefCount(vobjID, oldRefCount - 1);
  }

  const cache = makeCache(cacheSize, fetch, store);

  /**
   * Map from virtual object kind IDs to reanimator functions for the
   * corresponding kinds of virtual objects.
   */
  const kindTable = new Map();

  /**
   * Map of all Remotables which are reachable by our virtualized data, e.g.
   * `makeWeakStore().set(key, remotable)` or `virtualObject.state.foo =
   * remotable`. The serialization process stores the Remotable's vref to disk,
   * but doesn't actually retain the Remotable. To correctly unserialize that
   * offline data later, we must ensure the Remotable remains alive. This Map
   * keeps a strong reference to the Remotable along with its (virtual) refcount.
   */
  /** @type {Map<Object, number>} Remotable->refcount */
  const remotableRefCounts = new Map();

  // Note that since presence refCounts are keyed by vref, `processDeadSet` must
  // query the refCount directly in order to determine if a presence that found
  // its way into the dead set is live or not, whereas it never needs to query
  // the `remotableRefCounts` map because that map holds actual live references
  // as keys and so Remotable references will only find their way into the dead
  // set if they are actually unreferenced (including, notably, their absence
  // from the `remotableRefCounts` map).

  function addReachableVref(vref) {
    const { type, virtual, allocatedByVat } = parseVatSlot(vref);
    if (type === 'object') {
      if (allocatedByVat) {
        if (virtual) {
          incRefCount(vref);
        } else {
          // exported non-virtual object: Remotable
          const remotable = requiredValForSlot(vref);
          if (remotableRefCounts.has(remotable)) {
            /** @type {number} */
            const oldRefCount = (remotableRefCounts.get(remotable));
            remotableRefCounts.set(remotable, oldRefCount + 1);
          } else {
            remotableRefCounts.set(remotable, 1);
          }
        }
      } else {
        // We refcount imports, to preserve their vrefs against
        // syscall.dropImport when the Presence itself goes away.
        incRefCount(vref);
      }
    }
  }

  function removeReachableVref(vref) {
    let droppedMemoryReference = false;
    const { type, virtual, allocatedByVat } = parseVatSlot(vref);
    if (type === 'object') {
      if (allocatedByVat) {
        if (virtual) {
          decRefCount(vref);
        } else {
          // exported non-virtual object: Remotable
          const remotable = requiredValForSlot(vref);
          /** @type {number} */
          const oldRefCount = (remotableRefCounts.get(remotable));
          assert(oldRefCount > 0, `attempt to decref ${vref} below 0`);
          if (oldRefCount === 1) {
            remotableRefCounts.delete(remotable);
            droppedMemoryReference = true;
          } else {
            remotableRefCounts.set(remotable, oldRefCount - 1);
          }
        }
      } else {
        decRefCount(vref);
      }
    }
    return droppedMemoryReference;
  }

  function updateReferenceCounts(beforeSlots, afterSlots) {
    // Note that the slots of a capdata object are not required to be
    // deduplicated nor are they expected to be presented in any particular
    // order, so the comparison of which references appear in the before state
    // to which appear in the after state must look only at the presence or
    // absence of individual elements from the slots arrays and pay no attention
    // to the organization of the slots arrays themselves.
    const vrefStatus = {};
    for (const vref of beforeSlots) {
      vrefStatus[vref] = 'drop';
    }
    for (const vref of afterSlots) {
      if (vrefStatus[vref] === 'drop') {
        vrefStatus[vref] = 'keep';
      } else if (!vrefStatus[vref]) {
        vrefStatus[vref] = 'add';
      }
    }
    for (const [vref, status] of Object.entries(vrefStatus)) {
      switch (status) {
        case 'add':
          addReachableVref(vref);
          break;
        case 'drop':
          removeReachableVref(vref);
          break;
        default:
          break;
      }
    }
  }

  /**
   * Check if a given vref points to a reachable presence.
   *
   * @param {string} vref  The vref of the presence being enquired about
   *
   * @returns {boolean} true if the indicated presence remains reachable.
   */
  function isPresenceReachable(vref) {
    return !!getRefCount(vref);
  }

  /**
   * A map from vrefs (those which are recognizable by (i.e., used as keys in)
   * VOM aware collections) to sets of recognizers (the collections for which
   * they are respectively used as keys).  These vrefs correspond to either
   * imported Presences or virtual objects (Remotables do not participate in
   * this as they are not keyed by vref but by the actual Remotable objects
   * themselves). We add to a vref's recognizer set whenever we use a Presence
   * or virtual object as a key into a makeVirtualScalarWeakMap() instance or an
   * instance of VirtualObjectAwareWeakMap or VirtualObjectAwareWeakSet.  We
   * remove it whenever that key (or the whole collection containing it) is
   * deleted.
   *
   * A recognizer is one of:
   *   Map - the map contained within a VirtualObjectAwareWeakMap to point to its vref-keyed entries.
   *   Set - the set contained within a VirtualObjectAwareWeakSet to point to its vref-keyed entries.
   *   deleter - a function within a WeakStore that can be called to remove an entry from that store.
   *
   * It is critical that each collection have exactly one recognizer that is
   * unique to that collection, because the recognizers themselves will be
   * tracked by their object identities, but the recognizer cannot be the
   * collection itself else it would prevent the collection from being garbage
   * collected.
   *
   * TODO: all the "recognizers" in principle could be, and probably should be,
   * reduced to deleter functions.  However, since the VirtualObjectAware
   * collections are actual JavaScript classes I need to take some care to
   * ensure that I've got the exactly-one-per-collection invariant handled
   * correctly.
   *
   * TODO: concoct a better type def than Set<any>
   */
  /**
   * @typedef { Map<string, *> | Set<string> | ((string) => void) } Recognizer
   */
  /** @type {Map<string, Set<Recognizer>>} */
  const vrefRecognizers = new Map();

  function addRecognizableValue(value, recognizer) {
    const vref = getSlotForVal(value);
    if (vref) {
      const { type, allocatedByVat, virtual } = parseVatSlot(vref);
      if (type === 'object' && (!allocatedByVat || virtual)) {
        let recognizerSet = vrefRecognizers.get(vref);
        if (!recognizerSet) {
          recognizerSet = new Set();
          vrefRecognizers.set(vref, recognizerSet);
        }
        recognizerSet.add(recognizer);
      }
    }
  }

  function removeRecognizableVref(vref, recognizer) {
    const { type, allocatedByVat, virtual } = parseVatSlot(vref);
    if (type === 'object' && (!allocatedByVat || virtual)) {
      const recognizerSet = vrefRecognizers.get(vref);
      assert(recognizerSet && recognizerSet.has(recognizer));
      recognizerSet.delete(recognizer);
      if (recognizerSet.size === 0) {
        vrefRecognizers.delete(vref);
        if (!allocatedByVat) {
          addToPossiblyRetiredSet(vref);
        }
      }
    }
  }

  function removeRecognizableValue(value, recognizer) {
    const vref = getSlotForVal(value);
    if (vref) {
      removeRecognizableVref(vref, recognizer);
    }
  }

  /**
   * Remove a given vref from all weak collections in which it was used as a
   * key.
   *
   * @param {string} vref  The vref that shall henceforth no longer be recognized
   *
   * @returns {boolean} true if this possibly creates a GC opportunity
   */
  function ceaseRecognition(vref) {
    const recognizerSet = vrefRecognizers.get(vref);
    let doMoreGC = false;
    if (recognizerSet) {
      vrefRecognizers.delete(vref);
      for (const recognizer of recognizerSet) {
        if (recognizer instanceof Map) {
          recognizer.delete(vref);
          doMoreGC = true;
        } else if (recognizer instanceof Set) {
          recognizer.delete(vref);
        } else if (typeof recognizer === 'function') {
          recognizer(vref);
        }
      }
    }
    return doMoreGC;
  }

  function isVrefRecognizable(vref) {
    return vrefRecognizers.has(vref);
  }

  /**
   * Produce a representative given a virtual object ID.  Used for
   * deserializing.
   *
   * @param {string} vobjID  The virtual object ID of the object being dereferenced
   * @param {boolean} proForma  If true, representative creation is for formal
   *   use only and result will be ignored.
   *
   * @returns {Object}  A representative of the object identified by `vobjID`
   */
  function makeVirtualObjectRepresentative(vobjID, proForma) {
    const { id } = parseVatSlot(vobjID);
    const kindID = `${id}`;
    const reanimator = kindTable.get(kindID);
    if (reanimator) {
      return reanimator(vobjID, proForma);
    } else {
      assert.fail(X`unknown kind ${kindID}`);
    }
  }

  let nextWeakStoreID = 1;

  /**
   * This is essentially a copy of makeVirtualScalarWeakMap from the @agoric/store package,
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
  function makeVirtualScalarWeakMap(keyName = 'key') {
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
      const vobjID = getSlotForVal(key);
      if (vobjID) {
        const { type, virtual, allocatedByVat } = parseVatSlot(vobjID);
        if (type === 'object' && (virtual || !allocatedByVat)) {
          return `vom.ws${storeID}.${vobjID}`;
        }
      }
      return undefined;
    }

    function deleter(vobjID) {
      syscall.vatstoreDelete(`vom.ws${storeID}.${vobjID}`);
    }

    const result = harden({
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
          addRecognizableValue(key, deleter);
          const data = serialize(value);
          data.slots.map(addReachableVref);
          syscall.vatstoreSet(vkey, JSON.stringify(data));
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
          return unserialize(JSON.parse(rawValue));
        } else {
          assertKeyExists(key);
          return backingMap.get(key);
        }
      },
      set(key, value) {
        const vkey = virtualObjectKey(key);
        if (vkey) {
          const rawBefore = syscall.vatstoreGet(vkey);
          assert(rawBefore, X`${q(keyName)} not found: ${key}`);
          const before = JSON.parse(rawBefore);
          const after = serialize(harden(value));
          updateReferenceCounts(before.slots, after.slots);
          syscall.vatstoreSet(vkey, JSON.stringify(after));
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
          removeRecognizableValue(key, deleter);
        } else {
          assertKeyExists(key);
          backingMap.delete(key);
        }
      },
      addAll: entries => {
        for (const [key, value] of entries) {
          if (result.has(key)) {
            result.set(key, value);
          } else {
            result.init(key, value);
          }
        }
      },
    });
    droppedCollectionRegistry.register(
      result,
      {
        storeKey: `vom.ws${storeID}`,
        deleter,
      },
      result,
    );
    return result;
  }

  function finalizeDroppedCollection(body) {
    if (body instanceof Map) {
      for (const vref of body.keys()) {
        removeRecognizableVref(vref, body);
      }
    } else if (body instanceof Set) {
      for (const vref of body.values()) {
        removeRecognizableVref(vref, body);
      }
    } else if (typeof body === 'object') {
      // XXX oops, need to iterate vatstore keys and the API doesn't support that
      console.log(`can't finalize WeakStore ${body} yet`);
    }
  }

  function vrefKey(value) {
    const vobjID = getSlotForVal(value);
    if (vobjID) {
      const { type, virtual, allocatedByVat } = parseVatSlot(vobjID);
      if (type === 'object' && (virtual || !allocatedByVat)) {
        return vobjID;
      }
    }
    return undefined;
  }

  /* eslint max-classes-per-file: ["error", 2] */

  const actualWeakMaps = new WeakMap();
  const virtualObjectMaps = new WeakMap();

  class VirtualObjectAwareWeakMap {
    constructor() {
      actualWeakMaps.set(this, new WeakMap());
      const vmap = new Map();
      virtualObjectMaps.set(this, vmap);
      droppedCollectionRegistry.register(this, vmap, this);
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
        const vmap = virtualObjectMaps.get(this);
        if (!vmap.has(vkey)) {
          addRecognizableValue(key, vmap);
        }
        vmap.set(vkey, value);
      } else {
        actualWeakMaps.get(this).set(key, value);
      }
      return this;
    }

    delete(key) {
      const vkey = vrefKey(key);
      if (vkey) {
        const vmap = virtualObjectMaps.get(this);
        if (vmap.has(vkey)) {
          removeRecognizableValue(key, vmap);
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

  class VirtualObjectAwareWeakSet {
    constructor() {
      actualWeakSets.set(this, new WeakSet());
      const vset = new Set();
      virtualObjectSets.set(this, vset);
      droppedCollectionRegistry.register(this, vset, this);
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
        const vset = virtualObjectSets.get(this);
        if (!vset.has(value)) {
          addRecognizableValue(value, vset);
          vset.add(vkey);
        }
      } else {
        actualWeakSets.get(this).add(value);
      }
      return this;
    }

    delete(value) {
      const vkey = vrefKey(value);
      if (vkey) {
        const vset = virtualObjectSets.get(this);
        if (vset.has(vkey)) {
          removeRecognizableValue(value, vset);
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
  function makeKind(instanceKitMaker) {
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
              return unserialize(innerSelf.rawData[prop]);
            },
            set: value => {
              ensureState();
              const before = innerSelf.rawData[prop];
              const after = serialize(value);
              updateReferenceCounts(before.slots, after.slots);
              innerSelf.rawData[prop] = after;
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

    function reanimate(vobjID, proForma) {
      // kdebug(`vo reanimate ${vobjID}`);
      const innerSelf = cache.lookup(vobjID, false);
      const representative = makeRepresentative(innerSelf, false, proForma)
        .self;
      if (proForma) {
        return null;
      } else {
        innerSelf.representative = representative;
        return representative;
      }
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
        makeRepresentative(innerSelf, true, false);
      if (init) {
        init(...args);
      }
      innerSelf.representative = initialRepresentative;
      assert(
        getInterfaceOf(initialRepresentative),
        `self must be declared Far`,
      );
      registerEntry(vobjID, initialRepresentative);
      initializationsInProgress.delete(initialData);
      const rawData = {};
      for (const prop of Object.getOwnPropertyNames(initialData)) {
        try {
          const data = serialize(initialData[prop]);
          data.slots.map(addReachableVref);
          rawData[prop] = data;
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

  function countCollectionsForWeakKey(vref) {
    const recognizerSet = vrefRecognizers.get(vref);
    return recognizerSet ? recognizerSet.size : 0;
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
    countCollectionsForWeakKey,
    countWeakKeysForCollection,
  };

  return harden({
    makeVirtualScalarWeakMap,
    makeKind,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    isPresenceReachable,
    isVrefRecognizable,
    setExportStatus,
    flushCache: cache.flush,
    makeVirtualObjectRepresentative,
    possibleVirtualObjectDeath,
    ceaseRecognition,
    testHooks,
  });
}
