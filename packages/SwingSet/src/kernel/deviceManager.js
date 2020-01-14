import harden from '@agoric/harden';
import { insist } from '../insist';
import { insistKernelType } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';

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
    const deviceSlot = deviceKeeper.mapKernelSlotToDeviceSlot(kernelSlot);
    kdebug(
      `mapInbound for device-${deviceName} of ${kernelSlot} to ${deviceSlot}`,
    );
    return deviceSlot;
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSendOnly(targetSlot, method, args) {
    insist(`${targetSlot}` === targetSlot, 'non-string targetSlot');
    insistVatType('object', targetSlot);
    insistCapData(args);
    const target = mapDeviceSlotToKernelSlot(targetSlot);
    insist(target, `unable to find target`);
    kdebug(`syscall[${deviceName}].send(${targetSlot}/${target}).${method}`);
    kdebug(`  ^target is ${target}`);
    const msg = {
      method,
      args: {
        ...args,
        slots: args.slots.map(slot => mapDeviceSlotToKernelSlot(slot)),
      },
      result: null,
    };
    insistMessage(msg);
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

  function invoke(target, method, args) {
    insistKernelType('device', target);
    insistCapData(args);
    const t = mapKernelSlotToDeviceSlot(target);
    insist(parseVatSlot(t).allocatedByVat, 'not allocated by me');
    try {
      const results = dispatch.invoke(t, method, {
        ...args,
        slots: args.slots.map(slot => mapKernelSlotToDeviceSlot(slot)),
      });
      return harden({
        ...results,
        slots: results.slots.map(slot => mapDeviceSlotToKernelSlot(slot)),
      });
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
