import { makeCollectionManager } from '../src/kernel/collectionManager.js';

export function makeFakeCollectionManager(vrm, fakeStuff, _options = {}) {
  const {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
  } = makeCollectionManager(
    fakeStuff.syscall,
    vrm,
    fakeStuff.allocateExportID,
    fakeStuff.convertValToSlot,
    fakeStuff.convertSlotToVal,
    fakeStuff.registerEntry,
    fakeStuff.marshal.serialize,
    fakeStuff.marshal.unserialize,
  );

  const normalCM = {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
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
