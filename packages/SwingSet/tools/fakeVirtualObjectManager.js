import { makeVirtualObjectManager } from '../src/liveslots/virtualObjectManager.js';

// Note: `fakeVirtualObjectManager` is something of a misnomer here.  The
// virtual object manager being used to implement this realized by the actual
// virtual object manager code.  What's being faked is everything else the
// virtual object manager is embedded in, i.e., the kernel and the rest of
// liveslots.  In particular, this module can be (and is, and is intended to be)
// used for unit tests for the virtual object manager itself.  What you get back
// from `makeFakeVirtualObjectManager` can't be used to program as if you were
// running in a vat because the rest of the vat environment is not present, but
// it *will* execute virtual object manager operations in the same way that the
// real one will because underneath it *is* the real one.

export function makeFakeVirtualObjectManager(vrm, fakeStuff, options = {}) {
  const { cacheSize = 100 } = options;

  const {
    initializeKindHandleKind,
    defineKind,
    defineKindMulti,
    defineDurableKind,
    defineDurableKindMulti,
    makeKindHandle,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
    flushCache,
    isDurableObject,
  } = makeVirtualObjectManager(
    fakeStuff.syscall,
    vrm,
    fakeStuff.allocateExportID,
    fakeStuff.getSlotForVal,
    fakeStuff.registerEntry,
    fakeStuff.marshal.serialize,
    fakeStuff.marshal.unserialize,
    cacheSize,
  );

  const normalVOM = {
    initializeKindHandleKind,
    defineKind,
    defineKindMulti,
    defineDurableKind,
    defineDurableKindMulti,
    makeKindHandle,
    isDurableObject,
    VirtualObjectAwareWeakMap,
    VirtualObjectAwareWeakSet,
  };

  const debugTools = {
    getValForSlot: fakeStuff.getValForSlot,
    setValForSlot: fakeStuff.setValForSlot,
    registerEntry: fakeStuff.registerEntry,
    deleteEntry: fakeStuff.deleteEntry,
    flushCache,
    dumpStore: fakeStuff.dumpStore,
  };

  return harden({ ...normalVOM, ...debugTools });
}
