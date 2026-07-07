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

// kvStore key holding the v4 migration's promotion directive: a JSON array of
// vatIDs to promote to `critical` (see the v4 step in upgradeSwingset below and
// issue kriskowal/garden#29). Selection is by explicit vatID, NOT by label,
// because:
//   * a Zoe contract vat's kernel-level `options.name` is
//     `zcf-<bundleLabel>[-<instanceLabel>]` (packages/zoe/src/zoeService/
//     zoeStorageManager.js and zoe.js `createZCFVat`), so the contract's own
//     name ("ymax") need not appear in it at all; and
//   * mainnet runs BOTH ymax0 and ymax1, so any "ymax" match is ambiguous.
// A vatID is chain-specific and unforgeable, so the pin must be resolved by the
// chainID-gated host — the cosmos upgrade handler (golang/cosmos/app/upgrade.go)
// already resolves per-chain vat targets under `switch ctx.ChainID()` (the
// `terminationTargets` precedent), e.g. v288=ymax1 on agoric-3, v320=ymax0 on
// agoricdev-25. It cannot be resolved here: upgradeSwingset runs during
// launch(), BEFORE AG_COSMOS_INIT delivers the chainID, so this step has no way
// to self-gate by chain — which is exactly why an earlier draft reached for a
// label match. The host writes the resolved vatID(s) into this key before the
// reboot; absent the key the v4 step is a clean no-op.
export const CRITICAL_PROMOTION_DIRECTIVE_KEY = 'upgrade.promoteCriticalVats';

/**
 * @import {ReapDirtThreshold, RunQueueEvent} from '../types-internal.js';
 * @import {KVStore} from '../types-external.js';
 * @import {SwingStoreKernelStorage} from '../types-external.js';
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
      const ckpPrefix = `${vatID}.c.kp`;
      for (const { suffix } of enumeratePrefixedKeys(kvStore, ckpPrefix)) {
        const kpid = `kp${suffix}`;
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

  if (version < 4) {
    // schema v4: promote host-designated running contract vats to `critical`,
    // so termination of such a vat panics (halts) the kernel instead of
    // silently severing the vat and its exports. See issue kriskowal/garden#29.
    //
    // Why kernel-side, and why here: `critical` is fixed at createVat time
    // behind an unforgeable key, and no runtime path (upgradeVat, or
    // changeOptions which whitelists only reapInterval) can flip it on an
    // already-running vat. But it is ultimately just a boolean persisted in
    // `${vatID}.options`, read fresh by kernel.js terminateVat()
    // (`if (critical) panic(...)`). Rewriting that blob here promotes the vat
    // *in place*, preserving all of its state and capabilities. A core-eval
    // can't do this (it runs in-consensus at the vat level and can't reach
    // kernel kvStore); this migration, riding the chain software upgrade's
    // binary and running at the reboot point before the controller is built,
    // can.
    //
    // Target SELECTION is by explicit vatID supplied by the chain-gated host in
    // CRITICAL_PROMOTION_DIRECTIVE_KEY (see its definition above) — NOT by
    // label, which is neither reliable (the name may not contain the contract's
    // own label) nor unambiguous (mainnet runs both ymax0 and ymax1). Absent a
    // directive this is a clean no-op that only bumps the version — the case on
    // every non-Agoric SwingSet and every chain not being promoted. The vatID
    // guards below turn a stale or mis-chained pin into a loud failure rather
    // than a silent wrong-vat promotion.
    const directive = kvStore.get(CRITICAL_PROMOTION_DIRECTIVE_KEY);
    const targetVatIDs = directive ? JSON.parse(directive) : [];
    const terminated = new Set(
      JSON.parse(kvStore.get('vats.terminated') || '[]'),
    );
    const dynamicVats = new Set(getAllDynamicVats(getRequired));

    const promoted = [];
    for (const vatID of targetVatIDs) {
      // Guard the pin: it must name a live, non-terminated dynamic (contract)
      // vat. A directive is chain-resolved, so a vatID absent on this chain is
      // a host error, not something to skip silently.
      dynamicVats.has(vatID) ||
        Fail`v4 critical-promotion: ${vatID} is not a live dynamic vat`;
      !terminated.has(vatID) ||
        Fail`v4 critical-promotion: ${vatID} is terminated`;
      const optionsKey = `${vatID}.options`;
      const options = JSON.parse(getRequired(optionsKey));
      // Defense in depth: only a Zoe contract vat (name `zcf...`) is a valid
      // target here. This is an assertion guard, never the selector — per
      // garden#29 the name may not carry the contract's own label.
      (typeof options.name === 'string' && options.name.startsWith('zcf')) ||
        Fail`v4 critical-promotion: ${vatID} (${options.name}) is not a contract vat`;
      if (!options.critical) {
        options.critical = true;
        kvStore.set(optionsKey, JSON.stringify(options));
        promoted.push(`${vatID} (${options.name})`);
      }
    }
    // Consume the one-shot directive so any later replay is a no-op.
    if (directive) {
      kvStore.delete(CRITICAL_PROMOTION_DIRECTIVE_KEY);
    }
    console.log(
      `v4 critical-promotion: promoted ${promoted.length} vat(s): ${
        promoted.join(', ') || '(none)'
      }`,
    );
    newVersion = 4;
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
