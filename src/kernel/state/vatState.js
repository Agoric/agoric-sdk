import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../insist';

export default function makeVatState(kvstore) {
  // per-vat translation tables

  // kernelSlotToVatSlot is an object with four properties:
  //    exports, devices, promises, resolvers.
  //    vatSlotToKernelSlot has imports, deviceImports, promises,
  //    resolvers
  
  function getEntries(store) {
    const iterator = store.iterator();
    const entries = [];

    for (const entry of iterator) {
      entries.push(entry);
    }
    return entries;
  }

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

    const tables = kvstore.get('kernelSlotToVatSlot');

    switch (type) {
      case 'promise': {
        return {
          table: tables.get('promises'),
          key: id,
        };
      }
      case 'resolver': {
        return {
          table: tables.get('resolvers'),
          key: id,
        };
      }
      case 'export': {
        return {
          table: tables.get('exports'),
          key: `${kernelSlot.vatID}-${id}`,
        };
      }
      case 'device': {
        return {
          table: tables.get('devices'),
          key: `${kernelSlot.vatID}-${id}`,
        };
      }
      default:
        throw new Error(`unexpected kernelSlot type ${kernelSlot.type}`);
    }
  }

  function getVatSlotTypedMapAndKey(vatSlot) {
    insistVatSlot(vatSlot);
    const { type, id } = vatSlot;

    const tables = kvstore.get('vatSlotToKernelSlot');
    let table;
    // imports, deviceImports, promises, resolvers

    switch (type) {
      case 'import': {
        table = tables.get('imports');
        break;
      }
      case 'deviceImport': {
        table = tables.get('deviceImports');
        break;
      }
      case 'promise': {
        table = tables.get('promises');
        break;
      }
      case 'resolver': {
        table = tables.get('resolvers');
        break;
      }
      default:
        throw new Error(`unexpected vatSlot type ${vatSlot.type}`);
    }
    return {
      table,
      key: `${type}-${id}`,
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

  function mapVatSlotToKernelSlot(vatSlot) {
    const { table, key } = getVatSlotTypedMapAndKey(vatSlot);
    const kernelSlot = table.get(key);
    if (kernelSlot === undefined) {
      throw new Error(`unknown ${vatSlot.type} slot '${vatSlot.id}'`);
    }
    return kernelSlot;
  }

  function mapKernelSlotToVatSlot(kernelSlot) {
    const { table, key } = getKernelSlotTypedMapAndKey(kernelSlot);
    if (!table.has(key)) {
      // must add both directions
      const vatSlotType = getVatSlotTypeFromKernelSlot(kernelSlot);
      const nextIDs = kvstore.get('nextIDs');
      const newVatSlotID = nextIDs.get(vatSlotType);
      nextIDs.set(vatSlotType, newVatSlotID + 1);
      const vatSlot = { type: vatSlotType, id: newVatSlotID };
      table.set(key, vatSlot);
      const { table: vatSlotTable, key: vatSlotKey } = getVatSlotTypedMapAndKey(
        vatSlot,
      );
      vatSlotTable.set(vatSlotKey, kernelSlot);
    }
    return table.get(key);
  }

  function loadManagerState(vatData) {
    // kvstore has no size
    // TODO: reimplement this
    // if (state.kernelSlotToVatSlot.size || state.vatSlotToKernelSlot.size) {
    //   throw new Error(`vat[$vatID] is not empty, cannot loadState`);
    // }

    kvstore.set('nextImportID', vatData.nextImportID);
    kvstore.set('nextPromiseID', vatData.nextPromiseID);
    kvstore.set('nextResolverID', vatData.nextResolverID);
    kvstore.set('nextDeviceImportID', vatData.nextDeviceImportID);

    // exports, devices, promises, resolvers
    const kernelSlotToVatSlot = kvstore.get('kernelSlotToVatSlot');

    vatData.kernelSlotToVatSlot.exports.forEach(([key, value]) => {
      const exports = kernelSlotToVatSlot.get('exports');
      exports.set(key, value);
    });

    vatData.kernelSlotToVatSlot.devices.forEach(([key, value]) => {
      const devices = kernelSlotToVatSlot.get('devices');
      devices.set(key, value);
    });

    vatData.kernelSlotToVatSlot.promises.forEach(([key, value]) => {
      const promises = kernelSlotToVatSlot.get('promises');
      promises.set(key, value);
    });

    vatData.kernelSlotToVatSlot.resolvers.forEach(([key, value]) => {
      const resolvers = kernelSlotToVatSlot.get('resolvers');
      resolvers.set(key, value);
      resolvers.set(key, value);
    });

    // imports, deviceImports, promises, resolvers

    const vatSlotToKernelSlot = kvstore.get('vatSlotToKernelSlot');

    vatData.vatSlotToKernelSlot.imports.forEach(([key, value]) => {
      const imports = vatSlotToKernelSlot.get('imports');
      imports.set(key, value);
    });

    vatData.vatSlotToKernelSlot.deviceImports.forEach(([key, value]) => {
      const deviceImports = vatSlotToKernelSlot.get('deviceImports');
      deviceImports.set(key, value);
    });

    vatData.vatSlotToKernelSlot.promises.forEach(([key, value]) => {
      const promises = vatSlotToKernelSlot.get('promises');
      promises.set(key, value);
    });

    vatData.vatSlotToKernelSlot.resolvers.forEach(([key, value]) => {
      const resolvers = vatSlotToKernelSlot.get('resolvers');
      resolvers.set(key, value);
    });
  }

  function getManagerState() {
    const kernelSlotToVatSlot = kvstore.get('kernelSlotToVatSlot');
    const vatSlotToKernelSlot = kvstore.get('vatSlotToKernelSlot');

    return {
      kernelSlotToVatSlot: {
        // exports, devices, promises, resolvers
        exports: getEntries(kernelSlotToVatSlot.get('exports')),
        devices: getEntries(kernelSlotToVatSlot.get('devices')),
        promises: getEntries(kernelSlotToVatSlot.get('promises')),
        resolvers: getEntries(kernelSlotToVatSlot.get('resolvers')),
      },
      // imports, deviceImports, promises, resolvers
      vatSlotToKernelSlot: {
        imports: getEntries(vatSlotToKernelSlot.get('imports')),
        deviceImports: getEntries(vatSlotToKernelSlot.get('deviceImports')),
        promises: getEntries(vatSlotToKernelSlot.get('promises')),
        resolvers: getEntries(vatSlotToKernelSlot.get('resolvers')),
      },

      nextImportID: kvstore.get('nextImportID'),
      nextPromiseID: kvstore.get('nextPromiseID'),
      nextResolverID: kvstore.get('nextResolverID'),
      nextDeviceImportID: kvstore.get('nextDeviceImportID'),

      transcript: kvstore.get('transcript'),
    };
  }

  function getCurrentState() {
    return { transcript: Array.from(kvstore.get('transcript')) };
  }

  function addToTranscript(msg) {
    const transcript = kvstore.get('transcript');
    transcript.push(msg);
  }

  // pretty print for logging and testing
  function dumpState(vatID) {
    const res = [];

    function printSlots(vatSlot) {
      const { table, key } = getVatSlotTypedMapAndKey(vatSlot);
      const kernelSlot = table.get(key);
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

    const kernelSlotToVatSlot = kvstore.get('kernelSlotToVatSlot');

    getEntries(kernelSlotToVatSlot.get('exports')).forEach(printSlots);
    getEntries(kernelSlotToVatSlot.get('devices')).forEach(printSlots);
    getEntries(kernelSlotToVatSlot.get('promises')).forEach(printSlots);
    getEntries(kernelSlotToVatSlot.get('resolvers')).forEach(printSlots);

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
