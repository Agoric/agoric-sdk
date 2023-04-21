import { makeCollectionManager } from '../src/collectionManager.js';

export function makeFakeCollectionManager(vrm, fakeStuff, _options = {}) {
  const {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
    provideBaggage,
    initializeStoreKindInfo,
    flushSchemaCache,
  } = makeCollectionManager(
    fakeStuff.syscall,
    vrm,
    fakeStuff.allocateExportID,
    fakeStuff.allocateCollectionID,
    fakeStuff.convertValToSlot,
    fakeStuff.convertSlotToVal,
    fakeStuff.registerEntry,
    fakeStuff.marshal.serialize,
    fakeStuff.marshal.unserialize,
    fakeStuff.assertAcceptableSyscallCapdataSize,
  );
  initializeStoreKindInfo();

  const normalCM = {
    makeScalarBigMapStore,
    makeScalarBigWeakMapStore,
    makeScalarBigSetStore,
    makeScalarBigWeakSetStore,
    provideBaggage,
    flushSchemaCache,
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
