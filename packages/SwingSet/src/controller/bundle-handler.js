/* global globalThis */
import {
  getLockdownBundleSHA256,
  getLockdownBundle,
  getDebugLockdownBundleSHA256,
  getDebugLockdownBundle,
} from '@agoric/xsnap-lockdown';
import {
  getSupervisorBundleSHA256,
  getSupervisorBundle,
} from '@agoric/swingset-xsnap-supervisor';

/**
 * `debug` defaults to `globalThis.__XSNAP_LOCKDOWN_DEBUG__`, set by
 * `@agoric/swingset-liveslots/tools/prepare-test-env.js` -- the same shared
 * choke point that already puts locally-managed (in-process) vats under a
 * debug (`errorTaming: 'unsafe'`) lockdown, for the sake of assertion
 * messages test code wants to inspect. Real xsnap workers otherwise always
 * get the production (safe/redacted) lockdown, regardless of manager type,
 * since they boot in their own process with their own independent lockdown
 * call. This flag is read fresh on every call, in the same Node process
 * that decides what bundle bytes to hand each xsnap worker -- it never
 * crosses a process boundary, and nothing outside test tooling ever sets it.
 *
 * @param {boolean} [debug]
 */
export const makeXsnapBundleData = harden(
  // eslint-disable-next-line no-underscore-dangle -- conventional marker for an internal-use-only global
  (debug = !!globalThis.__XSNAP_LOCKDOWN_DEBUG__) => {
    return harden({
      getLockdownBundleSHA256: debug
        ? getDebugLockdownBundleSHA256
        : getLockdownBundleSHA256,
      getLockdownBundle: debug ? getDebugLockdownBundle : getLockdownBundle,
      getSupervisorBundleSHA256,
      getSupervisorBundle,
    });
  },
);

/**
 * @typedef {import('../types-external.js').BundleID} BundleID
 * @typedef {import('../types-external.js').Bundle} Bundle
 *
 * @typedef {object} BundleHandler
 * @property {() => Promise<BundleID[]>} getCurrentBundleIDs
 * @property {(id: BundleID) => Promise<Bundle>} getBundle
 */

/**
 * @param {import('@agoric/swing-store').BundleStore} bundleStore
 * @param {ReturnType<typeof makeXsnapBundleData>} bundleData
 * @returns {BundleHandler}
 */
export const makeWorkerBundleHandler = harden((bundleStore, bundleData) => {
  const {
    getLockdownBundleSHA256,
    getLockdownBundle,
    getSupervisorBundleSHA256,
    getSupervisorBundle,
  } = bundleData;

  return harden({
    getCurrentBundleIDs: async () => {
      const lockdownHash = await getLockdownBundleSHA256();
      const lockdownID = `b0-${lockdownHash}`;
      if (!bundleStore.hasBundle(lockdownID)) {
        const lockdownBundle = await getLockdownBundle();
        bundleStore.addBundle(lockdownID, lockdownBundle);
      }

      const supervisorHash = await getSupervisorBundleSHA256();
      const supervisorID = `b0-${supervisorHash}`;
      if (!bundleStore.hasBundle(supervisorID)) {
        const supervisorBundle = await getSupervisorBundle();
        bundleStore.addBundle(supervisorID, supervisorBundle);
      }

      return [lockdownID, supervisorID]; // order is important
    },
    getBundle: async id => {
      return bundleStore.getBundle(id);
    },
  });
});
