import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import { insistKernelType } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';
import kdebug from './kdebug';

/**
 * Produce an object that will serve as the kernel's handle onto a device.
 *
 * @param deviceName  The device's name, for human readable diagnostics
 * @param syscallManager  The kernel's syscall interface
 * @param setup  The device's own setup function
 * @param helpers Generally useful kernel functions that aren't part of the
 *    syscall interface
 * @param endowments  The device's configured endowments
 * @param deviceKeeper  The keeper of the device's persistent state
 */
export default function makeDeviceManager(
  deviceName,
  syscallManager,
  setup,
  helpers,
  endowments,
  deviceKeeper,
) {
  const { send, log } = syscallManager;

  /**
   * Provide the kernel slot corresponding to a given device slot.
   *
   * @param devSlot  The device slot of interest
   *
   * @return the kernel slot that devSlot maps to
   *
   * @throws if devSlot is not a kind of thing that can be exported by devices
   *    or is otherwise invalid.
   */
  function mapDeviceSlotToKernelSlot(devSlot) {
    assert.equal(
      devSlot,
      `${devSlot}`,
      details`non-string devSlot: ${devSlot}`,
    );
    // kdebug(`mapOutbound ${devSlot}`);
    return deviceKeeper.mapDeviceSlotToKernelSlot(devSlot);
  }

  /**
   * Provide the device slot corresponding to a given kernel slot.
   *
   * This is used when building the arguments for dispatch.invoke.
   *
   * @param kernelSlot  The kernel slot of interest
   *
   * @return the device slot kernelSlot maps to
   *
   * @throws if kernelSlot is not a kind of thing that can be imported by
   *    devices or is otherwise invalid.
   */
  function mapKernelSlotToDeviceSlot(kernelSlot) {
    assert.typeof(kernelSlot, 'string', 'non-string kernelSlot');
    const deviceSlot = deviceKeeper.mapKernelSlotToDeviceSlot(kernelSlot);
    kdebug(
      `mapInbound for device-${deviceName} of ${kernelSlot} to ${deviceSlot}`,
    );
    return deviceSlot;
  }

  /**
   * Wrapper for the syscall 'send' method to be made available to userspace
   * device code.  Does some type validation and maps slots from device space
   * to kernel space.
   *
   * @param targetSlot  Target of the message send.  Must be an object slot.
   * @param method  A string naming the method to be invoked.
   * @param args  A capdata object containing the message arguments.
   */
  function doSendOnly(targetSlot, method, args) {
    assert.typeof(targetSlot, 'string', 'non-string targetSlot');
    insistVatType('object', targetSlot);
    insistCapData(args);
    const target = mapDeviceSlotToKernelSlot(targetSlot);
    assert(target, 'unable to find target');
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

  // Wrapped syscall interface to give to the device.  The device is only given
  // the wrapped 'sendOnly' and 'log'.
  const syscall = harden({
    sendOnly(...args) {
      return doSendOnly(...args);
    },

    log(str) {
      log.push(`${str}`);
    },
  });

  // Wrapper for state, to give to the device to access its state.
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

  // Setting up the device runtime gives us back the device's dispatch object
  const dispatch = setup(syscall, state, helpers, endowments);

  /**
   * Invoke a method on a device node.
   *
   * @param target  Kernel slot designating the device node that is the target
   *    of the invocation
   * @param method  A string naming the method to be invoked
   * @param args  A capdata object containing the arguments to the invocation
   *
   * @return a capdata object containing the result of the invocation, or an
   *    error data object if the invocation threw an exception
   */
  function invoke(target, method, args) {
    insistKernelType('device', target);
    insistCapData(args);
    const t = mapKernelSlotToDeviceSlot(target);
    assert(parseVatSlot(t).allocatedByVat, 'not allocated by me');
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
      console.debug(
        `device[${deviceName}][${t}].${method} invoke failed: ${e}`,
        e,
      );
      return { body: `ERROR: ${e}`, slots: [] };
    }
  }

  const manager = {
    invoke,
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
  };
  return manager;
}
