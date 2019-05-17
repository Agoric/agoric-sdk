import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../insist';

export default function makeVatState() {
  // per-vat translation tables
  const state = {
    kernelSlotToVatSlot: new Map(),
    vatSlotToKernelSlot: new Map(),

    // make these IDs start at different values to detect errors
    // better
    nextIDs: {
      import: 10,
      promise: 20,
      resolver: 30,
      deviceImport: 40,
    },
    transcript: [],
  };

  function createKeyFromObj(obj) {
    const keyItems = [];
    Object.getOwnPropertyNames(obj).forEach(k => keyItems.push(k, obj[k]));
    return keyItems.join('-');
  }

  const allowedVatSlotTypes = [
    'export',
    'import',
    'deviceImport',
    'promise',
    'resolver',
  ];

  const allowedKernelSlotTypes = [
    'export',
    'import',
    'device',
    'promise',
    'resolver',
  ];

  function checkVatSlot(slot) {
    const properties = Object.getOwnPropertyNames(slot);
    insist(
      properties.length === 2,
      `wrong number of properties for a vatSlot ${JSON.stringify(slot)}`,
    );
    Nat(slot.id);
    insist(
      allowedVatSlotTypes.includes(slot.type),
      `unknown slot.type in '${JSON.stringify(slot)}'`,
    );
  }

  function checkKernelSlot(slot) {
    const properties = Object.getOwnPropertyNames(slot);
    insist(
      properties.length === 3 ||
        (properties.length === 2 &&
          (slot.type === 'promise' || slot.type === 'resolver')),
      `wrong number of properties for a kernelSlot ${JSON.stringify(slot)}`,
    ); // a kernel slot has a vatID property, unless it is a promise or a resolver
    Nat(slot.id);
    insist(
      allowedKernelSlotTypes.includes(slot.type),
      `unknown slot.type in '${JSON.stringify(slot)}'`,
    );
  }

  function createKernelSlotKey(kernelSlot) {
    checkKernelSlot(kernelSlot);
    return createKeyFromObj(kernelSlot);
  }

  function createValSlotKey(vatSlot) {
    checkVatSlot(vatSlot);
    return createKeyFromObj(vatSlot);
  }

  function getNextVatSlotID(type) {
    insist(
      allowedVatSlotTypes.includes(type),
      `type ${type} is not an allowed vat slot type`,
    );
    return state.nextIDs[type];
  }

  function setNextVatSlotID(type, newNextID) {
    insist(
      allowedVatSlotTypes.includes(type),
      `type ${type} is not an allowed vat slot type`,
    );
    state.nextIDs[type] = newNextID;
  }

  function getVatSlotTypeFromKernelSlot(kernelSlot) {
    switch (kernelSlot.type) {
      case 'export':
        return 'import';
      case 'device':
        return 'deviceImport';
      case 'promise':
        return 'promise';
      case 'resolver':
        return 'resolver';
      default:
        throw new Error('unrecognized kernelSlot type');
    }
  }

  function allocateNextVatSlotID(kernelSlot) {
    const vatSlotType = getVatSlotTypeFromKernelSlot(kernelSlot);
    const i = getNextVatSlotID(vatSlotType);
    setNextVatSlotID(vatSlotType, i + 1);
    return i;
  }

  function mapVatSlotToKernelSlot(vatSlot, throwIfNotFound) {
    const kernelSlot = state.vatSlotToKernelSlot.get(createValSlotKey(vatSlot));
    if (kernelSlot === undefined && throwIfNotFound) {
      throw new Error(`unknown ${vatSlot.type} slot '${vatSlot.id}'`);
    }
    return kernelSlot;
  }

  function mapKernelSlotToVatSlot(kernelSlot) {
    if (!state.kernelSlotToVatSlot.has(createKernelSlotKey(kernelSlot))) {
      // must add both directions
      const newVatSlotID = Nat(allocateNextVatSlotID(kernelSlot));
      const vatSlotType = getVatSlotTypeFromKernelSlot(kernelSlot);
      const vatSlot = { type: vatSlotType, id: newVatSlotID };
      state.kernelSlotToVatSlot.set(createKernelSlotKey(kernelSlot), vatSlot);
      state.vatSlotToKernelSlot.set(createValSlotKey(vatSlot), kernelSlot);
    }
    return state.kernelSlotToVatSlot.get(createKernelSlotKey(kernelSlot));
  }

  function loadManagerState(vatData) {
    if (state.kernelSlotToVatSlot.size || state.vatSlotToKernelSlot.size) {
      throw new Error(`vat[$vatID] is not empty, cannot loadState`);
    }
    state.nextImportID = vatData.nextImportID;
    state.nextPromiseID = vatData.nextPromiseID;
    state.nextResolverID = vatData.nextResolverID;
    state.nextDeviceImportID = vatData.nextDeviceImportID;

    vatData.kernelSlotToVatSlot.forEach(([key, value]) => {
      state.kernelSlotToVatSlot.set(key, value);
    });

    vatData.vatSlotToKernelSlot.forEach(([key, value]) => {
      state.vatSlotToKernelSlot.set(key, value);
    });
  }

  function getManagerState() {
    return {
      kernelSlotToVatSlot: Array.from(state.kernelSlotToVatSlot.entries()),
      vatSlotToKernelSlot: Array.from(state.vatSlotToKernelSlot.entries()),

      nextImportID: state.nextImportID,
      nextPromiseID: state.nextPromiseID,
      nextResolverID: state.nextResolverID,
      nextDeviceImportID: state.nextDeviceImportID,

      transcript: state.transcript,
    };
  }

  function getCurrentState() {
    return { transcript: Array.from(state.transcript) };
  }

  function addToTranscript(msg) {
    state.transcript.push(msg);
  }

  function dumpState(vatID) {
    const res = [];
    state.kernelSlotToVatSlot.forEach(vatSlot => {
      const kernelSlot = state.vatSlotToKernelSlot.get(
        createValSlotKey(vatSlot),
      );
      if (vatSlot.type === 'promise' || vatSlot.type === 'resolver') {
        res.push([vatID, vatSlot.type, vatSlot.id, kernelSlot.id]);
      } else {
        res.push([
          vatID,
          vatSlot.type,
          vatSlot.id,
          kernelSlot.type,
          kernelSlot.vatID,
          kernelSlot.id,
        ]);
      }
    });
    return harden(res);
  }

  return harden({
    mapVatSlotToKernelSlot,
    mapKernelSlotToVatSlot,
    loadManagerState,
    getManagerState,
    getCurrentState,
    dumpState,
    addToTranscript,
    checkKernelSlot,
    checkVatSlot,
  });
}
