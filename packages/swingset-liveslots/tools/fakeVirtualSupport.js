/* global WeakRef */
/* eslint-disable max-classes-per-file */
import { makeMarshal } from '@endo/marshal';
import { assert } from '@agoric/assert';
import { parseVatSlot } from '../src/parseVatSlots.js';

import { makeVirtualReferenceManager } from '../src/virtualReferences.js';
import { makeWatchedPromiseManager } from '../src/watchedPromises.js';
import { makeFakeVirtualObjectManager } from './fakeVirtualObjectManager.js';
import { makeFakeCollectionManager } from './fakeCollectionManager.js';

class FakeFinalizationRegistry {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor() {}

  // eslint-disable-next-line class-methods-use-this
  register(_target, _heldValue, _unregisterToken) {}

  // eslint-disable-next-line class-methods-use-this
  unregister(_unregisterToken) {}
}

class FakeWeakRef {
  constructor(target) {
    this.target = target;
  }

  deref() {
    return this.target; // strong ref
  }
}

const RealWeakRef = WeakRef;

export function makeFakeLiveSlotsStuff(options = {}) {
  let vrm;
  function setVrm(vrmToUse) {
    assert(!vrm, 'vrm already configured');
    vrm = vrmToUse;
  }

  const {
    fakeStore = new Map(),
    weak = false,
    log,
    FinalizationRegistry = FakeFinalizationRegistry,
    WeakRef = FakeWeakRef, // VRM uses this
    addToPossiblyDeadSet = () => {},
    addToPossiblyRetiredSet = () => {},
  } = options;

  let sortedKeys;
  let priorKeyReturned;
  let priorKeyIndex;

  function s(v) {
    switch (typeof v) {
      case 'symbol':
        return v.toString();
      case 'bigint':
        return `${v}n`;
      default:
        return `${v}`;
    }
  }

  function ensureSorted() {
    if (!sortedKeys) {
      sortedKeys = [];
      for (const key of fakeStore.keys()) {
        sortedKeys.push(key);
      }
      sortedKeys.sort((k1, k2) => k1.localeCompare(k2));
    }
  }

  function clearGetNextKeyCache() {
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
  }
  clearGetNextKeyCache();

  function clearSorted() {
    sortedKeys = undefined;
    clearGetNextKeyCache();
  }

  function dumpStore() {
    ensureSorted();
    const result = [];
    for (const key of sortedKeys) {
      result.push([key, fakeStore.get(key)]);
    }
    return result;
  }

  const syscall = {
    vatstoreGet(key) {
      const result = fakeStore.get(key);
      if (log) {
        log.push(`get ${s(key)} => ${s(result)}`);
      }
      return result;
    },
    vatstoreGetNextKey(priorKey) {
      assert.typeof(priorKey, 'string');
      ensureSorted();
      // TODO: binary search for priorKey (maybe missing), then get
      // the one after that. For now we go simple and slow. But cache
      // a starting point, because the main use case is a full
      // iteration. OTOH, the main use case also deletes everything,
      // which will clobber the cache on each deletion, so it might
      // not help.
      const start = priorKeyReturned === priorKey ? priorKeyIndex : 0;
      let result;
      for (let i = start; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (key > priorKey) {
          priorKeyReturned = key;
          priorKeyIndex = i;
          result = key;
          break;
        }
      }
      if (!result) {
        // reached end without finding the key, so clear our cache
        clearGetNextKeyCache();
      }
      if (log) {
        log.push(`getNextKey ${s(priorKey)} => ${s(result)}`);
      }
      return result;
    },
    vatstoreSet(key, value) {
      if (log) {
        log.push(`set ${s(key)} ${s(value)}`);
      }
      if (!fakeStore.has(key)) {
        clearSorted();
      }
      fakeStore.set(key, value);
    },
    vatstoreDelete(key) {
      if (log) {
        log.push(`delete ${s(key)}`);
      }
      if (fakeStore.has(key)) {
        clearSorted();
      }
      fakeStore.delete(key);
    },
  };

  let nextExportID = 1;
  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
  }

  let nextCollectionID = 1;
  function allocateCollectionID() {
    const collectionID = nextCollectionID;
    nextCollectionID += 1;
    return collectionID;
  }

  // note: The real liveslots slotToVal() maps slots (vrefs) to a WeakRef,
  // and the WeakRef may or may not contain the target value. Use
  // options={weak:true} to match that behavior, or the default weak:false to
  // keep strong references.
  const valToSlot = new WeakMap();
  const slotToVal = new Map();

  function getSlotForVal(val) {
    return valToSlot.get(val);
  }

  function getValForSlot(slot) {
    const d = slotToVal.get(slot);
    return d && (weak ? d.deref() : d);
  }

  function requiredValForSlot(slot) {
    const val = getValForSlot(slot);
    assert(val, `${slot} must have a value`);
    return val;
  }

  function setValForSlot(slot, val) {
    slotToVal.set(slot, weak ? new RealWeakRef(val) : val);
  }

  function convertValToSlot(val) {
    if (!valToSlot.has(val)) {
      const slot = `o+${allocateExportID()}`;
      valToSlot.set(val, slot);
      setValForSlot(slot, val);
    }
    return valToSlot.get(val);
  }

  function convertSlotToVal(slot) {
    const { type, id, virtual, durable, facet, baseRef } = parseVatSlot(slot);
    assert.equal(type, 'object');
    let val = getValForSlot(baseRef);
    if (val) {
      if (virtual || durable) {
        if (facet !== undefined) {
          return vrm.getFacet(id, val, facet);
        }
      }
      return val;
    }
    if (virtual || durable) {
      if (vrm) {
        val = vrm.reanimate(slot);
        if (facet !== undefined) {
          return vrm.getFacet(id, val, facet);
        }
      } else {
        assert.fail('fake liveSlots stuff configured without vrm');
      }
    }
    return val;
  }

  const marshal = makeMarshal(convertValToSlot, convertSlotToVal, {
    serializeBodyFormat: 'smallcaps',
  });

  function registerEntry(baseRef, val, valIsCohort) {
    setValForSlot(baseRef, val);
    if (valIsCohort) {
      const { id } = parseVatSlot(baseRef);
      for (const [index, name] of vrm.getFacetNames(id).entries()) {
        valToSlot.set(val[name], `${baseRef}:${index}`);
      }
    } else {
      valToSlot.set(val, baseRef);
    }
  }

  function deleteEntry(slot, val) {
    if (!val) {
      val = getValForSlot(slot);
    }
    slotToVal.delete(slot);
    valToSlot.delete(val);
  }

  function assertAcceptableSyscallCapdataSize(_capdatas) {}

  const maybeExportPromise = _vref => false;

  return {
    syscall,
    allocateExportID,
    allocateCollectionID,
    getSlotForVal,
    requiredValForSlot,
    getValForSlot,
    setValForSlot,
    registerEntry,
    valToSlot,
    slotToVal,
    convertValToSlot,
    convertSlotToVal,
    marshal,
    deleteEntry,
    FinalizationRegistry,
    WeakRef,
    addToPossiblyDeadSet,
    addToPossiblyRetiredSet,
    dumpStore,
    setVrm,
    assertAcceptableSyscallCapdataSize,
    maybeExportPromise,
  };
}

export function makeFakeVirtualReferenceManager(
  fakeStuff,
  relaxDurabilityRules = true,
) {
  return makeVirtualReferenceManager(
    fakeStuff.syscall,
    fakeStuff.getSlotForVal,
    fakeStuff.getValForSlot,
    fakeStuff.FinalizationRegistry,
    fakeStuff.WeakRef,
    fakeStuff.addToPossiblyDeadSet,
    fakeStuff.addToPossiblyRetiredSet,
    relaxDurabilityRules,
  );
}

export function makeFakeWatchedPromiseManager(
  vrm,
  vom,
  collectionManager,
  fakeStuff,
) {
  return makeWatchedPromiseManager({
    syscall: fakeStuff.syscall,
    vrm,
    vom,
    collectionManager,
    convertValToSlot: fakeStuff.convertValToSlot,
    convertSlotToVal: fakeStuff.convertSlotToVal,
    maybeExportPromise: fakeStuff.maybeExportPromise,
  });
}
/**
 * Configure virtual stuff with relaxed durability rules and fake liveslots
 *
 * @param {object} [options]
 * @param {number} [options.cacheSize]
 * @param {boolean} [options.relaxDurabilityRules]
 */
export function makeFakeVirtualStuff(options = {}) {
  const actualOptions = {
    relaxDurabilityRules: true,
    ...options,
  };
  const { relaxDurabilityRules } = actualOptions;
  const fakeStuff = makeFakeLiveSlotsStuff(actualOptions);
  const vrm = makeFakeVirtualReferenceManager(fakeStuff, relaxDurabilityRules);
  const vom = makeFakeVirtualObjectManager(vrm, fakeStuff);
  vom.initializeKindHandleKind();
  fakeStuff.setVrm(vrm);
  const cm = makeFakeCollectionManager(vrm, fakeStuff, actualOptions);
  const wpm = makeFakeWatchedPromiseManager(vrm, vom, cm, fakeStuff);
  return { fakeStuff, vrm, vom, cm, wpm };
}

export function makeStandaloneFakeVirtualObjectManager(options = {}) {
  const fakeStuff = makeFakeLiveSlotsStuff(options);
  const { relaxDurabilityRules = true } = options;
  const vrm = makeFakeVirtualReferenceManager(fakeStuff, relaxDurabilityRules);
  const vom = makeFakeVirtualObjectManager(vrm, fakeStuff);
  vom.initializeKindHandleKind();
  fakeStuff.setVrm(vrm);
  return vom;
}

export function makeStandaloneFakeCollectionManager(options = {}) {
  const fakeStuff = makeFakeLiveSlotsStuff(options);
  const { relaxDurabilityRules = true } = options;
  const vrm = makeFakeVirtualReferenceManager(fakeStuff, relaxDurabilityRules);
  return makeFakeCollectionManager(vrm, fakeStuff, options);
}

export {
  makeStandaloneFakeVirtualObjectManager as makeFakeVirtualObjectManager,
  makeStandaloneFakeCollectionManager as makeFakeCollectionManager,
};
