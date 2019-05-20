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

  const allowedVatSlotTypes = [
    'export',
    'import',
    'deviceImport',
    'promise',
    'resolver',
  ];

  const allowedKernelSlotTypes = ['export', 'device', 'promise', 'resolver'];

  function insistVatSlot(slot) {
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

  function insistKernelSlot(slot) {
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
    insistKernelSlot(kernelSlot);
    const { type, id } = kernelSlot;
    if (type === 'promise' || type === 'resolver') {
      return `${type}-${id}`;
    }
    if (type === 'export' || type === 'device') {
      return `${type}-${kernelSlot.vatID}-${id}`;
    }
    throw new Error(`unexpected kernelSlot type ${kernelSlot.type}`);
  }

  function createValSlotKey(vatSlot) {
    insistVatSlot(vatSlot);
    const { type, id } = vatSlot;
    return `${type}-${id}`;
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

    insist(
      allowedVatSlotTypes.includes(vatSlotType),
      `type ${vatSlotType} is not an allowed vat slot type`,
    );

    const i = state.nextIDs[vatSlotType];

    state.nextIDs[vatSlotType] = i + 1;

    return i;
  }

  function mapVatSlotToKernelSlot(vatSlot) {
    const kernelSlot = state.vatSlotToKernelSlot.get(createValSlotKey(vatSlot));
    if (kernelSlot === undefined) {
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
    insistKernelSlot,
    insistVatSlot,
  });
}
