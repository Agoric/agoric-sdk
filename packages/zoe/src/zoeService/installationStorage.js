// @ts-check

const { details: X } = assert;
import { Far } from '@endo/marshal';
import { E } from '@endo/eventual-send';
import { makeWeakStore } from '@agoric/store';

/** @typedef { import('@agoric/swingset-vat').BundleID} BundleID */

/**
 * @param {GetBundleCapForID} getBundleCapForID
 */
export const makeInstallationStorage = getBundleCapForID => {
  /** @type {WeakStore<Installation, { bundleCap: BundleCap, bundleID: BundleID }>} */
  const installationsBundleCap = makeWeakStore('installationsBundleCap');
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

  /** @type {InstallBundleID} */
  const installBundleID = async bundleID => {
    assert.typeof(bundleID, 'string', `a bundle ID must be provided`);
    // this waits until someone tells the host application to store the
    // bundle into the kernel, with controller.validateAndInstallBundle()
    const bundleCap = await getBundleCapForID(bundleID);
    // AWAIT

    /** @type {Installation} */
    // @ts-expect-error cast
    const installation = Far('Installation', {
      getBundle: () => {
        throw Error('bundleID-based Installation');
      },
    });
    installationsBundleCap.init(installation, { bundleCap, bundleID });
    return installation;
  };

  /** @type {InstallBundle} */
  const installSourceBundle = async bundle => {
    assert.typeof(bundle, 'object', 'a bundle must be provided');
    /** @type {Installation} */
    // @ts-expect-error cast
    const installation = Far('Installation', {
      getBundle: () => bundle,
    });
    installationsBundle.init(installation, bundle);
    return installation;
  };

  /** @type {InstallBundle} */
  const installBundle = async allegedBundle => {
    // Bundle is a very open-ended type and we must decide here
    // whether to treat it as either a HashBundle or SourceBundle.
    // So, we cast it down and inspect it.
    const bundle = /** @type {unknown} */ (allegedBundle);
    assert.typeof(bundle, 'object', 'a bundle must be provided');
    assert(bundle !== null, 'a bundle must be provided');
    const { moduleFormat } = bundle;
    if (moduleFormat === 'endoZipBase64Sha512') {
      const { endoZipBase64Sha512 } = bundle;
      assert.typeof(
        endoZipBase64Sha512,
        'string',
        `bundle endoZipBase64Sha512 must be a string, got ${endoZipBase64Sha512}`,
      );
      return installBundleID(`b1-${endoZipBase64Sha512}`);
    }
    return installSourceBundle(bundle);
  };

  /** @type {UnwrapInstallation} */
  const unwrapInstallation = installationP => {
    return E.when(installationP, installation => {
      if (installationsBundleCap.has(installation)) {
        const { bundleCap, bundleID } =
          installationsBundleCap.get(installation);
        return { bundleCap, bundleID, installation };
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
    // AWAIT
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
