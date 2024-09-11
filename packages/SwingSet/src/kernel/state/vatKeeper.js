/**
 * Kernel's keeper of persistent state for a vat.
 */
import { Nat } from '@endo/nat';
import { assert, q, Fail } from '@endo/errors';
import { isObject } from '@endo/marshal';
import { parseKernelSlot } from '../parseKernelSlots.js';
import { makeVatSlot, parseVatSlot } from '../../lib/parseVatSlots.js';
import { insistVatID } from '../../lib/id.js';
import { kdebug } from '../../lib/kdebug.js';
import {
  parseReachableAndVatSlot,
  buildReachableAndVatSlot,
} from './reachable.js';
import { enumeratePrefixedKeys } from './storageHelper.js';

/**
 * @typedef { import('../../types-external.js').KVStore } KVStore
 * @typedef { import('../../types-external.js').SnapStore } SnapStore
 * @typedef { import('../../types-external.js').SourceOfBundle } SourceOfBundle
 * @typedef { import('../../types-external.js').TranscriptStore } TranscriptStore
 * @typedef { import('../../types-internal.js').Dirt } Dirt
 * @typedef { import('../../types-internal.js').VatManager } VatManager
 * @typedef { import('../../types-internal.js').ReapDirtThreshold } ReapDirtThreshold
 * @typedef { import('../../types-internal.js').RecordedVatOptions } RecordedVatOptions
 * @typedef { import('../../types-internal.js').TranscriptEntry } TranscriptEntry
 * @import {TranscriptDeliverySaveSnapshot} from '../../types-internal.js'
 * @import {TranscriptDeliveryLoadSnapshot} from '../../types-internal.js'
 */

// makeVatKeeper is a pure function: all state is kept in the argument object

// TODO: tests rely on these numbers and haven't been updated to use names.
const FIRST_OBJECT_ID = 50n;
const FIRST_PROMISE_ID = 60n;
const FIRST_DEVICE_ID = 70n;

// TODO: we export this from vatKeeper.js, and import it from
// kernelKeeper.js, because both files need it, and we want to avoid
// an import cycle (kernelKeeper imports other things from vatKeeper),
// but it really wants to live in kernelKeeper not vatKeeper
export const DEFAULT_REAP_DIRT_THRESHOLD_KEY =
  'kernel.defaultReapDirtThreshold';

const isBundleSource = source => {
  return (
    isObject(source) &&
    (isObject(source.bundle) ||
      typeof source.bundleName === 'string' ||
      typeof source.bundleID === 'string')
  );
};

/**
 * Establish a vat's state.
 *
 * @param {*} kvStore  The key-value store in which the persistent state will be kept
 * @param {*} transcriptStore  Accompanying transcript store
 * @param {string} vatID The vat ID string of the vat in question
 * @param {SourceOfBundle} source
 * @param {RecordedVatOptions} options
 */
export function initializeVatState(
  kvStore,
  transcriptStore,
  vatID,
  source,
  options,
) {
  assert(isBundleSource(source), `vat ${vatID} source has wrong shape`);
  assert(
    isObject(options) && isObject(options.workerOptions),
    `vat ${vatID} options is missing workerOptions`,
  );

  kvStore.set(`${vatID}.o.nextID`, `${FIRST_OBJECT_ID}`);
  kvStore.set(`${vatID}.p.nextID`, `${FIRST_PROMISE_ID}`);
  kvStore.set(`${vatID}.d.nextID`, `${FIRST_DEVICE_ID}`);
  kvStore.set(`${vatID}.reapDirt`, JSON.stringify({}));
  kvStore.set(`${vatID}.source`, JSON.stringify(source));
  kvStore.set(`${vatID}.options`, JSON.stringify(options));
  transcriptStore.initTranscript(vatID);
}

/**
 * Produce a vat keeper for a vat.
 *
 * @param {KVStore} kvStore  The keyValue store in which the persistent state will be kept
 * @param {TranscriptStore} transcriptStore  Accompanying transcript store, for the transcripts
 * @param {*} kernelSlog
 * @param {string} vatID  The vat ID string of the vat in question
 * @param {*} addKernelObject  Kernel function to add a new object to the kernel's
 * mapping tables.
 * @param {*} addKernelPromiseForVat  Kernel function to add a new promise to the
 * kernel's mapping tables.
 * @param {(kernelSlot: string) => boolean} kernelObjectExists
 * @param {*} incrementRefCount
 * @param {*} decrementRefCount
 * @param {(kernelSlot: string) => {reachable: number, recognizable: number}} getObjectRefCount
 * @param {(kernelSlot: string, o: { reachable: number, recognizable: number }) => void} setObjectRefCount
 * @param {(vatID: string, kernelSlot: string) => {isReachable: boolean, vatSlot: string}} getReachableAndVatSlot
 * @param {(kernelSlot: string) => void} addMaybeFreeKref
 * @param {*} incStat
 * @param {*} decStat
 * @param {*} getCrankNumber
 * @param {*} scheduleReap
 * @param {SnapStore} [snapStore]
 * returns an object to hold and access the kernel's state for the given vat
 */
export function makeVatKeeper(
  kvStore,
  transcriptStore,
  kernelSlog,
  vatID,
  addKernelObject,
  addKernelPromiseForVat,
  kernelObjectExists,
  incrementRefCount,
  decrementRefCount,
  getObjectRefCount,
  setObjectRefCount,
  getReachableAndVatSlot,
  addMaybeFreeKref,
  incStat,
  decStat,
  getCrankNumber,
  scheduleReap,
  snapStore = undefined,
) {
  insistVatID(vatID);

  // note: calling makeVatKeeper() does not change the DB. Any
  // initialization or upgrade must be complete before it is
  // called. Only the methods returned by makeVatKeeper() will change
  // the DB.

  function getRequired(key) {
    const value = kvStore.get(key);
    if (value === undefined) {
      throw Fail`missing: ${key}`;
    }
    return value;
  }

  const reapDirtKey = `${vatID}.reapDirt`;

  /**
   * @param {SourceOfBundle} source
   * @param {RecordedVatOptions} options
   */
  function setSourceAndOptions(source, options) {
    // take care with API change
    options.workerOptions || Fail`vat options missing workerOptions`;
    assert(source);
    assert(
      'bundle' in source || 'bundleName' in source || 'bundleID' in source,
    );
    assert.typeof(options, 'object');
    kvStore.set(`${vatID}.source`, JSON.stringify(source));
    kvStore.set(`${vatID}.options`, JSON.stringify(options));
  }

  function getSourceAndOptions() {
    const source = JSON.parse(getRequired(`${vatID}.source`));
    /** @type { RecordedVatOptions } */
    const options = JSON.parse(kvStore.get(`${vatID}.options`) || '{}');
    return harden({ source, options });
  }

  function getOptions() {
    /** @type { RecordedVatOptions } */
    const options = JSON.parse(getRequired(`${vatID}.options`));
    return harden(options);
  }

  // This is named "addDirt" because it should increment all dirt
  // counters (both for reap/BOYD and for heap snapshotting). We don't
  // have `heapSnapshotDirt` yet, but when we do, it should get
  // incremented here.

  /**
   * Add some "dirt" to the vat, possibly triggering a reap/BOYD.
   *
   * @param {Dirt} moreDirt
   */
  function addDirt(moreDirt) {
    assert.typeof(moreDirt, 'object');
    const reapDirt = JSON.parse(getRequired(reapDirtKey));
    const thresholds = {
      ...JSON.parse(getRequired(DEFAULT_REAP_DIRT_THRESHOLD_KEY)),
      ...JSON.parse(getRequired(`${vatID}.options`)).reapDirtThreshold,
    };
    let reap = false;
    for (const key of Object.keys(moreDirt)) {
      const threshold = thresholds[key];
      // Don't accumulate dirt if it can't eventually trigger a
      // BOYD. This is mainly to keep comms from counting upwards
      // forever. TODO revisit this when we add heapSnapshotDirt,
      // maybe check both thresholds and accumulate the dirt if either
      // one is non-'never'.
      if (threshold && threshold !== 'never') {
        const oldDirt = reapDirt[key] || 0;
        // The 'moreDirt' value might be Number or BigInt (eg
        // .computrons). We coerce to Number so we can JSON-stringify.
        const newDirt = oldDirt + Number(moreDirt[key]);
        reapDirt[key] = newDirt;
        if (newDirt >= threshold) {
          reap = true;
        }
      }
    }
    if (!thresholds.never) {
      kvStore.set(reapDirtKey, JSON.stringify(reapDirt));
      if (reap) {
        scheduleReap(vatID);
      }
    }
  }

  function getReapDirt() {
    return JSON.parse(getRequired(reapDirtKey));
  }

  function clearReapDirt() {
    // This is only called after a BOYD, so it should only clear the
    // reap/BOYD counters. If/when we add heap-snapshot counters,
    // those should get cleared in a separate clearHeapSnapshotDirt()
    // function.
    const reapDirt = {};
    kvStore.set(reapDirtKey, JSON.stringify(reapDirt));
  }

  function getReapDirtThreshold() {
    return getOptions().reapDirtThreshold;
  }

  /**
   * @param {ReapDirtThreshold} reapDirtThreshold
   */
  function setReapDirtThreshold(reapDirtThreshold) {
    assert.typeof(reapDirtThreshold, 'object');
    const options = { ...getOptions(), reapDirtThreshold };
    kvStore.set(`${vatID}.options`, JSON.stringify(options));
  }

  function nextDeliveryNum() {
    const { endPos } = transcriptStore.getCurrentSpanBounds(vatID);
    return Nat(endPos);
  }

  function getIncarnationNumber() {
    const { incarnation } = transcriptStore.getCurrentSpanBounds(vatID);
    return incarnation;
  }

  function getReachableFlag(kernelSlot) {
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const data = kvStore.get(kernelKey);
    const { isReachable } = parseReachableAndVatSlot(data);
    return isReachable;
  }

  function insistNotReachable(kernelSlot) {
    const isReachable = getReachableFlag(kernelSlot);
    isReachable === false || Fail`${kernelSlot} was reachable, oops`;
  }

  function setReachableFlag(kernelSlot, _tag) {
    const { type } = parseKernelSlot(kernelSlot);
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const { isReachable, vatSlot } = parseReachableAndVatSlot(
      kvStore.get(kernelKey),
    );
    const { allocatedByVat } = parseVatSlot(vatSlot);
    kvStore.set(kernelKey, buildReachableAndVatSlot(true, vatSlot));
    // increment 'reachable' part of refcount, but only for object imports
    if (!isReachable && type === 'object' && !allocatedByVat) {
      // eslint-disable-next-line prefer-const
      let { reachable, recognizable } = getObjectRefCount(kernelSlot);
      reachable += 1;
      // kdebug(`++ ${kernelSlot} ${tag} ${reachable},${recognizable}`);
      setObjectRefCount(kernelSlot, { reachable, recognizable });
    }
  }

  function clearReachableFlag(kernelSlot, _tag) {
    const { type } = parseKernelSlot(kernelSlot);
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const { isReachable, vatSlot } = parseReachableAndVatSlot(
      kvStore.get(kernelKey),
    );
    const { allocatedByVat } = parseVatSlot(vatSlot);
    kvStore.set(kernelKey, buildReachableAndVatSlot(false, vatSlot));
    // decrement 'reachable' part of refcount, but only for object imports
    if (
      isReachable &&
      type === 'object' &&
      !allocatedByVat &&
      kernelObjectExists(kernelSlot)
    ) {
      // eslint-disable-next-line prefer-const
      let { reachable, recognizable } = getObjectRefCount(kernelSlot);
      reachable -= 1;
      // kdebug(`-- ${kernelSlot} ${tag} ${reachable},${recognizable}`);
      setObjectRefCount(kernelSlot, { reachable, recognizable });
      if (reachable === 0) {
        addMaybeFreeKref(kernelSlot);
      }
    }
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
   * @param {object} [options]
   * @param {boolean} [options.setReachable] set the 'reachable' flag on vat exports
   * @param {boolean} [options.required] refuse to allocate a missing entry
   * @param {boolean} [options.requireNew] require that the entry be newly allocated
   * @returns {string} the kernel slot that vatSlot maps to
   * @throws {Error} if vatSlot is not a kind of thing that can be exported by vats
   * or is otherwise invalid.
   */
  function mapVatSlotToKernelSlot(vatSlot, options = {}) {
    const {
      setReachable = true,
      required = false,
      requireNew = false,
    } = options;
    assert(
      !(required && requireNew),
      "'required' and 'requireNew' are mutually exclusive",
    );
    typeof vatSlot === 'string' || Fail`non-string vatSlot: ${vatSlot}`;
    const { type, allocatedByVat } = parseVatSlot(vatSlot);
    const vatKey = `${vatID}.c.${vatSlot}`;
    if (!kvStore.has(vatKey)) {
      !required || Fail`vref ${vatSlot} not in clist`;
      if (allocatedByVat) {
        let kernelSlot;
        if (type === 'object') {
          // this sets the initial refcount to reachable:0 recognizable:0
          kernelSlot = addKernelObject(vatID);
        } else if (type === 'device') {
          Fail`normal vats aren't allowed to export device nodes`;
        } else if (type === 'promise') {
          kernelSlot = addKernelPromiseForVat(vatID);
        } else {
          Fail`unknown type ${type}`;
        }
        // now increment the refcount with isExport=true and
        // onlyRecognizable=true, which will skip object exports (we only
        // count imports) and leave the reachability count at zero
        const incopts = { isExport: true, onlyRecognizable: true };
        incrementRefCount(kernelSlot, `${vatID}|vk|clist`, incopts);
        const kernelKey = `${vatID}.c.${kernelSlot}`;
        incStat('clistEntries');
        // we add the key as "unreachable" but "recognizable", and then rely
        // on setReachableFlag() at the end to both mark it reachable and to
        // update any necessary refcounts consistently
        kvStore.set(kernelKey, buildReachableAndVatSlot(false, vatSlot));
        kvStore.set(vatKey, kernelSlot);
        if (kernelSlog) {
          kernelSlog.changeCList(
            vatID,
            getCrankNumber(),
            'export',
            kernelSlot,
            vatSlot,
          );
        }
        kdebug(`Add mapping v->k ${kernelKey}<=>${vatKey}`);
      } else {
        // the vat didn't allocate it, and the kernel didn't allocate it
        // (else it would have been in the c-list), so it must be bogus
        Fail`unknown vatSlot ${q(vatSlot)}`;
      }
    } else if (requireNew) {
      Fail`vref ${q(vatSlot)} is already allocated`;
    }
    const kernelSlot = getRequired(vatKey);

    if (setReachable) {
      if (allocatedByVat) {
        // exports are marked as reachable, if they weren't already
        setReachableFlag(kernelSlot, `${vatID}|vk|clistR`);
      } else {
        // imports must be reachable
        const { isReachable } = getReachableAndVatSlot(vatID, kernelSlot);
        isReachable || Fail`vat tried to access unreachable import`;
      }
    }
    return kernelSlot;
  }

  /**
   * Provide the vat slot corresponding to a given kernel slot, including
   * creating the vat slot if it doesn't already exist.
   *
   * @param {string} kernelSlot  The kernel slot of interest
   * @param {{ setReachable?: boolean, required?: boolean }} options  'setReachable' will set the 'reachable' flag on vat imports, while 'required' means we refuse to allocate a missing entry
   * @returns {string} the vat slot kernelSlot maps to
   * @throws {Error} if kernelSlot is not a kind of thing that can be imported by vats
   * or is otherwise invalid.
   */
  function mapKernelSlotToVatSlot(kernelSlot, options = {}) {
    const { setReachable = true, required = false } = options;
    assert.typeof(kernelSlot, 'string', 'non-string kernelSlot');
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    if (!kvStore.has(kernelKey)) {
      !required || Fail`kref ${kernelSlot} not in clist`;
      const { type } = parseKernelSlot(kernelSlot);

      let id;
      if (type === 'object') {
        id = Nat(BigInt(getRequired(`${vatID}.o.nextID`)));
        kvStore.set(`${vatID}.o.nextID`, `${id + 1n}`);
      } else if (type === 'device') {
        id = Nat(BigInt(getRequired(`${vatID}.d.nextID`)));
        kvStore.set(`${vatID}.d.nextID`, `${id + 1n}`);
      } else if (type === 'promise') {
        id = Nat(BigInt(getRequired(`${vatID}.p.nextID`)));
        kvStore.set(`${vatID}.p.nextID`, `${id + 1n}`);
      } else {
        throw Fail`unknown type ${type}`;
      }
      // use isExport=false, since this is an import, and leave reachable
      // alone to defer to setReachableFlag below
      incrementRefCount(kernelSlot, `${vatID}|kv|clist`, {
        onlyRecognizable: true,
      });
      const vatSlot = makeVatSlot(type, false, id);

      const vatKey = `${vatID}.c.${vatSlot}`;
      incStat('clistEntries');
      kvStore.set(vatKey, kernelSlot);
      kvStore.set(kernelKey, buildReachableAndVatSlot(false, vatSlot));
      if (kernelSlog) {
        kernelSlog.changeCList(
          vatID,
          getCrankNumber(),
          'import',
          kernelSlot,
          vatSlot,
        );
      }
      kdebug(`Add mapping k->v ${kernelKey}<=>${vatKey}`);
    }

    const { isReachable, vatSlot } = getReachableAndVatSlot(vatID, kernelSlot);
    const { allocatedByVat } = parseVatSlot(vatSlot);
    if (setReachable) {
      if (!allocatedByVat) {
        // imports are marked as reachable, if they weren't already
        setReachableFlag(kernelSlot, `${vatID}|kv|clistR`);
      } else {
        // if the kernel is sending non-reachable exports back into
        // exporting vat, that's a kernel bug
        isReachable || Fail`kernel sent unreachable export ${kernelSlot}`;
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
    parseKernelSlot(kernelSlot); // used for its assert()
    const { allocatedByVat } = parseVatSlot(vatSlot);
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    const vatKey = `${vatID}.c.${vatSlot}`;
    assert(kvStore.has(kernelKey));
    kdebug(`Delete mapping ${kernelKey}<=>${vatKey}`);
    if (kernelSlog) {
      kernelSlog.changeCList(
        vatID,
        getCrankNumber(),
        'drop',
        kernelSlot,
        vatSlot,
      );
    }
    const isExport = allocatedByVat;
    // We tolerate the object kref not being present in the kernel object
    // table, either because we're being called during the translation of
    // dispatch.retireExports/retireImports (so the kernel object has already
    // been deleted), or because the exporter's syscall.retireExport raced
    // ahead of the importer's syscall.retireImports (retireImports calls
    // deleteCListEntry).

    // First, make sure the reachable flag is clear, which might reduce the
    // reachable refcount. Note that we need the clist entry to find this, so
    // decref before delete.
    clearReachableFlag(kernelSlot, `${vatID}|del|clistR`);

    // Then decrementRefCount only the recognizable portion of the refcount.
    // `decrementRefCount` is a nop if the object is already gone.
    const decopts = { isExport, onlyRecognizable: true };
    decrementRefCount(kernelSlot, `${vatID}|del|clist`, decopts);

    decStat('clistEntries');
    kvStore.delete(kernelKey);
    kvStore.delete(vatKey);
  }

  function deleteCListEntriesForKernelSlots(kernelSlots) {
    for (const kernelSlot of kernelSlots) {
      const vatSlot = mapKernelSlotToVatSlot(kernelSlot);
      deleteCListEntry(kernelSlot, vatSlot);
    }
  }

  function transcriptSize() {
    const bounds = transcriptStore.getCurrentSpanBounds(vatID);
    const { startPos, endPos } = bounds;
    return endPos - startPos;
  }

  /**
   * Generator function to return the vat's current-span transcript,
   * one entry at a time.
   *
   * @yields { [number, TranscriptEntry] } a stream of deliveryNum and transcript entries
   */
  function* getTranscript() {
    const bounds = transcriptStore.getCurrentSpanBounds(vatID);
    let deliveryNum = bounds.startPos;
    // readSpan() starts at startPos and ends just before endPos
    for (const entry of transcriptStore.readSpan(vatID)) {
      const te = /** @type { TranscriptEntry } */ (JSON.parse(entry));
      /** @type { [number, TranscriptEntry]} */
      const retval = [deliveryNum, te];
      yield retval;
      deliveryNum += 1;
    }
  }
  harden(getTranscript);

  /**
   * Append an entry to the vat's transcript.
   *
   * @param {TranscriptEntry} entry  The transcript entry to append.
   */
  function addToTranscript(entry) {
    transcriptStore.addItem(vatID, JSON.stringify(entry));
  }

  /** @returns {number} */
  function getTranscriptEndPosition() {
    const { endPos } = transcriptStore.getCurrentSpanBounds(vatID);
    return endPos;
  }

  function getSnapshotInfo() {
    return snapStore?.getSnapshotInfo(vatID);
  }

  /**
   * Returns count of deliveries made since initialization or
   * load-snapshot
   *
   * @returns {number}
   */
  function transcriptSpanEntries() {
    const { startPos, endPos } = transcriptStore.getCurrentSpanBounds(vatID);
    return endPos - startPos;
  }

  /**
   * @param {string} snapshotID
   * @returns {TranscriptEntry}
   */
  function makeSaveSnapshotItem(snapshotID) {
    return {
      d: /** @type {TDSaveSnapshot} */ ['save-snapshot'],
      sc: [],
      r: { status: 'ok', snapshotID },
    };
  }

  /**
   * @param {string} snapshotID
   * @returns {TranscriptEntry}
   */
  function makeLoadSnapshotItem(snapshotID) {
    const loadConfig = { snapshotID };
    return {
      d: /** @type {TDLoadSnapshot} */ ['load-snapshot', loadConfig],
      sc: [],
      r: { status: 'ok' },
    };
  }

  /**
   * Store a snapshot, if given a snapStore.
   *
   * @param {VatManager} manager
   * @param {boolean} [restartWorker]
   * @returns {Promise<void>}
   */
  async function saveSnapshot(manager, restartWorker) {
    if (!snapStore || !manager.makeSnapshot) {
      return;
    }

    // tell the manager to save a heap snapshot to the snapStore
    const endPosition = getTranscriptEndPosition();
    const info = await manager.makeSnapshot(
      endPosition,
      snapStore,
      restartWorker,
    );

    const {
      hash: snapshotID,
      uncompressedSize,
      dbSaveSeconds,
      compressedSize,
      compressSeconds,
    } = info;

    // push a save-snapshot transcript entry
    addToTranscript(makeSaveSnapshotItem(snapshotID));

    // then start a new transcript span
    await transcriptStore.rolloverSpan(vatID);

    // then push a load-snapshot entry, so that the current span
    // always starts with an initialize-worker or load-snapshot
    // pseudo-delivery
    addToTranscript(makeLoadSnapshotItem(snapshotID));

    kernelSlog.write({
      type: 'heap-snapshot-save',
      vatID,
      snapshotID,
      uncompressedSize,
      dbSaveSeconds,
      compressedSize,
      compressSeconds,
      endPosition,
      restartWorker,
    });
  }

  /**
   * Perform some (possibly-limited) cleanup work for a vat. Returns
   * 'done' (where false means "please call me again", and true means
   * "you can delete the vatID now"), and a count of how much work was
   * done (so the runPolicy can decide when to stop).
   *
   * @param {number} [budget]
   * @returns {{ done: boolean, cleanups: number }}
   *
   */
  function deleteSnapshots(budget = undefined) {
    // Each budget=1 allows us to delete one snapshot entry.
    if (!snapStore) {
      return { done: true, cleanups: 0 };
    }
    // initially uses 2+2*budget DB statements, then just 1 when done
    return snapStore.deleteVatSnapshots(vatID, budget);
  }

  /**
   * Perform some (possibly-limited) cleanup work for a vat. Returns
   * 'done' (where false means "please call me again", and true means
   * "you can delete the vatID now"), and a count of how much work was
   * done (so the runPolicy can decide when to stop).
   *
   * @param {number} [budget]
   * @returns {{ done: boolean, cleanups: number }}
   *
   */
  function deleteTranscripts(budget = undefined) {
    // Each budget=1 allows us to delete one transcript span and any
    // transcript items associated with that span. Some nodes will
    // have historical transcript items, some will not. Using budget=5
    // and snapshotInterval=200 means we delete 5 span records and
    // maybe 1000 span items.

    // initially uses 2+3*budget DB statements, then just 1 when done
    return transcriptStore.deleteVatTranscripts(vatID, budget);
  }

  async function beginNewIncarnation() {
    if (snapStore) {
      snapStore.stopUsingLastSnapshot(vatID);
    }
    return transcriptStore.rolloverIncarnation(vatID);
  }

  function vatStats() {
    function getCount(key, first) {
      const id = Nat(BigInt(getRequired(key)));
      return id - Nat(first);
    }

    const objectCount = getCount(`${vatID}.o.nextID`, FIRST_OBJECT_ID);
    const promiseCount = getCount(`${vatID}.p.nextID`, FIRST_PROMISE_ID);
    const deviceCount = getCount(`${vatID}.d.nextID`, FIRST_DEVICE_ID);
    const { startPos, endPos } = transcriptStore.getCurrentSpanBounds(vatID);
    const transcriptCount = endPos - startPos;

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
    for (const k of enumeratePrefixedKeys(kvStore, prefix)) {
      const slot = k.slice(prefix.length);
      if (!slot.startsWith('k')) {
        const vatSlot = slot;
        const kernelSlot = kvStore.get(k) || Fail`getNextKey ensures get`;
        /** @type { [string, string, string] } */
        const item = [kernelSlot, vatID, vatSlot];
        res.push(item);
      }
    }
    return harden(res);
  }

  return harden({
    setSourceAndOptions,
    getSourceAndOptions,
    getOptions,
    addDirt,
    getReapDirt,
    clearReapDirt,
    getReapDirtThreshold,
    setReapDirtThreshold,
    nextDeliveryNum,
    getIncarnationNumber,
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
    transcriptSize,
    getTranscript,
    getTranscriptEndPosition,
    transcriptSpanEntries,
    addToTranscript,
    vatStats,
    dumpState,
    saveSnapshot,
    getSnapshotInfo,
    deleteSnapshots,
    deleteTranscripts,
    beginNewIncarnation,
  });
}
