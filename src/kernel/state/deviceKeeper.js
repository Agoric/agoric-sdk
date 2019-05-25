import harden from '@agoric/harden';
import Nat from '@agoric/nat';

function makeDeviceKeeper(kvstore, pathToRoot, makeExternalKVStore, external) {
  function createStartingDeviceState() {
    kvstore.set('imports', makeExternalKVStore(pathToRoot, external));
    const imports = kvstore.get('imports');
    imports.set('outbound', makeExternalKVStore(pathToRoot, external));
    imports.set('inbound', makeExternalKVStore(pathToRoot, external));
    kvstore.set('nextImportID', 10);
  }

  function allocateImportIndex() {
    const i = kvstore.get('nextImportID');
    kvstore.set('nextImportID', i + 1);
    return i;
  }

  function mapDeviceSlotToKernelSlot(slot) {
    // kdebug(`mapOutbound ${JSON.stringify(slot)}`);

    // export already handled

    if (slot.type === 'import') {
      // an import from somewhere else, so look in the sending Vat's table to
      // translate into absolute form
      Nat(slot.id);
      return kvstore
        .get('imports')
        .get('outbound')
        .get(slot.id);
    }

    throw Error(`unknown slot.type '${slot.type}'`);
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapKernelSlotToDeviceSlot(slot) {
    // device already handled

    if (slot.type === 'export') {
      const { vatID: fromVatID, id } = slot;
      Nat(id);

      const imports = kvstore.get('imports');
      const inbound = imports.get('inbound');
      const outbound = imports.get('outbound');
      const key = `${slot.type}.${fromVatID}.${id}`; // ugh javascript
      if (!inbound.has(key)) {
        // must add both directions
        const newSlotID = Nat(allocateImportIndex());
        // kdebug(` adding ${newSlotID}`);
        inbound.set(key, newSlotID);
        outbound.set(
          newSlotID,
          harden({ type: 'export', vatID: fromVatID, id }), // TODO just 'slot'?
        );
      }
      return { type: 'import', id: inbound.get(key) };
    }

    throw Error(`unknown type '${slot.type}'`);
  }

  function getManagerState() {
    const outbound = kvstore.get('imports').get('outbound');
    const inbound = kvstore.get('imports').get('inbound');
    return {
      nextImportID: kvstore.get('nextImportID'),
      imports: {
        outbound: outbound.entries(),
        inbound: inbound.entries(),
      },
    };
  }

  function loadManagerState(data) {
    const deviceData = data.managerState;
    const outbound = kvstore.get('imports').get('outbound');
    const inbound = kvstore.get('imports').get('inbound');

    if (outbound.size() || inbound.size()) {
      throw new Error(`device[$deviceName] is not empty, cannot loadState`);
    }

    kvstore.set('nextImportID', deviceData.nextImportID);
    deviceData.imports.outbound.forEach(kv => outbound.set(kv[0], kv[1]));
    deviceData.imports.inbound.forEach(kv => inbound.set(kv[0], kv[1]));
  }

  function getCurrentState() {
    return harden({
      managerState: getManagerState(),
      // deviceState: dispatch.getState(),
      deviceState: {},
    });
  }

  return harden({
    createStartingDeviceState,
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
    getManagerState,
    loadManagerState,
    getCurrentState,
  });
}

export default makeDeviceKeeper;
