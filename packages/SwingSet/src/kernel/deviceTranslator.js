import { assert, details as X } from '@agoric/assert';
import { insistMessage } from '../message';
import { insistKernelType } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';
import { kdebug } from './kdebug';

/*
 * Return a function that converts KernelInvocation objects into
 * DeviceInvocation objects
 */
export function makeKDTranslator(deviceID, kernelKeeper) {
  const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
  const { mapKernelSlotToDeviceSlot } = deviceKeeper;

  function kernelInvocationToDeviceInvocation(kernelInvocation) {
    const [target, method, args] = kernelInvocation;
    insistKernelType('device', target);
    insistCapData(args);
    const targetSlot = mapKernelSlotToDeviceSlot(target);
    const { allocatedByVat } = parseVatSlot(targetSlot);
    assert(allocatedByVat, X`invoke() to someone else's device`);
    const slots = args.slots.map(slot => mapKernelSlotToDeviceSlot(slot));
    const deviceArgs = { ...args, slots };
    const deviceInvocation = harden([targetSlot, method, deviceArgs]);
    return deviceInvocation;
  }

  return kernelInvocationToDeviceInvocation;
}

/* Return a function that converts DeviceInvocationResult data into
 * KernelInvocationResult data
 */

function makeDRTranslator(deviceID, kernelKeeper) {
  const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
  const { mapDeviceSlotToKernelSlot } = deviceKeeper;

  function deviceResultToKernelResult(deviceInvocationResult) {
    // deviceInvocationResult is ['ok', capdata]
    const [successFlag, devData] = deviceInvocationResult;
    assert(successFlag === 'ok');
    insistCapData(devData);
    const kData = {
      ...devData,
      slots: devData.slots.map(slot => mapDeviceSlotToKernelSlot(slot)),
    };
    return harden(['ok', kData]);
  }
  return deviceResultToKernelResult;
}

/*
 * return a function that converts DeviceSyscall objects into KernelSyscall
 * objects
 */
export function makeDSTranslator(deviceID, deviceName, kernelKeeper) {
  const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
  const { mapDeviceSlotToKernelSlot } = deviceKeeper;

  // syscall.sendOnly is translated into a kernel send() with result=null
  function translateSendOnly(targetSlot, method, args) {
    assert.typeof(targetSlot, 'string', 'non-string targetSlot');
    insistVatType('object', targetSlot);
    insistCapData(args);
    const target = mapDeviceSlotToKernelSlot(targetSlot);
    assert(target, 'unable to find target');
    kdebug(`syscall[${deviceName}].send(${targetSlot}/${target}).${method}`);
    kdebug(`  ^target is ${target}`);
    const msg = harden({
      method,
      args: {
        ...args,
        slots: args.slots.map(slot => mapDeviceSlotToKernelSlot(slot)),
      },
      result: null, // this makes it sendOnly
    });
    insistMessage(msg);
    const ks = harden(['send', target, msg]);
    return ks;
  }

  // vsc is [type, ...args]
  // ksc is:
  //  ['send', ktarget, kmsg]
  function deviceSyscallToKernelSyscall(vsc) {
    const [type, ...args] = vsc;
    switch (type) {
      case 'sendOnly':
        return translateSendOnly(...args); // becomes ['send' .. result=null]
      default:
        assert.fail(X`unknown deviceSyscall type ${type}`);
    }
  }

  return deviceSyscallToKernelSyscall;
}

export function makeDeviceTranslators(deviceID, deviceName, kernelKeeper) {
  return harden({
    kernelInvocationToDeviceInvocation: makeKDTranslator(
      deviceID,
      kernelKeeper,
    ),
    deviceResultToKernelResult: makeDRTranslator(deviceID, kernelKeeper),
    deviceSyscallToKernelSyscall: makeDSTranslator(
      deviceID,
      deviceName,
      kernelKeeper,
    ),
    // no syscall results translator: devices cannot do syscall.callNow()
  });
}
