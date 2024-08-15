import {
  DEFAULT_REAP_DIRT_THRESHOLD_KEY,
  DEFAULT_GC_KREFS_PER_BOYD,
  getAllDynamicVats,
  getAllStaticVats,
} from '../kernel/state/kernelKeeper.js';

const upgradeVatV0toV1 = (kvStore, defaultReapDirtThreshold, vatID) => {
  // This is called, once per vat, when upgradeSwingset migrates from
  // v0 to v1

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

  assert(kvStore.has(oldReapIntervalKey), oldReapIntervalKey);
  assert(kvStore.has(oldReapCountdownKey), oldReapCountdownKey);
  assert(!kvStore.has(reapDirtKey), reapDirtKey);

  const reapIntervalString = kvStore.get(oldReapIntervalKey);
  const reapCountdownString = kvStore.get(oldReapCountdownKey);
  assert(reapIntervalString !== undefined);
  assert(reapCountdownString !== undefined);

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
    const reapInterval = Number.parseInt(reapIntervalString, 10);
    const reapCountdown = Number.parseInt(reapCountdownString, 10);
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
  const options = JSON.parse(kvStore.get(vatOptionsKey));
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
 * @returns {boolean} true if any changes were made
 */
export const upgradeSwingset = kernelStorage => {
  const { kvStore } = kernelStorage;
  let modified = false;
  let vstring = kvStore.get('version');
  if (vstring === undefined) {
    vstring = '0';
  }
  let version = Number(vstring);

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

    /**
     * @typedef { import('../types-internal.js').ReapDirtThreshold } ReapDirtThreshold
     */

    /** @type ReapDirtThreshold */
    const threshold = {
      deliveries: 'never',
      gcKrefs: 'never',
      computrons: 'never',
    };

    const oldValue = getRequired(oldDefaultReapIntervalKey);
    if (oldValue !== 'never') {
      const value = Number.parseInt(oldValue, 10);
      assert.typeof(value, 'number');
      threshold.deliveries = value;
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
      upgradeVatV0toV1(kvStore, threshold, vatID);
    }
    for (const vatID of getAllDynamicVats(getRequired)) {
      upgradeVatV0toV1(kvStore, threshold, vatID);
    }

    modified = true;
    version = 1;
  }

  if (version < 2) {
    // schema v2: add vats.terminated = []
    assert(!kvStore.has('vats.terminated'));
    kvStore.set('vats.terminated', JSON.stringify([]));
    modified = true;
    version = 2;
  }

  if (modified) {
    kvStore.set('version', `${version}`);
  }
  return modified;
};
harden(upgradeSwingset);
