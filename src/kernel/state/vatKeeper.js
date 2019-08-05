import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../insist';

// makeVatKeeper is a pure function: all state is kept in the argument object

export default function makeVatKeeper(state) {

  function createStartingVatState() {
    // kernelSlotToVatSlot is an object with four properties:
    //    exports, devices, promises, resolvers.
    // vatSlotToKernelSlot has imports, deviceImports, promises,
    //    resolvers

    state.kernelSlotToVatSlot = {
      exports: {},
      devices: {},
      promises: {},
      resolvers: {},
    };
    state.vatSlotToKernelSlot = {
      imports: {},
      deviceImports: {},
      promises: {},
      resolvers: {},
    };

    state.nextIDs = {
      import: 10,
      promise: 20,
      resolver: 30,
      deviceImport: 40,
    };

    state.transcript = [];
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

    const tables = state.kernelSlotToVatSlot;

    switch (type) {
      case 'promise': {
        return {
          table: tables.promises,
          key: id,
        };
      }
      case 'resolver': {
        return {
          table: tables.resolvers,
          key: id,
        };
      }
      case 'export': {
        return {
          table: tables.exports,
          key: `${kernelSlot.vatID}-${id}`,
        };
      }
      case 'device': {
        return {
          table: tables.devices,
          key: `${kernelSlot.deviceName}-${id}`,
        };
      }
      default:
        throw new Error(`unexpected kernelSlot type ${kernelSlot.type}`);
    }
  }

  function getVatSlotTypedMapAndKey(vatSlot) {
    insistVatSlot(vatSlot);
    const { type, id } = vatSlot;

    const tables = state.vatSlotToKernelSlot;
    let table;
    // imports, deviceImports, promises, resolvers

    switch (type) {
      case 'import': {
        table = tables.imports;
        break;
      }
      case 'deviceImport': {
        table = tables.deviceImports;
        break;
      }
      case 'promise': {
        table = tables.promises;
        break;
      }
      case 'resolver': {
        table = tables.resolvers;
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
    const kernelSlot = table[key];
    if (kernelSlot === undefined) {
      throw new Error(`unknown ${vatSlot.type} slot '${vatSlot.id}'`);
    }
    return kernelSlot;
  }

  function mapKernelSlotToVatSlot(kernelSlot) {
    const { table, key } = getKernelSlotTypedMapAndKey(kernelSlot);
    if (!Object.hasOwnProperty(table, `${key}`)) {
      // must add both directions
      const vatSlotType = getVatSlotTypeFromKernelSlot(kernelSlot);
      const nextIDs = state.nextIDs;
      const newVatSlotID = nextIDs[vatSlotType];
      nextIDs[vatSlotType] = newVatSlotID + 1;
      const vatSlot = { type: vatSlotType, id: newVatSlotID };
      table[`${key}`] = vatSlot;
      const { table: vatSlotTable, key: vatSlotKey } = getVatSlotTypedMapAndKey(
        vatSlot,
      );
      vatSlotTable[vatSlotKey] = kernelSlot;
    }
    return table[`${key}`];
  }

  function getTranscript() {
    return Array.from(state.transcript);
  }

  function addToTranscript(msg) {
    state.transcript.push(msg);
  }

  // pretty print for logging and testing
  function dumpState(vatID) {
    const res = [];

    function printSlots(vatSlot) {
      const { table, key } = getVatSlotTypedMapAndKey(vatSlot);
      const kernelSlot = table[key];
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

    for (const n of ['exports', 'devices', 'promises', 'resolvers']) {
      const t = state.kernelSlotToVatSlot[n];
      Object.getOwnPropertyNames(t).forEach(name => printSlots(t[name]));
    }

    return harden(res);
  }

  return harden({
    createStartingVatState,
    mapVatSlotToKernelSlot,
    mapKernelSlotToVatSlot,
    getTranscript,
    dumpState,
    addToTranscript,
    insistKernelSlot,
    insistVatSlot,
  });
}
