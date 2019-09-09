import harden from '@agoric/harden';
import { insist } from '../../insist';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';

// makeVatKeeper is a pure function: all state is kept in the argument object

export default function makeVatKeeper(
  state,
  vatID,
  addKernelObject,
  addKernelPromise,
) {
  function createStartingVatState() {
    state.kernelSlotToVatSlot = {}; // kpNN -> p+NN, etc
    state.vatSlotToKernelSlot = {}; // p+NN -> kpNN, etc

    state.nextObjectID = 50;
    state.nextPromiseID = 60;
    state.nextDeviceID = 70;

    state.transcript = [];
  }

  function insistVatSlotType(type, slot) {
    insist(
      type === parseVatSlot(slot).type,
      `vatSlot ${slot} is not of type ${type}`,
    );
  }

  function mapVatSlotToKernelSlot(vatSlot) {
    insist(`${vatSlot}` === vatSlot, 'non-string vatSlot');
    const existing = state.vatSlotToKernelSlot[vatSlot];
    if (existing === undefined) {
      const { type, allocatedByVat } = parseVatSlot(vatSlot);

      if (allocatedByVat) {
        let kernelSlot;
        if (type === 'object') {
          kernelSlot = addKernelObject(vatID);
        } else if (type === 'device') {
          throw new Error(`normal vats aren't allowed to export device nodes`);
        } else if (type === 'promise') {
          kernelSlot = addKernelPromise(vatID);
        } else {
          throw new Error(`unknown type ${type}`);
        }
        state.vatSlotToKernelSlot[vatSlot] = kernelSlot;
        state.kernelSlotToVatSlot[kernelSlot] = vatSlot;
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        throw new Error(`unknown vatSlot ${vatSlot}`);
      }
    }

    return state.vatSlotToKernelSlot[vatSlot];
  }

  function mapKernelSlotToVatSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    const existing = state.kernelSlotToVatSlot[kernelSlot];
    if (existing === undefined) {
      const { type } = parseKernelSlot(kernelSlot);

      let vatSlot;
      if (type === 'object') {
        const id = state.nextObjectID;
        state.nextObjectID += 1;
        vatSlot = makeVatSlot(type, false, id);
      } else if (type === 'device') {
        const id = state.nextDeviceID;
        state.nextDeviceID += 1;
        vatSlot = makeVatSlot(type, false, id);
      } else if (type === 'promise') {
        const id = state.nextPromiseID;
        state.nextPromiseID += 1;
        vatSlot = makeVatSlot(type, false, id);
      } else {
        throw new Error(`unknown type ${type}`);
      }

      state.vatSlotToKernelSlot[vatSlot] = kernelSlot;
      state.kernelSlotToVatSlot[kernelSlot] = vatSlot;
    }

    return state.kernelSlotToVatSlot[kernelSlot];
  }

  function getTranscript() {
    return Array.from(state.transcript);
  }

  function addToTranscript(msg) {
    state.transcript.push(msg);
  }

  // pretty print for logging and testing
  function dumpState() {
    const res = [];
    Object.getOwnPropertyNames(state.kernelSlotToVatSlot).forEach(ks => {
      const vs = state.kernelSlotToVatSlot[ks];
      res.push([ks, vatID, vs]);
    });
    return harden(res);
  }

  return harden({
    createStartingVatState,
    mapVatSlotToKernelSlot,
    mapKernelSlotToVatSlot,
    getTranscript,
    dumpState,
    addToTranscript,
    insistVatSlotType,
  });
}
