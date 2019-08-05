import harden from '@agoric/harden';
import Nat from '@agoric/nat';

// makeVatKeeper is a pure function: all state is kept in the argument object

function makeDeviceKeeper(state) {

  function createStartingDeviceState() {
    state.imports = {
      outbound: {},
      inbound: {},
    };
    state.nextImportID = 10;
  }

  function allocateImportIndex() {
    const i = state.nextImportID;
    state.nextImportID = i + 1;
    return i;
  }

  function mapDeviceSlotToKernelSlot(slot) {
    // kdebug(`mapOutbound ${JSON.stringify(slot)}`);

    // export already handled

    if (slot.type === 'import') {
      // an import from somewhere else, so look in the sending Vat's table to
      // translate into absolute form
      Nat(slot.id);
      return state.imports.outbound[`${slot.id}`];
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

      const imports = state.imports;
      const inbound = imports.inbound;
      const outbound = imports.outbound;
      const key = `${slot.type}.${fromVatID}.${id}`; // ugh javascript
      if (!Object.hasOwnProperty(inbound, key)) {
        // must add both directions
         const newSlotID = Nat(allocateImportIndex());
        // kdebug(` adding ${newSlotID}`);
        inbound[key] = newSlotID;
        outbound[`${newSlotID}`] =
          harden({ type: 'export', vatID: fromVatID, id }); // TODO just 'slot'?
      }
      return { type: 'import', id: inbound[key] };
    }

    throw Error(`unknown type '${slot.type}'`);
  }

  function getDeviceState() {
    return state.deviceState;
  }

  function setDeviceState(value) {
    state.deviceState = value;
  }

  return harden({
    createStartingDeviceState,
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
    getDeviceState,
    setDeviceState,
  });
}

export default makeDeviceKeeper;
