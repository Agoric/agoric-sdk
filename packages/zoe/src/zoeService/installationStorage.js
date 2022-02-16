// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@endo/marshal';
import { E } from '@agoric/eventual-send';
import { makeWeakStore } from '@agoric/store';

/**
 * @param {GetBundlecapFromID} getBundlecapFromID
 */
export const makeInstallationStorage = getBundlecapFromID => {
  /** @type {WeakStore<Installation, Bundlecap>} */
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
  /** @type {Install} */
  const install = async bundleOrID => {
    /** @type {Installation} */
    let installation;
    if (typeof bundleOrID === 'object') {
      /** @type {SourceBundle} */
      const bundle = bundleOrID;
      installation = Far('Installation', {
        getBundle: () => bundle,
        getBundleID: () => {
          throw Error('installation used a bundle, not ID');
        },
      });
      installationsBundle.init(installation, bundle);
      return installation;
    }
    assert.typeof(bundleOrID, 'string', `needs bundle or bundle ID`);
    /** @type {BundleID} */
    const bundleID = bundleOrID;
    // this waits until someone tells the host application to store the
    // bundle into the kernel, with controller.validateAndInstallBundle()
    const bundlecap = await getBundlecapFromID(bundleID);
    installation = Far('Installation', {
      getBundle: () => {
        throw Error('installation used a bundleID, not bundle');
      },
      getBundleID: () => bundleID,
    });
    installationsBundlecap.init(installation, bundlecap);
    return installation;
  };

  /** @type {UnwrapInstallation} */
  const unwrapInstallation = installationP => {
    return E.when(installationP, installation => {
      if (installationsBundlecap.has(installation)) {
        return {
          bundleOrBundlecap: installationsBundlecap.get(installation),
          installation,
        };
      } else if (installationsBundle.has(installation)) {
        return {
          bundleOrBundlecap: installationsBundle.get(installation),
          installation,
        };
      } else {
        assert.fail(X`${installation} was not a valid installation`);
      }
    });
  };

  return harden({
    install,
    unwrapInstallation,
  });
};
