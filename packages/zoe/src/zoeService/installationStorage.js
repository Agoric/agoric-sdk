// @ts-check

// XXX necessary for CLI
import '@agoric/swingset-vat/src/types.js';

import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
import { E } from '@agoric/eventual-send';
import { makeWeakStore } from '@agoric/store';

/**
 * @param {GetBundlecapForID} getBundlecapForID
 */
export const makeInstallationStorage = getBundlecapForID => {
  /** @type {WeakStore<Installation, { bundlecap: Bundlecap, bundleID: BundleID }>} */
  const installationsBundlecap = makeWeakStore('installationsBundlecap');
  /** @type {WeakStore<Installation, SourceBundle>} */
  const installationsBundle = makeWeakStore('installationsBundle');

  /**
   * Create an installation from a bundle ID or a full bundle. If we are
   * given a bundle ID, wait for the corresponding code bundle to be received
   * by the swingset kernel, then store its bundlecap. The code is currently
   * evaluated each time it is used to make a new instance of a contract.
   * When SwingSet supports zygotes, the code will be evaluated once when
   * creating a zcfZygote, then the start() function will be called each time
   * an instance is started.
   */

  /** @type {InstallBundle} */
  const installBundle = async bundle => {
    assert.typeof(bundle, 'object', 'a bundle must be provided');
    /** @type {Installation} */
    const installation = Far('Installation', {
      getBundle: () => bundle,
    });
    installationsBundle.init(installation, bundle);
    return installation;
  };

  /** @type {InstallBundleID} */
  const installBundleID = async bundleID => {
    assert.typeof(bundleID, 'string', `a bundle ID must be provided`);
    // this waits until someone tells the host application to store the
    // bundle into the kernel, with controller.validateAndInstallBundle()
    const bundlecap = await getBundlecapForID(bundleID);
    /** @type {Installation} */
    const installation = Far('Installation', {
      getBundle: () => {
        throw Error('bundleID-based Installation');
      },
    });
    installationsBundlecap.init(installation, { bundlecap, bundleID });
    return installation;
  };

  /** @type {UnwrapInstallation} */
  const unwrapInstallation = installationP => {
    return E.when(installationP, installation => {
      if (installationsBundlecap.has(installation)) {
        const { bundlecap, bundleID } =
          installationsBundlecap.get(installation);
        return { bundlecap, bundleID, installation };
      } else if (installationsBundle.has(installation)) {
        const bundle = installationsBundle.get(installation);
        return { bundle, installation };
      } else {
        assert.fail(X`${installation} was not a valid installation`);
      }
    });
  };

  const getBundleIDFromInstallation = async allegedInstallationP => {
    const { bundleID } = await unwrapInstallation(allegedInstallationP);
    assert(bundleID, 'installation does not have a bundle ID');
    return bundleID;
  };

  return harden({
    installBundle,
    installBundleID,
    unwrapInstallation,
    getBundleIDFromInstallation,
  });
};
