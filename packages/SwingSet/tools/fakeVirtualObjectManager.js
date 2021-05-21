import { makeMarshal } from '@agoric/marshal';
import { assert } from '@agoric/assert';
import { parseVatSlot } from '../src/parseVatSlots';

import { makeVirtualObjectManager } from '../src/kernel/virtualObjectManager';

export function makeFakeVirtualObjectManager(options = {}) {
  const { cacheSize = 100, log } = options;
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

  const valToSlot = new WeakMap();
  const slotToVal = new Map();

  function fakeConvertValToSlot(val) {
    if (!valToSlot.has(val)) {
      const slot = `o+${fakeAllocateExportID()}`;
      valToSlot.set(val, slot);
      slotToVal.set(slot, val);
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
      return slotToVal.get(slot);
    }
  }

  // eslint-disable-next-line no-use-before-define
  const fakeMarshal = makeMarshal(fakeConvertValToSlot, fakeConvertSlotToVal);

  function fakeRegisterValue(slot, val) {
    slotToVal.set(slot, val);
    valToSlot.set(val, slot);
  }

  const {
    makeVirtualObjectRepresentative,
    makeWeakStore,
    makeKind,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    flushCache,
  } = makeVirtualObjectManager(
    fakeSyscall,
    fakeAllocateExportID,
    valToSlot,
    fakeRegisterValue,
    fakeMarshal,
    cacheSize,
  );

  return {
    makeKind,
    makeWeakStore,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    valToSlot,
    slotToVal,
    flushCache,
    dumpStore,
  };
}
