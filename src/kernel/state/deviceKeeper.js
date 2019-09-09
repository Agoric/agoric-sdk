import harden from '@agoric/harden';
import { insist } from '../../insist';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';

// makeVatKeeper is a pure function: all state is kept in the argument object

function makeDeviceKeeper(state, deviceName, addKernelObject, addKernelDevice) {
  function createStartingDeviceState() {
    state.kernelSlotToDevSlot = {}; // kdNN -> d+NN, koNN -> o-NN
    state.devSlotToKernelSlot = {}; // d+NN -> kdNN, o-NN -> koNN
    state.nextObjectID = 10; // for imports, the NN in o-NN
  }

  function mapDeviceSlotToKernelSlot(devSlot) {
    insist(`${devSlot}` === devSlot, 'non-string devSlot');
    // kdebug(`mapOutbound ${devSlot}`);
    const existing = state.devSlotToKernelSlot[devSlot];
    if (existing === undefined) {
      const { type, allocatedByVat } = parseVatSlot(devSlot);

      if (allocatedByVat) {
        let kernelSlot;
        if (type === 'object') {
          kernelSlot = addKernelObject(deviceName);
        } else if (type === 'promise') {
          throw new Error(`devices do not accept Promises`);
        } else if (type === 'device') {
          kernelSlot = addKernelDevice(deviceName);
        } else {
          throw new Error(`unknown type ${type}`);
        }
        state.devSlotToKernelSlot[devSlot] = kernelSlot;
        state.kernelSlotToDevSlot[kernelSlot] = devSlot;
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        throw new Error(`unknown devSlot ${devSlot}`);
      }
    }

    return state.devSlotToKernelSlot[devSlot];
  }

  // mapInbound: convert from absolute slot to deviceName-relative slot. This
  // is used when building the arguments for dispatch.invoke.
  function mapKernelSlotToDeviceSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    const existing = state.kernelSlotToDevSlot[kernelSlot];
    if (existing === undefined) {
      const { type } = parseKernelSlot(kernelSlot);

      let devSlot;
      if (type === 'object') {
        const id = state.nextObjectID;
        state.nextObjectID += 1;
        devSlot = makeVatSlot(type, false, id);
      } else if (type === 'device') {
        throw new Error('devices cannot import other device nodes');
      } else if (type === 'promise') {
        throw new Error('devices cannot import Promises');
      } else {
        throw new Error(`unknown type ${type}`);
      }

      state.devSlotToKernelSlot[devSlot] = kernelSlot;
      state.kernelSlotToDevSlot[kernelSlot] = devSlot;
    }

    return state.kernelSlotToDevSlot[kernelSlot];
  }

  function getDeviceState() {
    return state.deviceState;
  }

  function setDeviceState(value) {
    state.deviceState = value;
  }

  function dumpState() {
    const res = [];
    Object.getOwnPropertyNames(state.kernelSlotToDevSlot).forEach(ks => {
      const ds = state.kernelSlotToDevSlot[ks];
      res.push([ks, deviceName, ds]);
    });
    return harden(res);
  }

  return harden({
    createStartingDeviceState,
    mapDeviceSlotToKernelSlot,
    mapKernelSlotToDeviceSlot,
    getDeviceState,
    setDeviceState,
    dumpState,
  });
}

export default makeDeviceKeeper;
