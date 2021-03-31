/**
 * Kernel's keeper of persistent state for a vat.
 */

import { Nat } from '@agoric/nat';
import { assert, details as X, q } from '@agoric/assert';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';
import { insistVatID } from '../id';
import { kdebug } from '../kdebug';

// makeVatKeeper is a pure function: all state is kept in the argument object

// TODO: tests rely on these numbers and haven't been updated to use names.
const FIRST_OBJECT_ID = 50n;
const FIRST_PROMISE_ID = 60n;
const FIRST_DEVICE_ID = 70n;
const FIRST_TRANSCRIPT_ID = 0n;

/**
 * Establish a vat's state.
 *
 * @param {*} storage  The storage in which the persistent state will be kept
 * @param {string} vatID The vat ID string of the vat in question
 * TODO: consider making this part of makeVatKeeper
 */
export function initializeVatState(storage, vatID) {
  storage.set(`${vatID}.o.nextID`, `${FIRST_OBJECT_ID}`);
  storage.set(`${vatID}.p.nextID`, `${FIRST_PROMISE_ID}`);
  storage.set(`${vatID}.d.nextID`, `${FIRST_DEVICE_ID}`);
  storage.set(`${vatID}.t.nextID`, `${FIRST_TRANSCRIPT_ID}`);
}

/**
 * Produce a vat keeper for a vat.
 *
 * @param {*} storage  The storage in which the persistent state will be kept
 * @param {*} kernelSlog
 * @param {string} vatID  The vat ID string of the vat in question
 * @param {*} addKernelObject  Kernel function to add a new object to the kernel's
 * mapping tables.
 * @param {*} addKernelPromiseForVat  Kernel function to add a new promise to the
 * kernel's mapping tables.
 * @param {*} incrementRefCount
 * @param {*} decrementRefCount
 * @param {*} incStat
 * @param {*} decStat
 * @param {*} getCrankNumber
 * @returns {*} an object to hold and access the kernel's state for the given vat
 */
export function makeVatKeeper(
  storage,
  kernelSlog,
  vatID,
  addKernelObject,
  addKernelPromiseForVat,
  incrementRefCount,
  decrementRefCount,
  incStat,
  decStat,
  getCrankNumber,
) {
  insistVatID(vatID);

  function setSourceAndOptions(source, options) {
    // take care with API change
    assert(options.managerType, X`vat options missing managerType`);
    assert.typeof(source, 'object');
    assert(source.bundle || source.bundleName);
    assert.typeof(options, 'object');
    storage.set(`${vatID}.source`, JSON.stringify(source));
    storage.set(`${vatID}.options`, JSON.stringify(options));
  }

  function getSourceAndOptions() {
    const source = JSON.parse(storage.get(`${vatID}.source`));
    const options = JSON.parse(storage.get(`${vatID}.options`));
    return harden({ source, options });
  }

  /**
   * Provide the kernel slot corresponding to a given vat slot, creating the
   * kernel slot if it doesn't already exist.
   *
   * @param {string} vatSlot  The vat slot of interest
   *
   * @returns {string} the kernel slot that vatSlot maps to
   *
   * @throws {Error} if vatSlot is not a kind of thing that can be exported by vats
   *    or is otherwise invalid.
   */
  function mapVatSlotToKernelSlot(vatSlot) {
    assert.typeof(vatSlot, 'string', X`non-string vatSlot: ${vatSlot}`);
    const vatKey = `${vatID}.c.${vatSlot}`;
    if (!storage.has(vatKey)) {
      const { type, allocatedByVat } = parseVatSlot(vatSlot);

      if (allocatedByVat) {
        let kernelSlot;
        if (type === 'object') {
          kernelSlot = addKernelObject(vatID);
        } else if (type === 'device') {
          assert.fail(X`normal vats aren't allowed to export device nodes`);
        } else if (type === 'promise') {
          kernelSlot = addKernelPromiseForVat(vatID);
        } else {
          assert.fail(X`unknown type ${type}`);
        }
        incrementRefCount(kernelSlot, `${vatID}|vk|clist`);
        const kernelKey = `${vatID}.c.${kernelSlot}`;
        incStat('clistEntries');
        storage.set(kernelKey, vatSlot);
        storage.set(vatKey, kernelSlot);
        kernelSlog &&
          kernelSlog.changeCList(
            vatID,
            getCrankNumber(),
            'export',
            kernelSlot,
            vatSlot,
          );
        kdebug(`Add mapping v->k ${kernelKey}<=>${vatKey}`);
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        assert.fail(X`unknown vatSlot ${q(vatSlot)}`);
      }
    }

    return storage.get(vatKey);
  }

  /**
   * Provide the vat slot corresponding to a given kernel slot, including
   * creating the vat slot if it doesn't already exist.
   *
   * @param {string} kernelSlot  The kernel slot of interest
   *
   * @returns {string} the vat slot kernelSlot maps to
   *
   * @throws {Error} if kernelSlot is not a kind of thing that can be imported by vats
   *    or is otherwise invalid.
   */
  function mapKernelSlotToVatSlot(kernelSlot) {
    assert.typeof(kernelSlot, 'string', 'non-string kernelSlot');
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    if (!storage.has(kernelKey)) {
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(BigInt(storage.get(`${vatID}.o.nextID`)));
        storage.set(`${vatID}.o.nextID`, `${id + 1n}`);
      } else if (type === 'device') {
        id = Nat(BigInt(storage.get(`${vatID}.d.nextID`)));
        storage.set(`${vatID}.d.nextID`, `${id + 1n}`);
      } else if (type === 'promise') {
        id = Nat(BigInt(storage.get(`${vatID}.p.nextID`)));
        storage.set(`${vatID}.p.nextID`, `${id + 1n}`);
      } else {
        assert.fail(X`unknown type ${type}`);
      }
      incrementRefCount(kernelSlot, `${vatID}[kv|clist`);
      const vatSlot = makeVatSlot(type, false, id);

      const vatKey = `${vatID}.c.${vatSlot}`;
      incStat('clistEntries');
      storage.set(vatKey, kernelSlot);
      storage.set(kernelKey, vatSlot);
      kernelSlog &&
        kernelSlog.changeCList(
          vatID,
          getCrankNumber(),
          'import',
          kernelSlot,
          vatSlot,
        );
      kdebug(`Add mapping k->v ${kernelKey}<=>${vatKey}`);
    }

    return storage.get(kernelKey);
  }

  /**
   * Test if there's a c-list entry for some slot.
   *
   * @param {string} slot  The slot of interest
   *
   * @returns {boolean} true iff this vat has a c-list entry mapping for `slot`.
   */
  function hasCListEntry(slot) {
    return storage.has(`${vatID}.c.${slot}`);
  }

  /**
   * Remove an entry from the vat's c-list.
   *
   * @param {string} kernelSlot  The kernel slot being removed
   * @param {string} vatSlot  The vat slot being removed
   */
  function deleteCListEntry(kernelSlot, vatSlot) {
    parseKernelSlot(kernelSlot);
    parseVatSlot(vatSlot);
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const vatKey = `${vatID}.c.${vatSlot}`;
    kdebug(`Delete mapping ${kernelKey}<=>${vatKey}`);
    kernelSlog &&
      kernelSlog.changeCList(
        vatID,
        getCrankNumber(),
        'drop',
        kernelSlot,
        vatSlot,
      );
    if (storage.has(kernelKey)) {
      decrementRefCount(kernelSlot, `${vatID}|del|clist`);
      decStat('clistEntries');
      storage.delete(kernelKey);
      storage.delete(vatKey);
    }
  }

  function deleteCListEntriesForKernelSlots(kernelSlots) {
    for (const kernelSlot of kernelSlots) {
      const vatSlot = mapKernelSlotToVatSlot(kernelSlot);
      deleteCListEntry(kernelSlot, vatSlot);
    }
  }

  /**
   * Generator function to return the vat's transcript, one entry at a time.
   */
  function* getTranscript() {
    for (const value of storage.getPrefixedValues(`${vatID}.t.`)) {
      yield JSON.parse(value);
    }
  }

  /**
   * Append a message to the vat's transcript.
   *
   * @param {string} msg  The message to append.
   */
  function addToTranscript(msg) {
    const id = Nat(BigInt(storage.get(`${vatID}.t.nextID`)));
    storage.set(`${vatID}.t.nextID`, `${id + 1n}`);
    storage.set(`${vatID}.t.${id}`, JSON.stringify(msg));
  }

  function vatStats() {
    function getCount(key, first) {
      const id = Nat(BigInt(storage.get(key)));
      return id - Nat(first);
    }

    const objectCount = getCount(`${vatID}.o.nextID`, FIRST_OBJECT_ID);
    const promiseCount = getCount(`${vatID}.p.nextID`, FIRST_PROMISE_ID);
    const deviceCount = getCount(`${vatID}.d.nextID`, FIRST_DEVICE_ID);
    const transcriptCount = getCount(`${vatID}.t.nextID`, FIRST_TRANSCRIPT_ID);

    // TODO: Fix the downstream JSON.stringify to allow the counts to be BigInts
    return harden({
      objectCount: Number(objectCount),
      promiseCount: Number(promiseCount),
      deviceCount: Number(deviceCount),
      transcriptCount: Number(transcriptCount),
    });
  }

  /**
   * Produce a dump of this vat's state for debugging purposes.
   *
   * @returns {Array<[string, string, string]>} an array of this vat's state information
   */
  function dumpState() {
    const res = [];
    const prefix = `${vatID}.c.`;
    for (const k of storage.getKeys(prefix, `${vatID}.c/`)) {
      if (k.startsWith(prefix)) {
        const slot = k.slice(prefix.length);
        if (!slot.startsWith('k')) {
          const vatSlot = slot;
          const kernelSlot = storage.get(k);
          res.push([kernelSlot, vatID, vatSlot]);
        }
      }
    }
    return harden(res);
  }

  return harden({
    setSourceAndOptions,
    getSourceAndOptions,
    mapVatSlotToKernelSlot,
    mapKernelSlotToVatSlot,
    hasCListEntry,
    deleteCListEntry,
    deleteCListEntriesForKernelSlots,
    getTranscript,
    addToTranscript,
    vatStats,
    dumpState,
  });
}
