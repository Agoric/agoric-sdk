import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../../insist';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';
import { insistDeviceID } from '../id';

export function initializeDeviceState(storage, deviceID) {
  storage.set(`${deviceID}.o.nextID`, '10');
}

export function makeDeviceKeeper(storage, deviceID, addKernelDeviceNode) {
  insistDeviceID(deviceID);

  function mapDeviceSlotToKernelSlot(devSlot) {
    insist(`${devSlot}` === devSlot, 'non-string devSlot');
    // kdebug(`mapOutbound ${devSlot}`);
    const devKey = `${deviceID}.c.${devSlot}`;
    if (!storage.has(devKey)) {
      const { type, allocatedByVat } = parseVatSlot(devSlot);

      if (allocatedByVat) {
        let kernelSlot;
        if (type === 'object') {
          throw new Error(`devices cannot export Objects`);
        } else if (type === 'promise') {
          throw new Error(`devices cannot export Promises`);
        } else if (type === 'device') {
          kernelSlot = addKernelDeviceNode(deviceID);
        } else {
          throw new Error(`unknown type ${type}`);
        }
        const kernelKey = `${deviceID}.c.${kernelSlot}`;
        storage.set(kernelKey, devSlot);
        storage.set(devKey, kernelSlot);
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        throw new Error(`unknown devSlot ${devSlot}`);
      }
    }

    return storage.get(devKey);
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapKernelSlotToDeviceSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    const kernelKey = `${deviceID}.c.${kernelSlot}`;
    if (!storage.has(kernelKey)) {
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(Number(storage.get(`${deviceID}.o.nextID`)));
        storage.set(`${deviceID}.o.nextID`, `${id + 1}`);
      } else if (type === 'device') {
        throw new Error('devices cannot import other device nodes');
      } else if (type === 'promise') {
        throw new Error('devices cannot import Promises');
      } else {
        throw new Error(`unknown type ${type}`);
      }
      const devSlot = makeVatSlot(type, false, id);

      const devKey = `${deviceID}.c.${devSlot}`;
      storage.set(devKey, kernelSlot);
      storage.set(kernelKey, devSlot);
    }

    return storage.get(kernelKey);
  }

  function getDeviceState() {
    // this should return an object, generally CapData, or undefined
    const key = `${deviceID}.deviceState`;
    if (storage.has(key)) {
      return JSON.parse(storage.get(key));
      // todo: formalize the CapData, and store .deviceState.body, and
      // .deviceState.slots as 'vatSlot[,vatSlot..]'
    }
    return undefined;
  }

  function setDeviceState(value) {
    storage.set(`${deviceID}.deviceState`, JSON.stringify(value));
  }

  function dumpState() {
    const res = [];
    const prefix = `${deviceID}.c.`;
    for (const k of storage.getKeys(prefix, `${deviceID}.c/`)) {
      if (k.startsWith(prefix)) {
        const slot = k.slice(prefix.length);
        if (!slot.startsWith('k')) {
          const devSlot = slot;
          const kernelSlot = storage.get(k);
          res.push([kernelSlot, deviceID, devSlot]);
        }
      }
    }
    return harden(res);
  }

  return harden({
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
    getDeviceState,
    setDeviceState,
    dumpState,
  });
}
