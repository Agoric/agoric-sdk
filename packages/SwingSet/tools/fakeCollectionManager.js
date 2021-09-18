import { makeCollectionManager } from '../src/kernel/collectionManager.js';

export function makeFakeCollectionManager(vrm, fakeStuff, _options = {}) {
  const {
    makeCollection,
    makeScalarMapStore,
    makeScalarWeakMapStore,
    makeScalarSetStore,
    makeScalarWeakSetStore,
    getCollection,
    M,
  } = makeCollectionManager(
    fakeStuff.syscall,
    vrm,
    fakeStuff.convertValToSlot,
    fakeStuff.convertSlotToVal,
    fakeStuff.marshal.serialize,
    fakeStuff.marshal.unserialize,
  );

  const normalCM = {
    makeCollection,
    makeScalarMapStore,
    makeScalarWeakMapStore,
    makeScalarSetStore,
    makeScalarWeakSetStore,
    getCollection,
    M,
  };

  const debugTools = {
    getValForSlot: fakeStuff.getValForSlot,
    setValForSlot: fakeStuff.setValForSlot,
    registerEntry: fakeStuff.registerEntry,
    deleteEntry: fakeStuff.deleteEntry,
    dumpStore: fakeStuff.dumpStore,
  };

  return harden({ ...normalCM, ...debugTools });
}
