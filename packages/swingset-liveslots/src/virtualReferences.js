/* eslint-disable no-use-before-define, jsdoc/require-returns-type */

import { assert, Fail } from '@endo/errors';
import { Nat } from '@endo/nat';
import { parseVatSlot } from './parseVatSlots.js';
import {
  enumerateKeysWithPrefix,
  prefixedKeysExist,
} from './vatstore-iterators.js';

/**
 * @param {*} syscall  Vat's syscall object, used to access the vatstore operations.
 * @param {(val: object) => string | undefined} getSlotForVal  A function that returns the
 *   object ID (vref) for a given object, if any.  their corresponding export
 *   IDs
 * @param {(slot: string) => object} requiredValForSlot  A function that
 *   converts an object ID (vref) to an object.
 * @param {*} FinalizationRegistry  Powerful JavaScript intrinsic normally denied
 *   by SES
 * @param {*} WeakRef  Powerful JavaScript intrinsic normally denied
 *   by SES
 * @param {*} addToPossiblyDeadSet  Function to record objects whose deaths
 *   should be reinvestigated
 * @param {*} addToPossiblyRetiredSet  Function to record dead objects whose
 *   retirement should be reinvestigated
 * @param {boolean} relaxDurabilityRules True IFF the associated swingset is
 *   running with relaxed durability rules
 */
export function makeVirtualReferenceManager(
  syscall,
  getSlotForVal,
  requiredValForSlot,
  FinalizationRegistry,
  WeakRef,
  addToPossiblyDeadSet,
  addToPossiblyRetiredSet,
  relaxDurabilityRules,
) {
  const droppedCollectionRegistry = new FinalizationRegistry(
    finalizeDroppedCollection,
  );
  // Our JS engine is configured to treat WeakRefs as strong during
  // organic (non-forced GC), to minimize execution variation. To
  // prevent FinalizationRegistry callbacks from varying this way, we
  // must maintain WeakRefs to everything therein. The WeakRef is
  // retained by the FR "heldValue" context record, next to the
  // descriptor, and is thus released when the FR fires.

  function registerDroppedCollection(target, descriptor) {
    const wr = new WeakRef(target);
    droppedCollectionRegistry.register(target, { descriptor, wr });
  }

  /**
   * Check if a virtual object is unreachable via virtual-data references.
   *
   * A virtual object is kept alive if it or any of its facets are reachable by
   * any of three legs:
   *  - in-memory references (if so, it will have a representative and thus a
   *    non-null slot-to-val entry)
   *  - virtual references (if so, it will have a refcount > 0)
   *  - being exported (if so, its export flag will be set)
   *
   * This function is called after a leg has been reported missing,
   * and reports back on whether the virtual-reference and
   * export-status legs remain. The caller (liveslots
   * scanForDeadObjects) will combine this with information about the
   * RAM leg to decide whether the object is completely unreachable,
   * and thus should be deleted.
   *
   * @param {string} baseRef  The virtual object cohort might be dead
   *
   * @returns {boolean} True if the object remains referenced, false if unreachable
   */
  function isVirtualObjectReachable(baseRef) {
    const refCount = getRefCount(baseRef);
    const [reachable, _retirees] = getExportStatus(baseRef);
    return !!(reachable || refCount);
  }

  /**
   * Delete a virtual object
   *
   * Once the caller determines that all three legs are gone, they
   * call us to delete the object.
   *
   * Deletion consists of removing the vatstore entries that describe its state
   * and track its refcount status.  In addition, when a virtual object is
   * deleted, we delete any weak collection entries for which it was a key. If
   * it had been exported, we also inform the kernel that the vref has been
   * retired, so other vats can delete their weak collection entries too.
   *
   * @param {string} baseRef  The virtual object cohort that's certainly dead
   *
   * @returns {[boolean, string[]]} A pair of a flag that's true if this
   *    possibly created a new GC opportunity and an array of vrefs that should
   *    now be regarded as unrecognizable
   */
  function deleteVirtualObject(baseRef) {
    const refCount = getRefCount(baseRef);
    const [reachable, retirees] = getExportStatus(baseRef);
    assert(!reachable);
    assert(!refCount);
    let doMoreGC = deleteStoredRepresentation(baseRef);
    syscall.vatstoreDelete(`vom.rc.${baseRef}`);
    syscall.vatstoreDelete(`vom.es.${baseRef}`);
    doMoreGC = ceaseRecognition(baseRef) || doMoreGC;
    return [doMoreGC, retirees];
  }

  /**
   * Get information about the export status of a virtual object.
   *
   * @param {string} baseRef  The baseRef of the virtual object of interest.
   *
   * @returns {[boolean, string[]]} A pair of a flag that's true if the
   *     indicated virtual object is reachable and an array of vrefs (to facets
   *     of the object) that should now be regarded as unrecognizable
   */
  function getExportStatus(baseRef) {
    const es = syscall.vatstoreGet(`vom.es.${baseRef}`);
    if (es) {
      const reachable = es.indexOf('r') >= 0;
      const retirees = [];
      if (!reachable) {
        if (es === 's') {
          // unfaceted
          retirees.push(baseRef);
        } else {
          // faceted
          for (let i = 0; i < es.length; i += 1) {
            if (es[i] === 's') {
              retirees.push(`${baseRef}:${i}`);
            }
          }
        }
      }
      return [reachable, retirees];
    } else {
      return [false, []];
    }
  }

  function getRefCount(baseRef) {
    const raw = syscall.vatstoreGet(`vom.rc.${baseRef}`);
    if (raw) {
      return Number(raw);
    } else {
      return 0;
    }
  }

  function setRefCount(baseRef, refCount) {
    const { facet } = parseVatSlot(baseRef);
    !facet || Fail`setRefCount ${baseRef} should not receive individual facets`;
    if (refCount === 0) {
      syscall.vatstoreDelete(`vom.rc.${baseRef}`);
      addToPossiblyDeadSet(baseRef);
    } else {
      syscall.vatstoreSet(`vom.rc.${baseRef}`, `${Nat(refCount)}`);
    }
  }

  function setExportStatus(vref, exportStatus) {
    const { baseRef, id, facet } = parseVatSlot(vref);
    const key = `vom.es.${baseRef}`;
    const esRaw = syscall.vatstoreGet(key);
    // 'esRaw' may be undefined (nothing is currently exported), and
    // it might be short (saved by a previous version that had fewer
    // facets). Pad it out to the current length, which is '1' for
    // unfaceted Kinds
    const es = Array.from((esRaw || '').padEnd(getFacetCount(id), 'n'));
    const facetIdx = facet === undefined ? 0 : facet;
    // The export status of each facet is encoded as:
    // 's' -> 'recognizable' ('s' for "see"), 'r' -> 'reachable', 'n' -> 'none'
    switch (exportStatus) {
      // POSSIBLE TODO: An anticipated refactoring may merge
      // dispatch.dropExports with dispatch.retireExports. If this happens, and
      // the export status can drop from 'reachable' to 'none' in a single step, we
      // must perform this "the export pillar has dropped" check in both the
      // reachable and the none cases (possibly reading the old status first, if
      // we must ensure addToPossiblyDeadSet only happens once).
      case 'recognizable': {
        es[facetIdx] = 's';
        syscall.vatstoreSet(key, es.join(''));
        const refCount = getRefCount(baseRef);
        if (refCount === 0 && es.indexOf('r') < 0) {
          addToPossiblyDeadSet(baseRef);
        }
        break;
      }
      case 'reachable':
        es[facetIdx] = 'r';
        syscall.vatstoreSet(key, es.join(''));
        break;
      case 'none':
        es[facetIdx] = 'n';
        if (es.indexOf('r') < 0 && es.indexOf('s') < 0) {
          syscall.vatstoreDelete(key);
        } else {
          syscall.vatstoreSet(key, es.join(''));
        }
        break;
      default:
        Fail`invalid set export status ${exportStatus}`;
    }
  }

  function incRefCount(baseRef) {
    const oldRefCount = getRefCount(baseRef);
    setRefCount(baseRef, oldRefCount + 1);
  }

  function decRefCount(baseRef) {
    const oldRefCount = getRefCount(baseRef);
    oldRefCount > 0 || Fail`attempt to decref ${baseRef} below 0`;
    setRefCount(baseRef, oldRefCount - 1);
  }

  /**
   * Map from virtual object kind IDs to information about those kinds,
   * including functions for handling the persistent representations of the
   * corresponding kinds of objects.
   */
  const kindInfoTable = new Map();

  /**
   * Register information describing a persistent object kind.
   *
   * @param {string} kindID  The kind of persistent object being handle
   * @param {(string, boolean) => object} [reanimator]  Reanimator function for the given kind.
   * @param {(string) => boolean} [deleter]  Deleter function for the given kind.
   * @param {boolean} [durable]  Flag indicating if instances survive vat termination
   */
  function registerKind(kindID, reanimator, deleter, durable) {
    kindInfoTable.set(`${kindID}`, { reanimator, deleter, durable });
  }

  /**
   * Record the names of the facets of a multi-faceted virtual object.
   *
   * @param {string} kindID  The kind we're talking about
   * @param {string[]|null} facetNames  A sorted array of facet names to be
   *    recorded, or null if the kind is unfaceted
   */
  function rememberFacetNames(kindID, facetNames) {
    const kindInfo = kindInfoTable.get(`${kindID}`);
    kindInfo || Fail`no kind info for ${kindID}`;
    assert(kindInfo.facetNames === undefined);
    kindInfo.facetNames = facetNames;
  }

  function getFacetNames(kindID) {
    return kindInfoTable.get(`${kindID}`).facetNames;
  }

  function getFacetCount(kindID) {
    const facetNames = getFacetNames(kindID);
    return facetNames ? facetNames.length : 1;
  }

  function getFacet(kindID, facets, facetIndex) {
    const facetName = getFacetNames(kindID)[facetIndex];
    facetName !== undefined || // allow empty-string -named facets
      Fail`getFacet missing, ${kindID} [${facetIndex}]`;
    const facet = facets[facetName];
    facet || Fail`getFacet missing, ${kindID} [${facetIndex}] ${facetName}`;
    return facet;
  }

  /**
   * Inquire if a given persistent object kind is a durable kind or not.
   *
   * @param {string} kindID  The kind of interest
   *
   * @returns {boolean}  true if the indicated kind is durable.
   */
  function isDurableKind(kindID) {
    const { durable } = kindInfoTable.get(`${kindID}`);
    return durable;
  }

  /**
   * Inquire if a given vref is something that can be stored in a durable store
   * or virtual object.
   *
   * @param {string} vref  The vref of interest
   *
   * @returns {boolean}  true if the indicated object reference is durable.
   */
  function isDurable(vref) {
    const { type, id, virtual, durable, allocatedByVat } = parseVatSlot(vref);
    if (type === 'promise') {
      // promises are not durable even if `relaxDurabilityRules === true`
      return false;
    } else if (relaxDurabilityRules) {
      // we'll pretend an object is durable if running with relaxed rules
      return true;
    } else if (type === 'device') {
      // devices are durable
      return true;
    } else if (type !== 'object') {
      // promises are not durable
      return false;
    } else if (!allocatedByVat) {
      // imports are durable
      return true;
    } else if (virtual || durable) {
      // stores and virtual objects are durable if their kinds are so configured
      return isDurableKind(id);
    } else {
      // otherwise it's not durable
      return false;
    }
  }

  /**
   * Create an in-memory representation of a given object by reanimating it from
   * persistent storage.  Used for deserializing.
   *
   * @param {string} baseRef  The baseRef of the object being reanimated
   *
   * @returns A representative of the object identified by `baseRef`
   */
  function reanimate(baseRef) {
    const { id } = parseVatSlot(baseRef);
    const kindID = `${id}`;
    const kindInfo = kindInfoTable.get(kindID);
    kindInfo ||
      Fail`no kind info for ${kindID} (${baseRef}); check deserialize preceding kind definitions`;
    const { reanimator } = kindInfo;
    if (reanimator) {
      return reanimator(baseRef);
    } else {
      throw Fail`unknown kind ${kindID}`;
    }
  }

  /**
   * Delete the persistent representation of a virtual object given its ID
   *
   * @param {string} vobjID  The virtual object ID of the object to be expunged
   */
  function deleteStoredRepresentation(vobjID) {
    const { id } = parseVatSlot(vobjID);
    const kindID = `${id}`;
    const { deleter } = kindInfoTable.get(kindID);
    if (deleter) {
      return deleter(vobjID);
    } else {
      throw Fail`unknown kind ${kindID}`;
    }
  }

  /**
   * Map of all Remotables which are reachable by our virtualized data, e.g.
   * `makeScalarWeakMapStore().set(key, remotable)` or `virtualObject.state.foo =
   * remotable`. The serialization process stores the Remotable's vref to disk,
   * but doesn't actually retain the Remotable. To correctly unserialize that
   * offline data later, we must ensure the Remotable remains alive. This Map
   * keeps a strong reference to the Remotable along with its (virtual) refcount.
   */
  /** @type {Map<object, number>} Remotable->refcount */
  const remotableRefCounts = new Map();

  // Note that since presence refCounts are keyed by vref, `processDeadSet` must
  // query the refCount directly in order to determine if a presence that found
  // its way into the dead set is live or not, whereas it never needs to query
  // the `remotableRefCounts` map because that map holds actual live references
  // as keys and so Remotable references will only find their way into the dead
  // set if they are actually unreferenced (including, notably, their absence
  // from the `remotableRefCounts` map).

  function addReachableVref(vref) {
    const { type, virtual, durable, allocatedByVat, baseRef } =
      parseVatSlot(vref);
    if (type === 'object') {
      if (allocatedByVat) {
        if (virtual || durable) {
          incRefCount(baseRef);
        } else {
          // exported non-virtual object: Remotable
          const remotable = requiredValForSlot(vref);
          const oldRefCount = remotableRefCounts.get(remotable) || 0;
          remotableRefCounts.set(remotable, oldRefCount + 1);
        }
      } else {
        // We refcount imports, to preserve their vrefs against
        // syscall.dropImport when the Presence itself goes away.
        incRefCount(baseRef);
      }
    } else if (type === 'promise') {
      // need to track promises too, maybe in remotableRefCounts
      const p = requiredValForSlot(vref);
      const oldRefCount = remotableRefCounts.get(p) || 0;
      remotableRefCounts.set(p, oldRefCount + 1);
    }
  }

  function removeReachableVref(vref) {
    let droppedMemoryReference = false;
    const { type, virtual, durable, allocatedByVat, baseRef } =
      parseVatSlot(vref);
    if (type === 'object') {
      if (allocatedByVat) {
        if (virtual || durable) {
          decRefCount(baseRef);
        } else {
          // exported non-virtual object: Remotable
          const remotable = requiredValForSlot(vref);
          const oldRefCount = remotableRefCounts.get(remotable) || 0;
          oldRefCount > 0 || Fail`attempt to decref ${vref} below 0`;
          if (oldRefCount === 1) {
            remotableRefCounts.delete(remotable);
            droppedMemoryReference = true;
          } else {
            remotableRefCounts.set(remotable, oldRefCount - 1);
          }
        }
      } else {
        decRefCount(baseRef);
      }
    } else if (type === 'promise') {
      const p = requiredValForSlot(vref);
      const oldRefCount = remotableRefCounts.get(p) || 0;
      oldRefCount > 0 || Fail`attempt to decref ${vref} below 0`;
      if (oldRefCount === 1) {
        remotableRefCounts.delete(p);
        droppedMemoryReference = true; // true for promises too
      } else {
        remotableRefCounts.set(p, oldRefCount - 1);
      }
    }
    return droppedMemoryReference;
  }

  function getReachablePromiseRefCount(p) {
    return remotableRefCounts.get(p) || 0;
  }

  // for testing only
  function getReachableRefCount(vref) {
    const { type, virtual, durable, allocatedByVat, baseRef } =
      parseVatSlot(vref);
    assert(type === 'object');
    if (allocatedByVat) {
      if (virtual || durable) {
        return getRefCount(baseRef);
      } else {
        const remotable = requiredValForSlot(baseRef);
        return remotableRefCounts.get(remotable);
      }
    } else {
      return getRefCount(baseRef);
    }
  }

  function updateReferenceCounts(beforeSlots, afterSlots) {
    // Note that the slots of a capdata object are not required to be
    // deduplicated nor are they expected to be presented in any particular
    // order, so the comparison of which references appear in the before state
    // to which appear in the after state must look only at the presence or
    // absence of individual elements from the slots arrays and pay no attention
    // to the organization of the slots arrays themselves.
    const vrefStatus = new Map();
    for (const vref of beforeSlots) {
      vrefStatus.set(vref, 'drop');
    }
    for (const vref of afterSlots) {
      if (vrefStatus.get(vref) === 'drop') {
        vrefStatus.set(vref, 'keep');
      } else if (!vrefStatus.has(vref)) {
        vrefStatus.set(vref, 'add');
      }
    }
    const keys = [...vrefStatus.keys()].sort();
    for (const vref of keys) {
      switch (vrefStatus.get(vref)) {
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
   * A vref is "recognizable" when it is used as the key of a weak
   * collection, like a virtual/durable WeakMapStore or WeakSetStore,
   * or the ephemeral voAwareWeakMap/Set that we impose upon userspace
   * as "WeakMap/WeakSet". The collection can be used to query whether
   * a future specimen matches the original or not, without holding
   * onto the original.
   *
   * We need "recognition records" to map from the vref to the
   * collection that can recognize it. When the vref is retired, we
   * use the record to find all the collections from which we need to
   * delete entries, so we can release the matching values. This might
   * happen because the vref was for a Presence and the kernel just
   * told us the upstream vat has deleted it (dispatch.retireImports),
   * or because it was for a locally-managed object (an ephemeral
   * Remotable or a virtual/durable Representative) and we decided to
   * delete it.
   *
   * The virtual/durable collections track their "recognition records"
   * in the vatstore, in keys like "vom.ir.${vref}|${collectionID}".
   * These records do not contribute to our RAM usage.
   *
   * voAwareWeakMap and voAwareWeakSet store their recognition records
   * in RAM, using this Map named 'vrefRecognizers'. Each key is a
   * vref, and the value is a Set of recognizers. Each recognizer is
   * the internal 'virtualObjectMap' in which the collection maps from
   * vref to value. These in-RAM collections only use virtualObjectMap
   * to track Presence-style (imports) and Representative-style
   * (virtual/durable) vrefs: any Remotable-style keys are stored in
   * the collection's internal (real) WeakMap under the Remotable
   * object itself (because the engine handles the bookkeeping, and
   * there is no virtual data in the value that we need to clean up at
   * deletion time).
   *
   * Each voAwareWeakMap/Set must have a distinct recognizer, so we
   * can remove the key from the right ones. The recognizer is held
   * strongly by the recognition record, so it must not be the
   * voAwareWeakMap/Set itself (which would inhibit GC).
   *
   * When an individual entry is deleted from the weak collection, we
   * must also delete the recognition record. When the collection
   * itself is deleted (i.e. because nothing was referencing it), we
   * must both delete all recognition records and also notify the
   * kernel about any Presence-style vrefs that we can no longer
   * recognize (syscall.retireImports). The kernel doesn't care about
   * Remotable- or Representative- style vrefs, only the imports.
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
   * @typedef { Map<string, *> | Set<string> } Recognizer
   */
  /** @type {Map<string, Set<Recognizer>>} */
  const vrefRecognizers = new Map();

  /**
   * @param {*} value  The vref-bearing object used as the collection key
   * @param {string|Recognizer} recognizer  The collectionID or virtualObjectMap for the collection
   * @param {boolean} [recognizerIsVirtual]  true for virtual/durable Stores, false for voAwareWeakMap/Set
   */
  function addRecognizableValue(value, recognizer, recognizerIsVirtual) {
    const vref = getSlotForVal(value);
    if (vref) {
      const { type, allocatedByVat, virtual, durable } = parseVatSlot(vref);
      if (type === 'object') {
        // recognizerSet (voAwareWeakMap/Set) doesn't track Remotables
        const notRemotable = !allocatedByVat || virtual || durable;

        if (recognizerIsVirtual) {
          assert.typeof(recognizer, 'string');
          syscall.vatstoreSet(`vom.ir.${vref}|${recognizer}`, '1');
        } else if (notRemotable) {
          assert.typeof(recognizer, 'object');
          let recognizerSet = vrefRecognizers.get(vref);
          if (!recognizerSet) {
            recognizerSet = new Set();
            vrefRecognizers.set(vref, recognizerSet);
          }
          recognizerSet.add(recognizer);
        }
      }
    }
  }

  /**
   * @param {string} vref  The vref or the object used as the collection key
   * @param {string|Recognizer} recognizer  The collectionID or virtualObjectMap for the collection
   * @param {boolean} [recognizerIsVirtual]  true for virtual/durable Stores, false for voAwareWeakMap/Set
   */
  function removeRecognizableVref(vref, recognizer, recognizerIsVirtual) {
    const { type, allocatedByVat, virtual, durable } = parseVatSlot(vref);
    if (type === 'object') {
      // addToPossiblyDeadSet only needs Presence-style vrefs
      const isPresence = !allocatedByVat;
      // recognizerSet (voAwareWeakMap/Set) doesn't track Remotables
      const notRemotable = !allocatedByVat || virtual || durable;

      if (recognizerIsVirtual) {
        assert.typeof(recognizer, 'string');
        syscall.vatstoreDelete(`vom.ir.${vref}|${recognizer}`);
        if (isPresence) {
          addToPossiblyRetiredSet(vref);
        }
      } else if (notRemotable) {
        assert.typeof(recognizer, 'object');
        const recognizerSet = vrefRecognizers.get(vref);
        assert(recognizerSet && recognizerSet.has(recognizer));
        recognizerSet.delete(recognizer);
        if (recognizerSet.size === 0) {
          vrefRecognizers.delete(vref);
          if (isPresence) {
            addToPossiblyRetiredSet(vref);
          }
        }
      }
    }
  }

  /**
   * @param {*} value  The vref-bearing object used as the collection key
   * @param {string|Recognizer} recognizer  The collectionID or virtualObjectMap for the collection
   * @param {boolean} [recognizerIsVirtual]  true for virtual/durable Stores, false for voAwareWeakMap/Set
   */
  function removeRecognizableValue(value, recognizer, recognizerIsVirtual) {
    const vref = getSlotForVal(value);
    if (vref) {
      removeRecognizableVref(vref, recognizer, recognizerIsVirtual);
    }
  }

  let deleteCollectionEntry;
  function setDeleteCollectionEntry(fn) {
    deleteCollectionEntry = fn;
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
    let doMoreGC = false;
    const p = parseVatSlot(vref);
    if (p.allocatedByVat && (p.virtual || p.durable) && p.facet === undefined) {
      // If `vref` identifies a multi-faceted object that should no longer be
      // "recognized", what that really means that all references to its
      // individual facets should no longer be recognized -- nobody actually
      // references the object itself except internal data structures.  So in
      // this case we need individually to stop recognizing the facets
      // themselves.
      const kindInfo = kindInfoTable.get(`${p.id}`);
      // This function can be called either from `dispatch.retireImports` or
      // from `deleteVirtualObject`.  In the latter case the vref is
      // actually a baseRef and so needs to be expanded to cease recognition of
      // all the facets.
      if (kindInfo) {
        const { facetNames } = kindInfo;
        if (facetNames) {
          for (let i = 0; i < facetNames.length; i += 1) {
            doMoreGC = ceaseRecognition(`${vref}:${i}`) || doMoreGC;
          }
          return doMoreGC;
        }
      }
    }

    // remove from all voAwareWeakMap/Sets that knew about it
    const recognizerSet = vrefRecognizers.get(vref);
    if (recognizerSet) {
      vrefRecognizers.delete(vref);
      for (const recognizer of recognizerSet) {
        if (recognizer instanceof Map) {
          recognizer.delete(vref);
          doMoreGC = true;
        } else if (recognizer instanceof Set) {
          recognizer.delete(vref);
        } else {
          Fail`unknown recognizer type ${typeof recognizer}`;
        }
      }
    }

    // and from (weak) virtual collections that knew about it
    const prefix = `vom.ir.${vref}|`;
    for (const key of enumerateKeysWithPrefix(syscall, prefix)) {
      syscall.vatstoreDelete(key);
      const parts = key.split('|');
      doMoreGC = deleteCollectionEntry(parts[1], vref) || doMoreGC;
    }
    return doMoreGC;
  }

  function isVrefRecognizable(vref) {
    if (vrefRecognizers.has(vref)) {
      return true;
    } else {
      return prefixedKeysExist(syscall, `vom.ir.${vref}|`);
    }
  }

  function finalizeDroppedCollection({ descriptor }) {
    // the 'wr' WeakRef will be dropped about now
    //
    // note: technically, the engine is allowed to inspect this
    // callback, observe that 'wr' is not extracted, and then not
    // retain it in the first place (back in
    // registerDroppedCollection), but no engine goes that far
    descriptor.collectionDeleter(descriptor);
  }

  function vrefKey(value) {
    const vobjID = getSlotForVal(value);
    if (vobjID) {
      const { type, virtual, durable, allocatedByVat } = parseVatSlot(vobjID);
      if (type === 'object' && (virtual || durable || !allocatedByVat)) {
        return vobjID;
      }
    }
    return undefined;
  }

  function countCollectionsForWeakKey(vref) {
    const recognizerSet = vrefRecognizers.get(vref);
    let size = recognizerSet ? recognizerSet.size : 0;
    const prefix = `vom.ir.${vref}|`;
    // eslint-disable-next-line no-underscore-dangle
    for (const _key of enumerateKeysWithPrefix(syscall, prefix)) {
      size += 1;
    }
    return size;
  }

  /**
   * Counters to track the next number for various categories of allocation.
   * `exportID` starts at 1 because 'o+0' is always automatically
   * pre-assigned to the root object.
   * `promiseID` starts at 5 as a very minor aid to debugging: when puzzling
   * over trace logs and the like, it helps for the numbers in various species
   * of IDs that are jumbled together to be a little out of sync and thus a
   * little less similar to each other.
   */
  const initialIDCounters = { exportID: 1, collectionID: 1, promiseID: 5 };
  /** @type {Record<string, number>} */
  let idCounters;
  let idCountersAreDirty = false;

  function initializeIDCounters() {
    if (!idCounters) {
      // the saved value might be missing, or from an older liveslots
      // (with fewer counters), so merge it with our initial values
      const saved = JSON.parse(syscall.vatstoreGet('idCounters') || '{}');
      idCounters = { ...initialIDCounters, ...saved };
      idCountersAreDirty = true;
    }
  }

  function allocateNextID(name) {
    if (!idCounters) {
      // Normally `initializeIDCounters` would be called from startVat, but some
      // tests bypass that so this is a backstop.  Note that the invocation from
      // startVat is there to make vatStore access patterns a bit more
      // consistent from one vat to another, principally as a confusion
      // reduction measure in service of debugging; it is not a correctness
      // issue.
      initializeIDCounters();
    }
    const result = idCounters[name];
    result !== undefined || Fail`unknown idCounters[${name}]`;
    idCounters[name] += 1;
    idCountersAreDirty = true;
    return result;
  }

  function flushIDCounters() {
    if (idCountersAreDirty) {
      syscall.vatstoreSet('idCounters', JSON.stringify(idCounters));
      idCountersAreDirty = false;
    }
  }

  const testHooks = {
    getReachableRefCount,
    countCollectionsForWeakKey,

    // don't harden() the mock FR, that will break it
    getDroppedCollectionRegistry: () => droppedCollectionRegistry,
    remotableRefCounts,
    vrefRecognizers,
    kindInfoTable,
  };

  function getRetentionStats() {
    return {
      remotableRefCounts: remotableRefCounts.size,
      vrefRecognizers: vrefRecognizers.size,
      kindInfoTable: kindInfoTable.size,
    };
  }

  return harden({
    registerDroppedCollection,
    isDurable,
    isDurableKind,
    registerKind,
    rememberFacetNames,
    getFacet,
    getFacetNames,
    reanimate,
    addReachableVref,
    removeReachableVref,
    updateReferenceCounts,
    getReachablePromiseRefCount,
    addRecognizableValue,
    removeRecognizableVref,
    removeRecognizableValue,
    vrefKey,
    isPresenceReachable,
    isVrefRecognizable,
    setExportStatus,
    isVirtualObjectReachable,
    deleteVirtualObject,
    ceaseRecognition,
    setDeleteCollectionEntry,
    getRetentionStats,
    initializeIDCounters,
    allocateNextID,
    flushIDCounters,
    testHooks,
  });
}
/** @typedef {ReturnType<typeof makeVirtualReferenceManager>} VirtualReferenceManager */
