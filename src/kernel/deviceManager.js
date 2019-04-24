import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function makeDeviceManager(
  deviceName,
  syscallManager,
  setup,
  helpers,
  endowments,
) {
  const { kdebug, send, log } = syscallManager;

  // per-device translation tables
  const tables = {
    imports: harden({
      outbound: new Map(),
      inbound: new Map(),
    }),
    // make these IDs start at different values to detect errors better
    nextImportID: 10,
  };

  function mapOutbound(slot) {
    // kdebug(`mapOutbound ${JSON.stringify(slot)}`);
    if (slot.type === 'deviceExport') {
      // one of our exports, so just make the deviceName explicit
      Nat(slot.id);
      return { type: 'device', deviceName, id: slot.id };
    }

    if (slot.type === 'import') {
      // an import from somewhere else, so look in the sending Vat's table to
      // translate into absolute form
      Nat(slot.id);
      return tables.imports.outbound.get(slot.id);
    }

    throw Error(`unknown slot.type '${slot.type}'`);
  }

  function allocateImportIndex() {
    const i = tables.nextImportID;
    tables.nextImportID = i + 1;
    return i;
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapInbound(slot) {
    kdebug(`mapInbound for device-${deviceName} of ${JSON.stringify(slot)}`);

    if (slot.type === 'device') {
      const { deviceName: fromDeviceName, id } = slot;
      Nat(id);

      if (deviceName !== fromDeviceName) {
        throw new Error(
          `devices cannot accept external device refs: ${JSON.stringify(slot)}`,
        );
      }
      // this is returning home, so it's one of our own exports
      return { type: 'deviceExport', id };
    }

    if (slot.type === 'export') {
      const { vatID: fromVatID, id } = slot;
      Nat(id);

      const m = tables.imports;
      const key = `${slot.type}.${fromVatID}.${id}`; // ugh javascript
      if (!m.inbound.has(key)) {
        // must add both directions
        const newSlotID = Nat(allocateImportIndex());
        // kdebug(` adding ${newSlotID}`);
        m.inbound.set(key, newSlotID);
        m.outbound.set(
          newSlotID,
          harden({ type: 'export', vatID: fromVatID, id }), // TODO just 'slot'?
        );
      }
      return { type: 'import', id: m.inbound.get(key) };
    }

    throw Error(`unknown type '${slot.type}'`);
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSendOnly(targetSlot, method, argsString, vatSlots) {
    if (targetSlot.type === undefined) {
      throw new Error(
        `targetSlot isn't really a slot ${JSON.stringify(targetSlot)}`,
      );
    }
    const target = mapOutbound(targetSlot);
    if (!target) {
      throw Error(
        `unable to find target for ${deviceName}/${targetSlot.type}-${
          targetSlot.id
        }`,
      );
    }
    kdebug(
      `syscall[${deviceName}].send(vat:${JSON.stringify(
        targetSlot,
      )}=ker:${JSON.stringify(target)}).${method}`,
    );
    const slots = vatSlots.map(slot => mapOutbound(slot));
    kdebug(`  ^target is ${JSON.stringify(target)}`);
    const msg = {
      method,
      argsString,
      slots,
      kernelResolverID: undefined,
    };
    send(target, msg);
  }

  const syscall = harden({
    sendOnly(...args) {
      return doSendOnly(...args);
    },

    log(str) {
      log.push(`${str}`);
    },
  });

  // now build the runtime, which gives us back a dispatch function

  const dispatch = setup(syscall, helpers, endowments);

  // dispatch handlers: these are used by the kernel core

  function invoke(target, method, data, slots) {
    if (target.type !== 'device' || target.deviceName !== deviceName) {
      throw new Error(`not for me ${JSON.stringify(target)}`);
    }
    const inputSlots = slots.map(slot => mapInbound(slot));
    try {
      const results = dispatch.invoke(target.id, method, data, inputSlots);
      const resultSlots = results.slots.map(slot => mapOutbound(slot));
      console.log(`about to return`, results.data, resultSlots);
      return { data: results.data, slots: resultSlots };
    } catch (e) {
      console.log(
        `device[${deviceName}][${target.id}].${method} invoke failed`,
      );
      return { results: `ERROR: ${e}`, slots: [] };
    }
  }

  function getCurrentState() {
    return harden({}); // TODO
  }

  const manager = { invoke, getCurrentState };
  return manager;
}
