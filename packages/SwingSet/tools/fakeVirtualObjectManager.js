/* global WeakRef */
import { makeMarshal } from '@endo/marshal';
import { assert } from '@agoric/assert';
import { parseVatSlot } from '../src/parseVatSlots.js';

import { makeVirtualObjectManager } from '../src/kernel/virtualObjectManager.js';

class FakeFinalizationRegistry {
  // eslint-disable-next-line no-useless-constructor, no-empty-function
  constructor() {}

  // eslint-disable-next-line class-methods-use-this
  register(_target, _heldValue, _unregisterToken) {}

  // eslint-disable-next-line class-methods-use-this
  unregister(_unregisterToken) {}
}

export function makeFakeVirtualObjectManager(options = {}) {
  const {
    cacheSize = 100,
    log,
    weak = false,
    // eslint-disable-next-line no-use-before-define
    FinalizationRegistry = FakeFinalizationRegistry,
    addToPossiblyDeadSet = () => {},
  } = options;
  const fakeStore = new Map();

  function dumpStore() {
    const result = [];
    for (const entry of fakeStore.entries()) {
      result.push(entry);
    }
    result.sort((e1, e2) => e1[0].localeCompare(e2[0]));
    return result;
  }

  const fakeSyscall = {
    vatstoreGet(key) {
      const result = fakeStore.get(key);
      if (log) {
        log.push(`get ${key} => ${result}`);
      }
      return result;
    },
    vatstoreSet(key, value) {
      if (log) {
        log.push(`set ${key} ${value}`);
      }
      fakeStore.set(key, value);
    },
    vatstoreDelete(key) {
      if (log) {
        log.push(`delete ${key}`);
      }
      fakeStore.delete(key);
    },
  };

  let nextExportID = 1;
  function fakeAllocateExportID() {
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

  function setValForSlot(slot, val) {
    slotToVal.set(slot, weak ? new WeakRef(val) : val);
  }

  function getValForSlot(slot) {
    const d = slotToVal.get(slot);
    return d && (weak ? d.deref() : d);
  }

  function fakeConvertValToSlot(val) {
    if (!valToSlot.has(val)) {
      const slot = `o+${fakeAllocateExportID()}`;
      valToSlot.set(val, slot);
      setValForSlot(slot, val);
    }
    return valToSlot.get(val);
  }

  function fakeConvertSlotToVal(slot) {
    const { type, virtual } = parseVatSlot(slot);
    assert.equal(type, 'object');
    if (virtual) {
      // eslint-disable-next-line no-use-before-define
      return makeVirtualObjectRepresentative(slot);
    } else {
      return getValForSlot(slot);
    }
  }

  // eslint-disable-next-line no-use-before-define
  const fakeMarshal = makeMarshal(fakeConvertValToSlot, fakeConvertSlotToVal);

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

  const {
    makeVirtualObjectRepresentative,
    makeVirtualScalarWeakMap,
    makeKind,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    isPresenceReachable,
    setExportStatus,
    possibleVirtualObjectDeath,
    flushCache,
  } = makeVirtualObjectManager(
    fakeSyscall,
    fakeAllocateExportID,
    getSlotForVal,
    getValForSlot,
    registerEntry,
    fakeMarshal.serialize,
    fakeMarshal.unserialize,
    cacheSize,
    FinalizationRegistry,
    addToPossiblyDeadSet,
  );

  const normalVOM = {
    makeKind,
    makeVirtualScalarWeakMap,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    isPresenceReachable,
    setExportStatus,
    possibleVirtualObjectDeath,
  };

  const debugTools = {
    getValForSlot,
    setValForSlot,
    registerEntry,
    deleteEntry,
    flushCache,
    dumpStore,
  };

  return harden({ ...normalVOM, ...debugTools });
}
