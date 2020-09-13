import { assert } from '@agoric/assert';
import { makeDeviceSlots } from './deviceSlots';
import { insistCapData } from '../capdata';

/* The DeviceManager is much simpler than the VatManager, because the feature
 * set is smaller:
 *  * the only Delivery is `invoke`
 *  * the only exported references are "device nodes" (d+NN)
 *  * the only syscall is `sendOnly`
 *  * the only imported references are objects (o-NN)
 *  * no transcript or orthogonal persistence
 *  * no promises (imported or exported)
 */

/**
 * Produce an object that will serve as the kernel's handle onto a device.
 *
 * @param {string} deviceName  The device's name, for human readable diagnostics
 * @param {*} buildRootDeviceNode
 * @param {*} state  A get/set object for the device's persistent state
 * @param {Record<string, any>} endowments  The device's configured endowments
 * @param {*} testLog
 */
export default function makeDeviceManager(
  deviceName,
  buildRootDeviceNode,
  state,
  endowments,
  testLog,
) {
  let deviceSyscallHandler;
  function setDeviceSyscallHandler(handler) {
    deviceSyscallHandler = handler;
  }

  const syscall = harden({
    sendOnly: (target, method, args) => {
      const dso = harden(['sendOnly', target, method, args]);
      deviceSyscallHandler(dso);
    },
  });

  // Setting up the device runtime gives us back the device's dispatch object
  const dispatch = makeDeviceSlots(
    syscall,
    state,
    buildRootDeviceNode,
    deviceName,
    endowments,
    testLog,
  );

  /**
   * @typedef {Object} CapData
   * @property {string} body
   * @property {Array<string>} slots
   */
  /**
   * @typedef {['ok', CapData]} VatInvocationResults
   */
  /**
   * Invoke a method on a device node.
   *
   * @param {[string, string, CapData]} deviceInvocation
   * @returns {VatInvocationResults} a VatInvocationResults object
   * Throws an exeption if the invocation failed. This exception is fatal to
   * the kernel.
   */
  function invoke(deviceInvocation) {
    const [target, method, args] = deviceInvocation;
    const deviceResults = dispatch.invoke(target, method, args);
    assert(deviceResults.length === 2);
    assert(deviceResults[0] === 'ok');
    insistCapData(deviceResults[1]);
    return deviceResults;
  }

  const manager = {
    invoke,
    setDeviceSyscallHandler,
  };
  return manager;
}
