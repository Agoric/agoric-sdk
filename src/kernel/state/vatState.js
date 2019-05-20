import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../insist';

export default function makeVatState() {
  // per-vat translation tables

  // kernelSlotToVatSlot is an object with four properties:
  //    exports, devices, promises, resolvers.
  // vatSlotToKernelSlot has imports, deviceImports, promises, resolvers
  const state = {
    kernelSlotToVatSlot: {
      exports: new Map(),
      devices: new Map(),
      promises: new Map(),
      resolvers: new Map(),
    },
    vatSlotToKernelSlot: {
      imports: new Map(),
      deviceImports: new Map(),
      promises: new Map(),
      resolvers: new Map(),
    },

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

  function getKernelSlotTypedMapAndKey(kernelSlot) {
    insistKernelSlot(kernelSlot);

    const { type, id } = kernelSlot;
    let typedKernelToVatMap;
    let kernelSlotKey;

    switch (type) {
      case 'promise': {
        typedKernelToVatMap = state.kernelSlotToVatSlot.promises;
        kernelSlotKey = `${type}-${id}`;
        break;
      }
      case 'resolver': {
        typedKernelToVatMap = state.kernelSlotToVatSlot.resolvers;
        kernelSlotKey = `${type}-${id}`;
        break;
      }
      case 'export': {
        typedKernelToVatMap = state.kernelSlotToVatSlot.exports;
        kernelSlotKey = `${type}-${kernelSlot.vatID}-${id}`;
        break;
      }
      case 'device': {
        typedKernelToVatMap = state.kernelSlotToVatSlot.devices;
        kernelSlotKey = `${type}-${kernelSlot.vatID}-${id}`;
        break;
      }
      default:
        throw new Error(`unexpected kernelSlot type ${kernelSlot.type}`);
    }
    return {
      typedKernelToVatMap,
      kernelSlotKey,
    };
  }

  function getValSlotTypedMapAndKey(vatSlot) {
    insistVatSlot(vatSlot);
    const { type, id } = vatSlot;
    let typedVatToKernelMap;
    // imports, deviceImports, promises, resolvers

    switch (type) {
      case 'import': {
        typedVatToKernelMap = state.vatSlotToKernelSlot.imports;
        break;
      }
      case 'deviceImport': {
        typedVatToKernelMap = state.vatSlotToKernelSlot.deviceImports;
        break;
      }
      case 'promise': {
        typedVatToKernelMap = state.vatSlotToKernelSlot.promises;
        break;
      }
      case 'resolver': {
        typedVatToKernelMap = state.vatSlotToKernelSlot.resolvers;
        break;
      }
      default:
        throw new Error(`unexpected vatSlot type ${vatSlot.type}`);
    }
    return {
      typedVatToKernelMap,
      vatSlotKey: `${type}-${id}`,
    };
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
    const { typedVatToKernelMap, vatSlotKey } = getValSlotTypedMapAndKey(
      vatSlot,
    );
    const kernelSlot = typedVatToKernelMap.get(vatSlotKey);
    if (kernelSlot === undefined) {
      throw new Error(`unknown ${vatSlot.type} slot '${vatSlot.id}'`);
    }
    return kernelSlot;
  }

  function mapKernelSlotToVatSlot(kernelSlot) {
    const { typedKernelToVatMap, kernelSlotKey } = getKernelSlotTypedMapAndKey(
      kernelSlot,
    );
    if (!typedKernelToVatMap.has(kernelSlotKey)) {
      // must add both directions
      const newVatSlotID = Nat(allocateNextVatSlotID(kernelSlot));
      const vatSlotType = getVatSlotTypeFromKernelSlot(kernelSlot);
      const vatSlot = { type: vatSlotType, id: newVatSlotID };
      typedKernelToVatMap.set(kernelSlotKey, vatSlot);
      const { typedVatToKernelMap, vatSlotKey } = getValSlotTypedMapAndKey(
        vatSlot,
      );
      typedVatToKernelMap.set(vatSlotKey, kernelSlot);
    }
    return typedKernelToVatMap.get(kernelSlotKey);
  }

  function loadManagerState(vatData) {
    if (state.kernelSlotToVatSlot.size || state.vatSlotToKernelSlot.size) {
      throw new Error(`vat[$vatID] is not empty, cannot loadState`);
    }
    state.nextImportID = vatData.nextImportID;
    state.nextPromiseID = vatData.nextPromiseID;
    state.nextResolverID = vatData.nextResolverID;
    state.nextDeviceImportID = vatData.nextDeviceImportID;

    // exports, devices, promises, resolvers

    vatData.kernelSlotToVatSlot.exports.forEach(([key, value]) => {
      state.kernelSlotToVatSlot.exports.set(key, value);
    });

    vatData.kernelSlotToVatSlot.devices.forEach(([key, value]) => {
      state.kernelSlotToVatSlot.devices.set(key, value);
    });

    vatData.kernelSlotToVatSlot.promises.forEach(([key, value]) => {
      state.kernelSlotToVatSlot.promises.set(key, value);
    });

    vatData.kernelSlotToVatSlot.resolvers.forEach(([key, value]) => {
      state.kernelSlotToVatSlot.resolvers.set(key, value);
    });

    // imports, deviceImports, promises, resolvers

    vatData.vatSlotToKernelSlot.imports.forEach(([key, value]) => {
      state.vatSlotToKernelSlot.imports.set(key, value);
    });

    vatData.vatSlotToKernelSlot.deviceImports.forEach(([key, value]) => {
      state.vatSlotToKernelSlot.deviceImports.set(key, value);
    });

    vatData.vatSlotToKernelSlot.promises.forEach(([key, value]) => {
      state.vatSlotToKernelSlot.promises.set(key, value);
    });

    vatData.vatSlotToKernelSlot.resolvers.forEach(([key, value]) => {
      state.vatSlotToKernelSlot.resolvers.set(key, value);
    });
  }

  function getManagerState() {
    return {
      kernelSlotToVatSlot: {
        // exports, devices, promises, resolvers
        exports: Array.from(state.kernelSlotToVatSlot.exports.entries()),
        devices: Array.from(state.kernelSlotToVatSlot.devices.entries()),
        promises: Array.from(state.kernelSlotToVatSlot.promises.entries()),
        resolvers: Array.from(state.kernelSlotToVatSlot.resolvers.entries()),
      },
      // imports, deviceImports, promises, resolvers
      vatSlotToKernelSlot: {
        imports: Array.from(state.vatSlotToKernelSlot.imports.entries()),
        deviceImports: Array.from(
          state.vatSlotToKernelSlot.deviceImports.entries(),
        ),
        promises: Array.from(state.vatSlotToKernelSlot.promises.entries()),
        resolvers: Array.from(state.vatSlotToKernelSlot.resolvers.entries()),
      },

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

  // pretty print for logging and testing
  function dumpState(vatID) {
    const res = [];

    function printSlots(vatSlot) {
      const { typedVatToKernelMap, vatSlotKey } = getValSlotTypedMapAndKey(
        vatSlot,
      );
      const kernelSlot = typedVatToKernelMap.get(vatSlotKey);
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
    }

    // 'exports', 'devices', 'promises', 'resolvers'
    state.kernelSlotToVatSlot.exports.forEach(printSlots);
    state.kernelSlotToVatSlot.devices.forEach(printSlots);
    state.kernelSlotToVatSlot.promises.forEach(printSlots);
    state.kernelSlotToVatSlot.resolvers.forEach(printSlots);

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
