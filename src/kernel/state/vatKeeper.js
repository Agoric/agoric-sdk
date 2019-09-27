import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { enumerateKeys } from './keyutil';
import { insist } from '../../insist';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';
import { insistVatID } from '../id';

// makeVatKeeper is a pure function: all state is kept in the argument object

export function initializeVatState(state, vatID) {
  state[`${vatID}.o.nextID`] = '50';
  state[`${vatID}.p.nextID`] = '60';
  state[`${vatID}.d.nextID`] = '70';
  state[`${vatID}.t.nextID`] = '0';
}

export function makeVatKeeper(state, vatID, addKernelObject, addKernelPromise) {
  insistVatID(vatID);

  function stateHasKey(name) {
    return Object.prototype.hasOwnProperty.call(state, name);
  }

  function mapVatSlotToKernelSlot(vatSlot) {
    insist(`${vatSlot}` === vatSlot, 'non-string vatSlot');
    const vatKey = `${vatID}.c.${vatSlot}`;
    if (!stateHasKey(vatKey)) {
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
        const kernelKey = `${vatID}.c.${kernelSlot}`;
        state[kernelKey] = vatSlot;
        state[vatKey] = kernelSlot;
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        throw new Error(`unknown vatSlot ${vatSlot}`);
      }
    }

    return state[vatKey];
  }

  function mapKernelSlotToVatSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    if (!stateHasKey(kernelKey)) {
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(Number(state[`${vatID}.o.nextID`]));
        state[`${vatID}.o.nextID`] = `${id + 1}`;
      } else if (type === 'device') {
        id = Nat(Number(state[`${vatID}.d.nextID`]));
        state[`${vatID}.d.nextID`] = `${id + 1}`;
      } else if (type === 'promise') {
        id = Nat(Number(state[`${vatID}.p.nextID`]));
        state[`${vatID}.p.nextID`] = `${id + 1}`;
      } else {
        throw new Error(`unknown type ${type}`);
      }
      const vatSlot = makeVatSlot(type, false, id);

      const vatKey = `${vatID}.c.${vatSlot}`;
      state[vatKey] = kernelSlot;
      state[kernelKey] = vatSlot;
    }

    return state[kernelKey];
  }

  function* getTranscript() {
    const prefix = `${vatID}.t.`;
    for (const [, , value] of enumerateKeys(state, prefix)) {
      yield JSON.parse(value);
    }
  }

  function addToTranscript(msg) {
    const id = Nat(Number(state[`${vatID}.t.nextID`]));
    state[`${vatID}.t.nextID`] = `${id + 1}`;
    state[`${vatID}.t.${id}`] = JSON.stringify(msg);
  }

  // pretty print for logging and testing
  function dumpState() {
    const res = [];
    const prefix = `${vatID}.c.`;
    // todo: db.getKeys(start='${vatID}.c.', end='${vatID}.c/')
    for (const k of Object.getOwnPropertyNames(state)) {
      if (k.startsWith(prefix)) {
        const slot = k.slice(prefix.length);
        if (!slot.startsWith('k')) {
          const vatSlot = slot;
          const kernelSlot = state[k];
          res.push([kernelSlot, vatID, vatSlot]);
        }
      }
    }
    return harden(res);
  }

  return harden({
    mapVatSlotToKernelSlot,
    mapKernelSlotToVatSlot,
    getTranscript,
    addToTranscript,
    dumpState,
  });
}
