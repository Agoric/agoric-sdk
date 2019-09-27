import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { insist } from '../../insist';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';
import { insistDeviceID } from '../id';

export function initializeDeviceState(state, deviceID) {
  state[`${deviceID}.o.nextID`] = '10';
}

export function makeDeviceKeeper(state, deviceID, addKernelDeviceNode) {
  insistDeviceID(deviceID);

  function stateHasKey(name) {
    return Object.prototype.hasOwnProperty.call(state, name);
  }

  function mapDeviceSlotToKernelSlot(devSlot) {
    insist(`${devSlot}` === devSlot, 'non-string devSlot');
    // kdebug(`mapOutbound ${devSlot}`);
    const devKey = `${deviceID}.c.${devSlot}`;
    if (!stateHasKey(devKey)) {
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
        state[kernelKey] = devSlot;
        state[devKey] = kernelSlot;
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        throw new Error(`unknown devSlot ${devSlot}`);
      }
    }

    return state[devKey];
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapKernelSlotToDeviceSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    const kernelKey = `${deviceID}.c.${kernelSlot}`;
    if (!stateHasKey(kernelKey)) {
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(Number(state[`${deviceID}.o.nextID`]));
        state[`${deviceID}.o.nextID`] = `${id + 1}`;
      } else if (type === 'device') {
        throw new Error('devices cannot import other device nodes');
      } else if (type === 'promise') {
        throw new Error('devices cannot import Promises');
      } else {
        throw new Error(`unknown type ${type}`);
      }
      const devSlot = makeVatSlot(type, false, id);

      const devKey = `${deviceID}.c.${devSlot}`;
      state[devKey] = kernelSlot;
      state[kernelKey] = devSlot;
    }

    return state[kernelKey];
  }

  function getDeviceState() {
    // this should return an object, generally CapData, or undefined
    const key = `${deviceID}.deviceState`;
    if (stateHasKey(key)) {
      return JSON.parse(state[key]);
      // todo: formalize the CapData, and store .deviceState.body, and
      // .deviceState.slots as 'vatSlot[,vatSlot..]'
    }
    return undefined;
  }

  function setDeviceState(value) {
    state[`${deviceID}.deviceState`] = JSON.stringify(value);
  }

  function dumpState() {
    const res = [];
    const prefix = `${deviceID}.c.`;
    // todo: db.getKeys(start='${deviceID}.c.', end='${deviceID}.c/')
    for (const k of Object.getOwnPropertyNames(state)) {
      if (k.startsWith(prefix)) {
        const slot = k.slice(prefix.length);
        if (!slot.startsWith('k')) {
          const devSlot = slot;
          const kernelSlot = state[k];
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
