import harden from '@agoric/harden';
import Nat from '@agoric/nat';

import makeKVStore from './kvstore';
import makeDeviceKeeper from './state/deviceKeeper';

export default function makeDeviceManager(
  deviceName,
  syscallManager,
  setup,
  helpers,
  endowments,
  kernelKeeper,
) {
  const { kdebug, send, log } = syscallManager;

  // per-device translation tables
  const deviceStartingState = {
    imports: makeKVStore({
      outbound: makeKVStore({}),
      inbound: makeKVStore({}),
    }),
    // make these IDs start at different values to detect errors better
    nextImportID: 10,
  };

  const deviceKVStore = makeKVStore(deviceStartingState);
  kernelKeeper.addDevice(deviceName, deviceKVStore);

  const deviceKeeper = makeDeviceKeeper(kernelKeeper.getDevice(deviceName));

  function mapDeviceSlotToKernelSlot(slot) {
    // kdebug(`mapOutbound ${JSON.stringify(slot)}`);
    if (slot.type === 'deviceExport') {
      // one of our exports, so just make the deviceName explicit
      Nat(slot.id);
      return { type: 'device', deviceName, id: slot.id };
    }

    return deviceKeeper.mapDeviceSlotToKernelSlot(slot);
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapKernelSlotToDeviceSlot(slot) {
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

    return deviceKeeper.mapKernelSlotToDeviceSlot(slot);
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSendOnly(targetSlot, method, argsString, vatSlots) {
    if (targetSlot.type === undefined) {
      throw new Error(
        `targetSlot isn't really a slot ${JSON.stringify(targetSlot)}`,
      );
    }
    const target = mapDeviceSlotToKernelSlot(targetSlot);
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
    const slots = vatSlots.map(slot => mapDeviceSlotToKernelSlot(slot));
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
    const inputSlots = slots.map(slot => mapKernelSlotToDeviceSlot(slot));
    try {
      const results = dispatch.invoke(target.id, method, data, inputSlots);
      const resultSlots = results.slots.map(slot =>
        mapDeviceSlotToKernelSlot(slot),
      );
      console.log(`about to return`, results.data, resultSlots);
      return { data: results.data, slots: resultSlots };
    } catch (e) {
      console.log(
        `device[${deviceName}][${target.id}].${method} invoke failed: ${e}`,
      );
      return { data: `ERROR: ${e}`, slots: [] };
    }
  }

  function loadState(savedState) {
    deviceKeeper.loadManagerState(savedState.managerState);
    // dispatch.setState(savedState.deviceState);
  }

  function getCurrentState() {
    return harden({
      managerState: deviceKeeper.getManagerState(),
      // deviceState: dispatch.getState(),
    });
  }

  const manager = {
    invoke,
    getCurrentState,
    loadState,
  };
  return manager;
}
