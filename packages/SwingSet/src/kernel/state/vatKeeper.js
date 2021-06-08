/**
 * Kernel's keeper of persistent state for a vat.
 */

import { Nat } from '@agoric/nat';
import { assert, details as X, q } from '@agoric/assert';
import { parseKernelSlot } from '../parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../../parseVatSlots';
import { insistVatID } from '../id';
import { kdebug } from '../kdebug';
import {
  parseReachableAndVatSlot,
  buildReachableAndVatSlot,
} from './reachable';

// makeVatKeeper is a pure function: all state is kept in the argument object

// TODO: tests rely on these numbers and haven't been updated to use names.
const FIRST_OBJECT_ID = 50n;
const FIRST_PROMISE_ID = 60n;
const FIRST_DEVICE_ID = 70n;

/**
 * Establish a vat's state.
 *
 * @param {*} kvStore  The key-value store in which the persistent state will be kept
 * @param {*} streamStore  Accompanying stream store
 * @param {string} vatID The vat ID string of the vat in question
 * TODO: consider making this part of makeVatKeeper
 */
export function initializeVatState(kvStore, streamStore, vatID) {
  kvStore.set(`${vatID}.o.nextID`, `${FIRST_OBJECT_ID}`);
  kvStore.set(`${vatID}.p.nextID`, `${FIRST_PROMISE_ID}`);
  kvStore.set(`${vatID}.d.nextID`, `${FIRST_DEVICE_ID}`);
  kvStore.set(`${vatID}.nextDeliveryNum`, `0`);
  kvStore.set(
    `${vatID}.t.endPosition`,
    `${JSON.stringify(streamStore.STREAM_START)}`,
  );
}

/**
 * Produce a vat keeper for a vat.
 *
 * @param {*} kvStore  The keyValue store in which the persistent state will be kept
 * @param {*} streamStore  Accompanying stream store, for the transcripts
 * @param {*} kernelSlog
 * @param {string} vatID  The vat ID string of the vat in question
 * @param {*} addKernelObject  Kernel function to add a new object to the kernel's
 * mapping tables.
 * @param {*} addKernelPromiseForVat  Kernel function to add a new promise to the
 * kernel's mapping tables.
 * @param {*} incrementRefCount
 * @param {*} decrementRefCount
 * @param {(vatID: string, kernelSlot: string) => {reachable: boolean, vatSlot: string}} getReachableAndVatSlot
 * @param {*} incStat
 * @param {*} decStat
 * @param {*} getCrankNumber
 * @returns {*} an object to hold and access the kernel's state for the given vat
 */
export function makeVatKeeper(
  kvStore,
  streamStore,
  kernelSlog,
  vatID,
  addKernelObject,
  addKernelPromiseForVat,
  incrementRefCount,
  decrementRefCount,
  getReachableAndVatSlot,
  incStat,
  decStat,
  getCrankNumber,
) {
  insistVatID(vatID);
  const transcriptStream = `transcript-${vatID}`;

  function setSourceAndOptions(source, options) {
    // take care with API change
    assert(options.managerType, X`vat options missing managerType`);
    assert.typeof(source, 'object');
    assert(source.bundle || source.bundleName);
    assert.typeof(options, 'object');
    kvStore.set(`${vatID}.source`, JSON.stringify(source));
    kvStore.set(`${vatID}.options`, JSON.stringify(options));
  }

  function getSourceAndOptions() {
    const source = JSON.parse(kvStore.get(`${vatID}.source`));
    const options = JSON.parse(kvStore.get(`${vatID}.options`));
    return harden({ source, options });
  }

  function nextDeliveryNum() {
    const num = Nat(BigInt(kvStore.get(`${vatID}.nextDeliveryNum`)));
    kvStore.set(`${vatID}.nextDeliveryNum`, `${num + 1n}`);
    return num;
  }

  function getReachableFlag(kernelSlot) {
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const data = kvStore.get(kernelKey);
    const { isReachable } = parseReachableAndVatSlot(data);
    return isReachable;
  }

  function insistNotReachable(kernelSlot) {
    const isReachable = getReachableFlag(kernelSlot);
    assert.equal(isReachable, false, X`${kernelSlot} was reachable, oops`);
  }

  function setReachableFlag(kernelSlot) {
    // const { type } = parseKernelSlot(kernelSlot);
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const { vatSlot } = parseReachableAndVatSlot(kvStore.get(kernelKey));
    // const { allocatedByVat } = parseVatSlot(vatSlot);
    kvStore.set(kernelKey, buildReachableAndVatSlot(true, vatSlot));
  }

  function clearReachableFlag(kernelSlot) {
    // const { type } = parseKernelSlot(kernelSlot);
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const { vatSlot } = parseReachableAndVatSlot(kvStore.get(kernelKey));
    // const { allocatedByVat } = parseVatSlot(vatSlot);
    kvStore.set(kernelKey, buildReachableAndVatSlot(false, vatSlot));
  }

  function importsKernelSlot(kernelSlot) {
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const data = kvStore.get(kernelKey);
    if (data) {
      const { vatSlot } = parseReachableAndVatSlot(data);
      const { allocatedByVat } = parseVatSlot(vatSlot);
      if (!allocatedByVat) {
        return true;
      }
    }
    return false;
  }

  /**
   * Provide the kernel slot corresponding to a given vat slot, allocating a
   * new one (for exports only) if it doesn't already exist. If we're allowed
   * to allocate, we also ensure the 'reachable' flag is set on it (whether
   * we allocated a new one or used an existing one). If we're not allowed to
   * allocate, we insist that the reachable flag was already set.
   *
   * @param {string} vatSlot  The vat slot of interest
   * @param {bool} setReachable Set the 'reachable' flag on vat exports.
   * @returns {string} the kernel slot that vatSlot maps to
   * @throws {Error} if vatSlot is not a kind of thing that can be exported by vats
   * or is otherwise invalid.
   */
  function mapVatSlotToKernelSlot(vatSlot, setReachable = true) {
    assert.typeof(vatSlot, 'string', X`non-string vatSlot: ${vatSlot}`);
    const { type, allocatedByVat } = parseVatSlot(vatSlot);
    const vatKey = `${vatID}.c.${vatSlot}`;
    if (!kvStore.has(vatKey)) {
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
        // we add the key as "unreachable", and then rely on
        // setReachableFlag() at the end to both mark it reachable and to
        // update any necessary refcounts consistently
        kvStore.set(kernelKey, buildReachableAndVatSlot(false, vatSlot));
        kvStore.set(vatKey, kernelSlot);
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
    const kernelSlot = kvStore.get(vatKey);

    if (setReachable) {
      if (allocatedByVat) {
        // exports are marked as reachable, if they weren't already
        setReachableFlag(kernelSlot);
      } else {
        // imports must be reachable
        const { isReachable } = getReachableAndVatSlot(vatID, kernelSlot);
        assert(isReachable, X`vat tried to access unreachable import`);
      }
    }
    return kernelSlot;
  }

  /**
   * Provide the vat slot corresponding to a given kernel slot, including
   * creating the vat slot if it doesn't already exist.
   *
   * @param {string} kernelSlot  The kernel slot of interest
   * @param {bool} setReachable Set the 'reachable' flag on vat imports.
   * @returns {string} the vat slot kernelSlot maps to
   * @throws {Error} if kernelSlot is not a kind of thing that can be imported by vats
   * or is otherwise invalid.
   */
  function mapKernelSlotToVatSlot(kernelSlot, setReachable = true) {
    assert.typeof(kernelSlot, 'string', 'non-string kernelSlot');
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    if (!kvStore.has(kernelKey)) {
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(BigInt(kvStore.get(`${vatID}.o.nextID`)));
        kvStore.set(`${vatID}.o.nextID`, `${id + 1n}`);
      } else if (type === 'device') {
        id = Nat(BigInt(kvStore.get(`${vatID}.d.nextID`)));
        kvStore.set(`${vatID}.d.nextID`, `${id + 1n}`);
      } else if (type === 'promise') {
        id = Nat(BigInt(kvStore.get(`${vatID}.p.nextID`)));
        kvStore.set(`${vatID}.p.nextID`, `${id + 1n}`);
      } else {
        assert.fail(X`unknown type ${type}`);
      }
      incrementRefCount(kernelSlot, `${vatID}|kv|clist`);
      const vatSlot = makeVatSlot(type, false, id);

      const vatKey = `${vatID}.c.${vatSlot}`;
      incStat('clistEntries');
      kvStore.set(vatKey, kernelSlot);
      kvStore.set(kernelKey, buildReachableAndVatSlot(false, vatSlot));
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

    const { isReachable, vatSlot } = getReachableAndVatSlot(vatID, kernelSlot);
    const { allocatedByVat } = parseVatSlot(vatSlot);
    if (setReachable) {
      if (!allocatedByVat) {
        // imports are marked as reachable, if they weren't already
        setReachableFlag(kernelSlot);
      } else {
        // if the kernel is sending non-reachable exports back into
        // exporting vat, that's a kernel bug
        assert(isReachable, X`kernel sent unreachable export ${kernelSlot}`);
      }
    }
    return vatSlot;
  }

  /**
   * Test if there's a c-list entry for some slot.
   *
   * @param {string} slot  The slot of interest
   *
   * @returns {boolean} true iff this vat has a c-list entry mapping for `slot`.
   */
  function hasCListEntry(slot) {
    return kvStore.has(`${vatID}.c.${slot}`);
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
    if (kvStore.has(kernelKey)) {
      decrementRefCount(kernelSlot, `${vatID}|del|clist`);
      decStat('clistEntries');
      kvStore.delete(kernelKey);
      kvStore.delete(vatKey);
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
   *
   * @param {Object?} startPos  Optional position to begin reading from
   *
   * @yields {string} a stream of transcript entries
   */
  function* getTranscript(startPos = streamStore.STREAM_START) {
    const endPos = JSON.parse(kvStore.get(`${vatID}.t.endPosition`));
    for (const entry of streamStore.readStream(
      transcriptStream,
      startPos,
      endPos,
    )) {
      yield JSON.parse(entry);
    }
  }

  /**
   * Append an entry to the vat's transcript.
   *
   * @param {Object} entry  The transcript entry to append.
   */
  function addToTranscript(entry) {
    const oldPos = JSON.parse(kvStore.get(`${vatID}.t.endPosition`));
    const newPos = streamStore.writeStreamItem(
      transcriptStream,
      JSON.stringify(entry),
      oldPos,
    );
    kvStore.set(`${vatID}.t.endPosition`, `${JSON.stringify(newPos)}`);
  }

  /**
   * Cease writing to the vat's transcript.
   */
  function closeTranscript() {
    streamStore.closeStream(transcriptStream);
  }

  function vatStats() {
    function getCount(key, first) {
      const id = Nat(BigInt(kvStore.get(key)));
      return id - Nat(first);
    }

    const objectCount = getCount(`${vatID}.o.nextID`, FIRST_OBJECT_ID);
    const promiseCount = getCount(`${vatID}.p.nextID`, FIRST_PROMISE_ID);
    const deviceCount = getCount(`${vatID}.d.nextID`, FIRST_DEVICE_ID);
    const transcriptCount = JSON.parse(kvStore.get(`${vatID}.t.endPosition`))
      .itemCount;

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
    for (const k of kvStore.getKeys(prefix, `${vatID}.c/`)) {
      if (k.startsWith(prefix)) {
        const slot = k.slice(prefix.length);
        if (!slot.startsWith('k')) {
          const vatSlot = slot;
          const kernelSlot = kvStore.get(k);
          res.push([kernelSlot, vatID, vatSlot]);
        }
      }
    }
    return harden(res);
  }

  return harden({
    setSourceAndOptions,
    getSourceAndOptions,
    nextDeliveryNum,
    importsKernelSlot,
    mapVatSlotToKernelSlot,
    mapKernelSlotToVatSlot,
    getReachableFlag,
    insistNotReachable,
    setReachableFlag,
    clearReachableFlag,
    hasCListEntry,
    deleteCListEntry,
    deleteCListEntriesForKernelSlots,
    getTranscript,
    addToTranscript,
    closeTranscript,
    vatStats,
    dumpState,
  });
}
