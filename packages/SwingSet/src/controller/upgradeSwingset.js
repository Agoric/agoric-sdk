import { Fail } from '@endo/errors';
import {
  DEFAULT_REAP_DIRT_THRESHOLD_KEY,
  DEFAULT_GC_KREFS_PER_BOYD,
  getAllDynamicVats,
  getAllStaticVats,
  incrementReferenceCount,
  readQueue,
} from '../kernel/state/kernelKeeper.js';
import { enumeratePrefixedKeys } from '../kernel/state/storageHelper.js';

/**
 * @import {ReapDirtThreshold, RunQueueEvent} from '../types-internal.js';
 */

/**
 * Parse a string of decimal digits into a number.
 *
 * @param {string} digits
 * @param {string} label
 * @returns {number}
 */
const mustParseInt = (digits, label) => {
  assert(
    digits.match(/^\d+$/),
    `expected ${label}=${digits} to be a decimal integer`,
  );
  return Number(digits);
};

/**
 * Called for each vat when upgradeSwingset migrates from v0 to v1.
 *
 * @param {KVStore} kvStore
 * @param {(key: string) => string} getRequired
 * @param {ReapDirtThreshold} defaultReapDirtThreshold
 * @param {string} vatID
 */
const upgradeVatV0toV1 = (
  kvStore,
  getRequired,
  defaultReapDirtThreshold,
  vatID,
) => {
  // schema v0:
  // Each vat has a `vNN.reapInterval` and `vNN.reapCountdown`.
  // vNN.options has a `.reapInterval` property (however it was not
  // updated by processChangeVatOptions).  Either all are numbers, or
  // all are 'never'.

  const oldReapIntervalKey = `${vatID}.reapInterval`;
  const oldReapCountdownKey = `${vatID}.reapCountdown`;
  const vatOptionsKey = `${vatID}.options`;

  // schema v1:
  // Each vat has a `vNN.reapDirt`, and vNN.options has a
  // `.reapDirtThreshold` property (which overrides kernel-wide
  // `defaultReapDirtThreshold`)

  const reapDirtKey = `${vatID}.reapDirt`;
  assert(!kvStore.has(reapDirtKey), reapDirtKey);

  const reapIntervalString = getRequired(oldReapIntervalKey);
  const reapCountdownString = getRequired(oldReapCountdownKey);

  const intervalIsNever = reapIntervalString === 'never';
  const countdownIsNever = reapCountdownString === 'never';
  // these were supposed to be the same
  assert(
    intervalIsNever === countdownIsNever,
    `reapInterval=${reapIntervalString}, reapCountdown=${reapCountdownString}`,
  );

  // initialize or upgrade state
  const reapDirt = {}; // all missing keys are treated as zero
  const threshold = {};

  if (intervalIsNever) {
    // old vats that were never reaped (eg comms) used
    // reapInterval='never', so respect that and set the other
    // threshold values to never as well
    threshold.never = true;
  } else {
    // deduce delivery count from old countdown values
    const reapInterval = mustParseInt(reapIntervalString, oldReapIntervalKey);
    const reapCountdown = mustParseInt(
      reapCountdownString,
      oldReapCountdownKey,
    );
    const deliveries = reapInterval - reapCountdown;
    reapDirt.deliveries = Math.max(deliveries, 0); // just in case
    if (reapInterval !== defaultReapDirtThreshold.deliveries) {
      threshold.deliveries = reapInterval;
    }
  }

  kvStore.delete(oldReapIntervalKey);
  kvStore.delete(oldReapCountdownKey);
  kvStore.set(reapDirtKey, JSON.stringify(reapDirt));

  // Update options to use the new schema.
  const options = JSON.parse(getRequired(vatOptionsKey));
  delete options.reapInterval;
  options.reapDirtThreshold = threshold;
  kvStore.set(vatOptionsKey, JSON.stringify(options));
};

/**
 * (maybe) upgrade the kernel state to the current schema
 *
 * This function is responsible for bringing the kernel's portion of
 * swing-store (kernelStorage) up to the current version. The host app
 * must call this each time it launches with a new version of
 * swingset, before using makeSwingsetController() to build the
 * kernel/controller (which will throw an error if handed an old
 * database). It is ok to call it only on those reboots, but it is
 * also safe to call on every reboot, because upgradeSwingset() is a
 * no-op if the DB is already up-to-date.
 *
 * If an upgrade is needed, this function will modify the DB state, so
 * the host app must be prepared for export-data callbacks being
 * called during the upgrade, and it is responsible for doing a
 * `hostStorage.commit()` afterwards.
 *
 * @param {SwingStoreKernelStorage} kernelStorage
 * @returns {{ modified: boolean }}
 */
export const upgradeSwingset = kernelStorage => {
  const { kvStore } = kernelStorage;
  /** @type {RunQueueEvent[]} */
  const upgradeEvents = [];
  const vstring = kvStore.get('version');
  const version = Number(vstring) || 0;
  let newVersion;

  /**
   * @param {string} key
   * @returns {string}
   */
  function getRequired(key) {
    if (!kvStore.has(key)) {
      throw Error(`storage lacks required key ${key}`);
    }
    // @ts-expect-error already checked .has()
    return kvStore.get(key);
  }

  // kernelKeeper.js has a large comment that defines our current
  // kvStore schema, with a section describing the deltas. The upgrade
  // steps applied here must match.

  // schema v0:
  //
  // The kernel overall has `kernel.defaultReapInterval` and
  // `kernel.initialized = 'true'`.
  //
  // Each vat has a `vNN.reapInterval` and `vNN.reapCountdown`.
  // vNN.options has a `.reapInterval` property (however it was not
  // updated by processChangeVatOptions, so do not rely upon its
  // value).  Either all are numbers, or all are 'never'.

  if (version < 1) {
    // schema v1:
    //
    // The kernel overall has `kernel.defaultReapDirtThreshold` and
    // `kernel.version = '1'` (instead of .initialized).
    //
    // Each vat has a `vNN.reapDirt`, and vNN.options has a
    // `.reapDirtThreshold` property

    // So:
    // * replace `kernel.initialized` with `kernel.version`
    // * replace `kernel.defaultReapInterval` with
    //   `kernel.defaultReapDirtThreshold`
    // * replace vat's `vNN.reapInterval`/`vNN.reapCountdown` with
    //   `vNN.reapDirt` and a `vNN.reapDirtThreshold` in `vNN.options`
    // * then do per-vat upgrades with upgradeVatV0toV1

    assert(kvStore.has('initialized'));
    kvStore.delete('initialized');
    // 'version' will be set at the end

    // upgrade from old kernel.defaultReapInterval

    const oldDefaultReapIntervalKey = 'kernel.defaultReapInterval';
    assert(kvStore.has(oldDefaultReapIntervalKey));
    assert(!kvStore.has(DEFAULT_REAP_DIRT_THRESHOLD_KEY));

    /** @type {ReapDirtThreshold} */
    const threshold = {
      deliveries: 'never',
      gcKrefs: 'never',
      computrons: 'never',
    };

    const oldValue = getRequired(oldDefaultReapIntervalKey);
    if (oldValue !== 'never') {
      threshold.deliveries = mustParseInt(oldValue, oldDefaultReapIntervalKey);
      // if BOYD wasn't turned off entirely (eg
      // defaultReapInterval='never', which only happens in unit
      // tests), then pretend we wanted a gcKrefs= threshold all
      // along, so all vats get a retroactive gcKrefs threshold, which
      // we need for the upcoming slow-vat-deletion to not trigger
      // gigantic BOYD and break the kernel
      threshold.gcKrefs = DEFAULT_GC_KREFS_PER_BOYD;
    }
    harden(threshold);
    kvStore.set(DEFAULT_REAP_DIRT_THRESHOLD_KEY, JSON.stringify(threshold));
    kvStore.delete(oldDefaultReapIntervalKey);

    // now upgrade all vats
    for (const [_name, vatID] of getAllStaticVats(kvStore)) {
      upgradeVatV0toV1(kvStore, getRequired, threshold, vatID);
    }
    for (const vatID of getAllDynamicVats(getRequired)) {
      upgradeVatV0toV1(kvStore, getRequired, threshold, vatID);
    }

    newVersion = 1;
  }

  if (version < 2) {
    // schema v2: add vats.terminated = []
    assert(!kvStore.has('vats.terminated'));
    kvStore.set('vats.terminated', JSON.stringify([]));
    newVersion = 2;
  }

  if (version < 3) {
    // v3 means that we've completed remediation for bug #9039
    console.log(`Starting remediation of bug #9039`);

    // find all terminated vats
    const terminated = new Set(JSON.parse(getRequired('vats.terminated')));

    // find all live vats
    const allVatIDs = [];
    for (const [_name, vatID] of getAllStaticVats(kvStore)) {
      if (!terminated.has(vatID)) {
        allVatIDs.push(vatID);
      }
    }
    for (const vatID of getAllDynamicVats(getRequired)) {
      if (!terminated.has(vatID)) {
        allVatIDs.push(vatID);
      }
    }

    // find all pending notifies
    const notifies = new Map(); // .get(kpid) = [vatIDs..];
    for (const name of ['runQueue', 'acceptanceQueue']) {
      for (const rq of readQueue(name, getRequired)) {
        if (rq.type === 'notify') {
          const { vatID, kpid } = rq;
          assert(vatID);
          assert(kpid);
          let vats = notifies.get(kpid);
          if (!vats) {
            vats = [];
            notifies.set(kpid, vats);
          }
          vats.push(vatID);
        }
      }
    }
    console.log(` - pending notifies:`, notifies);

    // cache of known-settled kpids: will grow to num(kpids)
    const KPIDStatus = new Map();
    const isSettled = kpid => {
      if (KPIDStatus.has(kpid)) {
        return KPIDStatus.get(kpid);
      }
      const state = kvStore.get(`${kpid}.state`);
      // missing state means the kpid is deleted somehow, shouldn't happen
      state || Fail`${kpid}.state is missing`;
      const settled = state !== 'unresolved';
      KPIDStatus.set(kpid, settled);
      return settled;
    };

    // walk vNN.c.kpNN for all vats, for each one check the
    // kpNN.state, for the settled ones check for a pending notify,
    // record the ones without a pending notify

    const buggyKPIDs = []; // [kpid, vatID]
    for (const vatID of allVatIDs) {
      const prefix = `${vatID}.c.`;
      const len = prefix.length;
      const ckpPrefix = `${vatID}.c.kp`;
      for (const { key } of enumeratePrefixedKeys(kvStore, ckpPrefix)) {
        const kpid = key.slice(len);
        if (isSettled(kpid)) {
          const n = notifies.get(kpid);
          if (!n || !n.includes(vatID)) {
            // there is no pending notify
            buggyKPIDs.push([kpid, vatID]);
          }
        }
      }
    }
    console.log(` - found ${buggyKPIDs.length} buggy kpids, enqueueing fixes`);

    // now fix it. The bug means we failed to delete the c-list entry
    // and decref it back when the promise was rejected. That decref
    // would have pushed the kpid onto maybeFreeKrefs, which would
    // have triggered a refcount check at end-of-crank, which might
    // have deleted the promise records (if nothing else was
    // referencing the promise, like arguments in messages enqueued to
    // unresolved promises, or something transient on the
    // run-queue). Deleting those promise records might have decreffed
    // krefs in the rejection data (although in general 9039 rejects
    // those promises with non-slot-bearing DisconnectionObjects).
    //
    // To avoid duplicating a lot of kernel code inside this upgrade
    // handler, we do the simplest possible thing: enqueue a notify to
    // the upgraded vat for all these leftover promises. The new vat
    // incarnation will ignore it (they don't recognize the vpid), but
    // the dispatch.notify() delivery will clear the c-list and decref
    // the kpid, and will trigger all the usual GC work. Note that
    // these notifies will be delivered before any activity the host
    // app might trigger for e.g. a chain upgrade, but they should not
    // cause userspace-visible behavior (non-slot-bearing rejection
    // data means no other vat will even get a gc-action delivery:
    // only the upgraded vat will see anything, and those deliveries
    // won't make it past liveslots).

    let count = 0;
    for (const [kpid, vatID] of buggyKPIDs) {
      // account for the reference to this kpid in upgradeEvents
      incrementReferenceCount(getRequired, kvStore, kpid, `enq|notify`);
      upgradeEvents.push({ type: 'notify', vatID, kpid });
      count += 1;
    }

    console.log(` - #9039 remediation complete, ${count} notifies to inject`);
    newVersion = 3;
  }

  const modified = newVersion !== undefined;

  if (upgradeEvents.length) {
    assert(modified);
    // stash until host calls controller.injectQueuedUpgradeEvents()
    const oldEvents = JSON.parse(kvStore.get('upgradeEvents') || '[]');
    const events = [...oldEvents, ...upgradeEvents];
    kvStore.set('upgradeEvents', JSON.stringify(events));
  }

  if (modified) {
    kvStore.set('version', `${newVersion}`);
  }
  return harden({ modified });
};
harden(upgradeSwingset);
