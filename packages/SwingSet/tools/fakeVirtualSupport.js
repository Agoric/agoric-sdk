/* global WeakRef */
import { makeMarshal } from '@agoric/marshal';
import { assert } from '@agoric/assert';
import { parseVatSlot } from '../src/parseVatSlots.js';

import { makeVirtualReferenceManager } from '../src/kernel/virtualReferences.js';
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

export function makeFakeLiveSlotsStuff(options = {}) {
  let vom;
  function setVom(vomToUse) {
    assert(!vom, 'vom already configured');
    vom = vomToUse;
  }

  const {
    weak = false,
    log,
    FinalizationRegistry = FakeFinalizationRegistry,
    addToPossiblyDeadSet = () => {},
    addToPossiblyRetiredSet = () => {},
  } = options;

  const fakeStore = new Map();
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

  function clearSorted() {
    sortedKeys = undefined;
    priorKeyReturned = undefined;
    priorKeyIndex = -1;
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
    vatstoreGetAfter(priorKey, start, end) {
      ensureSorted();
      let from = 0;
      if (priorKeyReturned === priorKey) {
        from = priorKeyIndex;
      }
      let result;
      for (let i = from; i < sortedKeys.length; i += 1) {
        const key = sortedKeys[i];
        if (key >= end) {
          priorKeyReturned = undefined;
          priorKeyIndex = -1;
          break;
        } else if (key > priorKey && key >= start) {
          priorKeyReturned = key;
          priorKeyIndex = i;
          result = [key, fakeStore.get(key)];
          break;
        }
      }
      if (log) {
        log.push(
          `getAfter ${s(priorKey)} ${s(start)} ${s(end)} => ${s(result)}`,
        );
      }
      return result;
    },
  };

  let nextExportID = 1;
  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
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

  function setValForSlot(slot, val) {
    slotToVal.set(slot, weak ? new WeakRef(val) : val);
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
    const { type, virtual } = parseVatSlot(slot);
    assert.equal(type, 'object');
    if (virtual) {
      if (vom) {
        return vom.makeVirtualObjectRepresentative(slot);
      } else {
        assert.fail('fake liveSlots stuff configured without vom');
      }
    } else {
      return getValForSlot(slot);
    }
  }

  const marshal = makeMarshal(convertValToSlot, convertSlotToVal);

  function registerEntry(slot, val) {
    setValForSlot(slot, val);
    valToSlot.set(val, slot);
  }

  function deleteEntry(slot, val) {
    if (!val) {
      val = getValForSlot(slot);
    }
    slotToVal.delete(slot);
    valToSlot.delete(val);
  }

  return {
    syscall,
    allocateExportID,
    getSlotForVal,
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
    addToPossiblyDeadSet,
    addToPossiblyRetiredSet,
    dumpStore,
    setVom,
  };
}

export function makeFakeVirtualReferenceManager(fakeStuff) {
  return makeVirtualReferenceManager(
    fakeStuff.syscall,
    fakeStuff.getSlotForVal,
    fakeStuff.getValForSlot,
    fakeStuff.FinalizationRegistry,
    fakeStuff.addToPossiblyDeadSet,
    fakeStuff.addToPossiblyRetiredSet,
  );
}

export function makeFakeVirtualStuff(options = {}) {
  const fakeStuff = makeFakeLiveSlotsStuff(options);
  const vrm = makeFakeVirtualReferenceManager(fakeStuff);
  const vom = makeFakeVirtualObjectManager(vrm, fakeStuff, options);
  fakeStuff.setVom(vom);
  const cm = makeFakeCollectionManager(vrm, fakeStuff, options);
  return { fakeStuff, vrm, vom, cm };
}

export function makeStandaloneFakeVirtualObjectManager(options = {}) {
  const fakeStuff = makeFakeLiveSlotsStuff(options);
  const vrm = makeFakeVirtualReferenceManager(fakeStuff);
  const vom = makeFakeVirtualObjectManager(vrm, fakeStuff, options);
  fakeStuff.setVom(vom);
  return vom;
}

export function makeStandaloneFakeCollectionManager(options = {}) {
  const fakeStuff = makeFakeLiveSlotsStuff(options);
  const vrm = makeFakeVirtualReferenceManager(fakeStuff);
  return makeFakeCollectionManager(vrm, fakeStuff, options);
}

export {
  makeStandaloneFakeVirtualObjectManager as makeFakeVirtualObjectManager,
  makeStandaloneFakeCollectionManager as makeFakeCollectionManager,
};
