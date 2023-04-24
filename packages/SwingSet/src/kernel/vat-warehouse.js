import { assert, Fail, quote as q } from '@agoric/assert';
import { isNat } from '@endo/nat';
import { makeVatTranslators } from './vatTranslator.js';
import { insistVatDeliveryResult } from '../lib/message.js';
import djson from '../lib/djson.js';

/**
 * @typedef {import('@agoric/swingset-liveslots').VatDeliveryObject} VatDeliveryObject
 * @typedef {import('@agoric/swingset-liveslots').VatDeliveryResult} VatDeliveryResult
 * @typedef {import('@agoric/swingset-liveslots').VatSyscallObject} VatSyscallObject
 * @typedef {import('@agoric/swingset-liveslots').VatSyscallResult} VatSyscallResult
 * @typedef {import('@agoric/swingset-liveslots').VatSyscallHandler} VatSyscallHandler
 * @typedef {import('../types-internal.js').VatManager} VatManager
 * @typedef {import('../types-internal.js').TranscriptDeliveryResults} TranscriptDeliveryResults
 * @typedef {import('../types-internal.js').TranscriptEntry} TranscriptEntry
 * @typedef {{ body: string, slots: unknown[] }} Capdata
 * @typedef { [unknown, ...unknown[]] } Tagged
 * @typedef { { moduleFormat: string }} Bundle
 */

/**
 * @param {VatSyscallObject} originalSyscall
 * @param {VatSyscallObject} newSyscall
 * @returns {boolean}
 */
export function syscallsAreIdentical(originalSyscall, newSyscall) {
  return djson.stringify(originalSyscall) === djson.stringify(newSyscall);
}

/**
 * @param {VatSyscallHandler} origHandler
 */
function recordSyscalls(origHandler) {
  assert(origHandler);
  const syscalls = [];
  const syscallHandler = vso => {
    const vres = origHandler(vso);
    syscalls.push({ s: vso, r: vres });
    return vres;
  };
  const getTranscriptSyscalls = () => syscalls;
  return { syscallHandler, getTranscriptSyscalls };
}

/**
 * Make a syscallHandler that returns results from a
 * previously-recorded transcript, instead of executing them for
 * real. The vat must perform exactly the same syscalls as before,
 * else it gets a vat-fatal error.
 *
 * @param {*} kernelSlog
 * @param {string} vatID
 * @param {number} deliveryNum
 * @param {TranscriptEntry} transcriptEntry
 * @returns { {
 *   syscallHandler: (vso: VatSyscallObject) => VatSyscallResult,
 *   finishSimulation: () => void,
 * } }
 */
export function makeSyscallSimulator(
  kernelSlog,
  vatID,
  deliveryNum,
  transcriptEntry,
) {
  const syscallsExpected = [...transcriptEntry.sc]; // copy
  const syscallsMade = [];
  // syscallStatus's length will be max(syscallsExpected,
  // syscallsMade). We push a new status onto it each time the
  // replaying vat makes a syscall, then when the delivery ends,
  // finishSimulation will pad it out with 'missing' entries.
  const syscallStatus = []; // array of 'ok'/'wrong'/'extra'/'missing'
  let replayError; // sticky

  const explain = () => {
    console.log(`anachrophobia strikes ${vatID} on delivery ${deliveryNum}`);
    syscallStatus.forEach((status, idx) => {
      const expected = syscallsExpected[idx];
      const got = syscallsMade[idx];
      switch (status) {
        case 'ok': {
          console.log(`sc[${idx}]: ok: ${djson.stringify(got)}`);
          break;
        }
        case 'wrong': {
          console.log(`sc[${idx}]: wrong`);
          console.log(`  expected: ${djson.stringify(expected.s)}`);
          console.log(`  got     : ${djson.stringify(got)}`);
          break;
        }
        case 'extra': {
          console.log(`sc[${idx}]: extra: ${djson.stringify(got)}`);
          break;
        }
        case 'missing': {
          console.log(`sc[${idx}]: missing: ${djson.stringify(expected.s)}`);
          break;
        }
        default:
          Fail`bad ${status}`;
      }
    });
  };

  const syscallHandler = vso => {
    kernelSlog.syscall(vatID, undefined, vso); // TODO: finish()?
    const expected = syscallsExpected[syscallsMade.length];
    syscallsMade.push(vso);
    if (!expected) {
      syscallStatus.push('extra');
      const error = Error(`anachrophobia in ${vatID}: extra syscall`);
      replayError ||= error;
      throw error;
    }
    if (!syscallsAreIdentical(expected.s, vso)) {
      syscallStatus.push('wrong');
      const error = Error(`anachrophobia in ${vatID}: wrong syscall`);
      replayError ||= error;
      throw error;
    }
    syscallStatus.push('ok');
    return expected.r;
  };

  const finishSimulation = () => {
    if (syscallsMade.length < syscallsExpected.length) {
      const missing = syscallsExpected.length - syscallsMade.length;
      for (let i = 0; i < missing; i += 1) {
        syscallStatus.push('missing');
      }
      const error = Error(`anachrophobia in ${vatID}: missing syscalls`);
      replayError ||= error;
    }

    if (replayError) {
      explain();
      throw replayError;
    }
  };

  return { syscallHandler, finishSimulation };
}

function slogReplay(kernelSlog, vatID, deliveryNum, te) {
  /** @type {any} */
  const newCrankNum = undefined; // TODO think of a way to correlate this
  /** @type {any} */
  const kd = undefined;
  const vd = te.d;
  return kernelSlog.delivery(vatID, newCrankNum, deliveryNum, kd, vd, true);
}

/** @param {number} max */
export const makeLRU = max => {
  /** @type { string[] } */
  const items = [];

  return harden({
    /** @param {string} item */
    add: item => {
      const pos = items.indexOf(item);
      // already most recently used
      if (pos + 1 === max) {
        return null;
      }
      // remove from former position
      if (pos >= 0) {
        items.splice(pos, 1);
      }
      items.push(item);
      // not yet full
      if (items.length <= max) {
        return null;
      }
      const [removed] = items.splice(0, 1);
      return removed;
    },

    get size() {
      return items.length;
    },

    /** @param {string} item */
    remove: item => {
      const pos = items.indexOf(item);
      if (pos >= 0) {
        items.splice(pos, 1);
      }
    },
  });
};

/**
 * @param {object} details
 * @param {KernelKeeper} details.kernelKeeper
 * @param {ReturnType<typeof import('./vat-loader/vat-loader.js').makeVatLoader>} details.vatLoader
 * @param {(vatID: string, translators: VatTranslators) => VatSyscallHandler} details.buildVatSyscallHandler
 * @param { import('../types-internal.js').KernelPanic } details.panic
 * @param { import('../types-external.js').VatWarehousePolicy } details.warehousePolicy
 * @param { import('../types-external.js').KernelSlog } details.kernelSlog
 */
export function makeVatWarehouse({
  kernelSlog,
  kernelKeeper,
  vatLoader,
  buildVatSyscallHandler,
  panic,
  warehousePolicy,
}) {
  const { maxVatsOnline = 50 } = warehousePolicy || {};
  // Often a large contract evaluation is among the first few deliveries,
  // so let's do a snapshot after just a few deliveries.
  const snapshotInitial = kernelKeeper.getSnapshotInitial();
  // Then we'll snapshot at invervals of some number of cranks.
  // Note: some measurements show 10 deliveries per sec on XS as of this writing.
  let snapshotInterval = kernelKeeper.getSnapshotInterval();
  // Idea: snapshot based on delivery size: after deliveries >10Kb.
  // console.debug('makeVatWarehouse', { warehousePolicy });

  /**
   * @typedef { ReturnType<typeof import('./vatTranslator').makeVatTranslators> } VatTranslators
   * @typedef {{
   *   manager: VatManager,
   *   translators: VatTranslators,
   *   syscallHandler: VatSyscallHandler,
   *   enablePipelining: boolean,
   *   options: import('../types-internal.js').RecordedVatOptions,
   * }} VatInfo
   */
  const ephemeral = {
    /** @type {Map<string, VatInfo> } key is vatID */
    vats: new Map(),
  };

  /** @type {Map<string, VatTranslators> } */
  const xlate = new Map();
  /** @param {string} vatID */
  function provideTranslators(vatID) {
    let translators = xlate.get(vatID);
    if (!translators) {
      // NOTE: makeVatTranslators assumes
      // vatKeeper for this vatID is available.
      translators = makeVatTranslators(vatID, kernelKeeper);
      xlate.set(vatID, translators);
    }
    return translators;
  }

  /**
   * @param {string} vatID
   * @param {import('../types-external.js').VatKeeper} vatKeeper
   * @param {VatManager} manager
   * @returns {Promise<void>}
   */
  async function replayTranscript(vatID, vatKeeper, manager) {
    const snapshotInfo = vatKeeper.getSnapshotInfo();
    const startPos = snapshotInfo ? snapshotInfo.endPos : undefined;
    // console.log('replay from', { vatID, startPos });

    const total = vatKeeper.vatStats().transcriptCount;
    kernelSlog.write({ type: 'start-replay', vatID, deliveries: total });
    // TODO glean deliveryNum better, make sure we get the post-snapshot
    // transcript starting point right. getTranscript() should probably
    // return [deliveryNum, t] pairs.
    let deliveryNum = startPos || 0;
    for await (const te of vatKeeper.getTranscript(startPos)) {
      // if (deliveryNum % 100 === 0) {
      //   console.debug(`replay vatID:${vatID} deliveryNum:${deliveryNum} / ${total}`);
      // }
      //
      // we slog the replay just like the original, but some fields are missing
      const finishSlog = slogReplay(kernelSlog, vatID, deliveryNum, te);
      const sim = makeSyscallSimulator(kernelSlog, vatID, deliveryNum, te);
      const status = await manager.deliver(te.d, sim.syscallHandler);
      finishSlog(status);
      sim.finishSimulation(); // will throw if syscalls did not match
      deliveryNum += 1;
    }
    kernelSlog.write({ type: 'finish-replay', vatID });
  }

  /**
   * @param {string} vatID
   * @param {boolean} recreate
   * @returns {Promise<VatInfo>}
   */
  async function ensureVatOnline(vatID, recreate) {
    const info = ephemeral.vats.get(vatID);
    if (info) return info;

    kernelKeeper.vatIsAlive(vatID) || Fail`${q(vatID)}: not alive`;
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const { source, options } = vatKeeper.getSourceAndOptions();

    // TODO: translators should be stored only in ephemeral.vats,
    // share lifetime with worker, but might be needed earlier than
    // ensureVatOnline?, make sure it gets deleted eventually
    const translators = provideTranslators(vatID);
    const syscallHandler = buildVatSyscallHandler(vatID, translators);

    const isDynamic = kernelKeeper.getDynamicVats().includes(vatID);
    const managerP = vatLoader.create(vatID, {
      isDynamic,
      source,
      options,
    });
    if (recreate) {
      managerP.catch(err => panic(`unable to re-create vat ${vatID}`, err));
    }
    const manager = await managerP;

    // TODO(3218): persist this option; avoid spinning up a vat that isn't pipelined
    const { enablePipelining = false } = options;

    if (options.useTranscript) {
      // eslint-disable-next-line @jessie.js/no-nested-await
      await replayTranscript(vatID, vatKeeper, manager);
    }

    const result = {
      manager,
      translators,
      syscallHandler,
      enablePipelining,
      options,
    };
    // console.info(
    //   vatID,
    //   'online:',
    //   options.managerType,
    //   'transcript entries replayed:',
    //   entriesReplayed, // retval of replayTranscript() above
    // );
    ephemeral.vats.set(vatID, result);
    // eslint-disable-next-line no-use-before-define
    await applyAvailabilityPolicy(vatID);
    return result;
  }

  /**
   * Bring new dynamic vat online and run its (bootstrap) code.
   *
   * @param {string} vatID
   */
  async function createDynamicVat(vatID) {
    return ensureVatOnline(vatID, false);
  }

  /** @param {typeof console.log} logStartup */
  async function start(logStartup) {
    const recreate = true; // note: PANIC on failure to recreate
    const maxPreload = maxVatsOnline / 2;
    let numPreloaded = 0;

    // NOTE: OPTIMIZATION OPPORTUNITY: replay vats in parallel

    // instantiate all static vats, in lexicographic order, up to the
    // maxPreload limit
    for await (const [name, vatID] of kernelKeeper.getStaticVats()) {
      if (numPreloaded >= maxPreload) {
        break;
      }
      logStartup(`provideVatKeeper for vat ${name} as vat ${vatID}`);
      // eslint-disable-next-line no-await-in-loop
      await ensureVatOnline(vatID, recreate);
      numPreloaded += 1;
    }

    // then instantiate all dynamic vats, in creation order, also
    // subject to maxPreload
    for await (const vatID of kernelKeeper.getDynamicVats()) {
      if (numPreloaded >= maxPreload) {
        break;
      }
      logStartup(`provideVatKeeper for dynamic vat ${vatID}`);
      // eslint-disable-next-line no-await-in-loop
      await ensureVatOnline(vatID, recreate);
      numPreloaded += 1;
    }
  }

  /**
   * @typedef { import('../types-internal.js').MeterID } MeterID
   */

  /**
   * @param {string} vatID
   * @returns {{ enablePipelining: boolean, meterID?: MeterID }
   *  | undefined // if the vat is dead or never initialized
   * }
   */
  function lookup(vatID) {
    const liveInfo = ephemeral.vats.get(vatID);
    if (liveInfo) {
      const { enablePipelining, options } = liveInfo;
      const { meterID } = options;
      return { enablePipelining, meterID };
    }
    if (!kernelKeeper.vatIsAlive(vatID)) {
      return undefined;
    }
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const { enablePipelining, meterID } = vatKeeper.getOptions();
    return { enablePipelining, meterID };
  }

  const recent = makeLRU(maxVatsOnline);

  /**
   *
   * does not modify the kernelDB
   *
   * @param {string} vatID
   * @returns {Promise<unknown>}
   */
  async function evict(vatID) {
    assert(lookup(vatID));

    recent.remove(vatID);

    const info = ephemeral.vats.get(vatID);
    if (!info) {
      // console.debug('evict: not online:', vatID);
      return undefined;
    }
    ephemeral.vats.delete(vatID);
    xlate.delete(vatID);
    kernelKeeper.evictVatKeeper(vatID);

    // console.log('evict: shutting down', vatID);
    return info.manager.shutdown();
  }

  /**
   * Simple fixed-size LRU cache policy
   *
   * TODO: policy input: did a vat get a message? how long ago?
   * "important" vat option?
   * options: pay $/block to keep in RAM - advisory; not consensus
   * creation arg: # of vats to keep in RAM (LRU 10~50~100)
   *
   * @param {string} currentVatID
   */
  async function applyAvailabilityPolicy(currentVatID) {
    const lru = recent.add(currentVatID);
    if (!lru) {
      return;
    }
    // const {
    //   options: { managerType },
    // } = ephemeral.vats.get(lru) || assert.fail();
    // console.info('evict', lru, managerType, 'for', currentVatID);
    await evict(lru);
  }

  /** @type { string | undefined } */
  let lastVatID;

  /** @type {(vatID: string, kd: KernelDeliveryObject, d: VatDeliveryObject, vs: VatSlog) => Promise<VatDeliveryResult> } */
  async function deliverToVat(vatID, kd, vd, vs) {
    await applyAvailabilityPolicy(vatID);
    lastVatID = vatID;

    const recreate = true; // PANIC in the failure case
    // create the worker and replay the transcript, if necessary
    const {
      manager,
      syscallHandler: origHandler,
      options,
    } = await ensureVatOnline(vatID, recreate);
    assert(origHandler);

    // then log the delivery so it appears after transcript replay
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const crankNum = kernelKeeper.getCrankNumber();
    const deliveryNum = vatKeeper.nextDeliveryNum(); // increments
    /** @type { SlogFinishDelivery } */
    const finishSlog = vs.delivery(crankNum, deliveryNum, kd, vd);

    // wrap the syscallHandler with a syscall recorder
    const recorder = recordSyscalls(origHandler);
    const { syscallHandler, getTranscriptSyscalls } = recorder;
    assert(syscallHandler);

    // make the delivery
    const deliveryResult = await manager.deliver(vd, syscallHandler);
    insistVatDeliveryResult(deliveryResult);
    finishSlog(deliveryResult); // log the delivery results

    // TODO: if the dispatch failed for whatever reason, and we choose to
    // destroy the vat, change what we do with the transcript here.
    if (options.useTranscript) {
      // record transcript entry
      /** @type {TranscriptDeliveryResults} */
      const tdr = { status: deliveryResult[0] };
      const transcriptEntry = { d: vd, sc: getTranscriptSyscalls(), r: tdr };
      vatKeeper.addToTranscript(transcriptEntry);
    }

    // TODO: if per-vat policy decides it wants a BOYD or heap snapshot,
    // now is the time to do it, or to ask the kernel to schedule it

    return deliveryResult; // return delivery results to caller for evaluation
  }

  /**
   * Save a snapshot of most recently used vat,
   * depending on snapshotInterval.
   */
  async function maybeSaveSnapshot() {
    if (!lastVatID || !lookup(lastVatID)) {
      return false;
    }

    const recreate = true; // PANIC in the failure case
    const { manager } = await ensureVatOnline(lastVatID, recreate);
    if (!manager.makeSnapshot) {
      return false;
    }

    const vatKeeper = kernelKeeper.provideVatKeeper(lastVatID);
    let reason;
    const { totalEntries, snapshottedEntries } =
      vatKeeper.transcriptSnapshotStats();
    if (snapshotInitial === totalEntries) {
      reason = { snapshotInitial };
    } else if (
      totalEntries > snapshotInitial &&
      totalEntries - snapshottedEntries >= snapshotInterval
    ) {
      reason = { snapshotInterval };
    }
    // console.log('maybeSaveSnapshot: reason:', reason);
    if (!reason) {
      return false;
    }
    await vatKeeper.saveSnapshot(manager);
    lastVatID = undefined;
    return true;
  }

  /**
   * @param {string} vatID
   * @param {unknown[]} kd
   * @returns {VatDeliveryObject}
   */
  function kernelDeliveryToVatDelivery(vatID, kd) {
    const translators = provideTranslators(vatID);

    // @ts-expect-error TODO: types for kernelDeliveryToVatDelivery
    return translators.kernelDeliveryToVatDelivery(kd);
  }

  /**
   * @param {string} vatID
   * @param {unknown} setup
   */
  async function loadTestVat(vatID, setup) {
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const options = vatKeeper.getOptions();
    const { enablePipelining } = options;
    const translators = provideTranslators(vatID);
    const syscallHandler = buildVatSyscallHandler(vatID, translators);
    const manager = await vatLoader.loadTestVat(vatID, setup, options);

    const result = {
      manager,
      translators,
      syscallHandler,
      enablePipelining,
      options,
    };
    ephemeral.vats.set(vatID, result);
  }

  /**
   * stop any existing worker, delete transcript and any snapshot, so
   * the next time we send a delivery, we'll start a new worker (maybe
   * with new source code)
   *
   * @param {string} vatID
   * @returns {Promise<number>} the incarnation number of the new incarnation
   */
  async function beginNewWorkerIncarnation(vatID) {
    await evict(vatID);
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    return vatKeeper.beginNewIncarnation();
  }

  /**
   * @param {string} vatID
   * @returns {Promise<void>}
   */
  async function stopWorker(vatID) {
    // worker may or may not be online
    if (ephemeral.vats.has(vatID)) {
      try {
        // eslint-disable-next-line @jessie.js/no-nested-await
        await evict(vatID);
      } catch (err) {
        console.debug('vat termination was already reported; ignoring:', err);
      }
    }
  }

  // mostly used by tests, only needed with thread/process-based workers
  function shutdown() {
    const work = Array.from(ephemeral.vats.values(), ({ manager }) =>
      manager.shutdown(),
    );
    return Promise.all(work);
  }

  function setSnapshotInterval(interval) {
    assert(isNat(interval), 'invalid heap snapshotInterval value');
    kernelKeeper.setSnapshotInterval(interval);
    snapshotInterval = interval;
  }

  return harden({
    start,
    createDynamicVat,
    loadTestVat,
    lookup,
    kernelDeliveryToVatDelivery,
    deliverToVat,
    maybeSaveSnapshot,
    setSnapshotInterval,

    beginNewWorkerIncarnation,
    stopWorker,

    // mostly for testing?
    activeVatsInfo: () =>
      [...ephemeral.vats].map(([id, { options }]) => ({ id, options })),

    shutdown,
  });
}
harden(makeVatWarehouse);
