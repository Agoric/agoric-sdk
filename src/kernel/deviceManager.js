import harden from '@agoric/harden';
import { insist } from './insist';
import { insistKernelType } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../vats/parseVatSlots';

export default function makeDeviceManager(
  deviceName,
  syscallManager,
  setup,
  helpers,
  endowments,
  deviceKeeper,
) {
  const { kdebug, send, log } = syscallManager;

  function mapDeviceSlotToKernelSlot(devSlot) {
    insist(`${devSlot}` === devSlot, 'non-string devSlot');
    // kdebug(`mapOutbound ${devSlot}`);
    return deviceKeeper.mapDeviceSlotToKernelSlot(devSlot);
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapKernelSlotToDeviceSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    kdebug(`mapInbound for device-${deviceName} of ${kernelSlot}`);
    return deviceKeeper.mapKernelSlotToDeviceSlot(kernelSlot);
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSendOnly(targetSlot, method, argsString, vatSlots) {
    insist(`${targetSlot}` === targetSlot, 'non-string targetSlot');
    insistVatType('object', targetSlot);
    const target = mapDeviceSlotToKernelSlot(targetSlot);
    insist(target, `unable to find target`);
    kdebug(`syscall[${deviceName}].send(${targetSlot}/${target}).${method}`);
    const slots = vatSlots.map(slot => mapDeviceSlotToKernelSlot(slot));
    kdebug(`  ^target is ${target}`);
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

  // Devices are allowed to get their state at startup, and set it anytime.
  // They do not use orthogonal persistence or transcripts.
  const state = harden({
    get() {
      return deviceKeeper.getDeviceState();
    },
    set(value) {
      deviceKeeper.setDeviceState(value);
    },
  });

  // now build the runtime, which gives us back a dispatch function

  const dispatch = setup(syscall, state, helpers, endowments);

  // dispatch handlers: these are used by the kernel core

  function invoke(target, method, data, slots) {
    insistKernelType('device', target);
    const t = mapKernelSlotToDeviceSlot(target);
    insist(parseVatSlot(t).allocatedByVat, 'not allocated by me');
    const inputSlots = slots.map(slot => mapKernelSlotToDeviceSlot(slot));
    try {
      const results = dispatch.invoke(t, method, data, inputSlots);
      const resultSlots = results.slots.map(slot =>
        mapDeviceSlotToKernelSlot(slot),
      );
      return { data: results.data, slots: resultSlots };
    } catch (e) {
      console.log(
        `device[${deviceName}][${t}].${method} invoke failed: ${e}`,
        e,
      );
      return { data: `ERROR: ${e}`, slots: [] };
    }
  }

  const manager = {
    invoke,
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
  };
  return manager;
}
