import { getLockdownBundleSHA256, getLockdownBundle } from '@agoric/xsnap-lockdown';
import { getSupervisorBundleSHA256, getSupervisorBundle } from '@agoric/swingset-xsnap-supervisor';


export const makeXsnapBundleData = harden(() => {
  return harden({
    getLockdownBundleSHA256,
    getLockdownBundle,
    getSupervisorBundleSHA256,
    getSupervisorBundle,
  });
});

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
 * @param {ReturnType<makeXsnapBundleData>} bundleData
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

