import { assert, Fail } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import {
  makeScalarBigMapStore,
  provideDurableWeakMapStore,
  vivifyKind,
} from '@agoric/vat-data';
import { initEmpty } from '@agoric/store';

/** @typedef { import('@agoric/swingset-vat').BundleCap} BundleCap */
/** @typedef { import('@agoric/swingset-vat').BundleID} BundleID */
/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

/**
 * @param {GetBundleCapForID} getBundleCapForID
 * @param {Baggage} [zoeBaggage]
 */
export const makeInstallationStorage = (
  getBundleCapForID,
  zoeBaggage = makeScalarBigMapStore('zoe baggage', { durable: true }),
) => {
  /** @type {WeakStore<Installation, { bundleCap: BundleCap, bundleID: BundleID }>} */
  const installationsBundleCap = provideDurableWeakMapStore(
    zoeBaggage,
    'installationsBundleCap',
  );
  /** @type {WeakStore<Installation, SourceBundle>} */
  const installationsBundle = provideDurableWeakMapStore(
    zoeBaggage,
    'installationsBundle',
  );

  const makeBundleIDInstallation = vivifyKind(
    zoeBaggage,
    'BundleIDInstallation',
    initEmpty,
    { getBundle: _context => assert.fail('bundleID-based Installation') },
  );

  const makeBundleInstallation = vivifyKind(
    zoeBaggage,
    'BundleInstallation',
    bundle => ({ bundle }),
    { getBundle: ({ state: { bundle } }) => bundle },
  );

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
    const installation = makeBundleIDInstallation();
    installationsBundleCap.init(installation, harden({ bundleCap, bundleID }));
    return installation;
  };

  /** @type {InstallBundle} */
  const installSourceBundle = async bundle => {
    assert.typeof(bundle, 'object', 'a bundle must be provided');
    /** @type {Installation} */
    // @ts-expect-error cast
    const installation = makeBundleInstallation(bundle);
    assert(bundle, 'a bundle must be provided');
    installationsBundle.init(installation, bundle);
    return installation;
  };

  /** @type {InstallBundle} */
  const installBundle = async allegedBundle => {
    // Bundle is a very open-ended type and we must decide here
    // whether to treat it as either a HashBundle or SourceBundle.
    // So, we cast it down and inspect it.
    const bundle = /** @type {unknown} */ (harden(allegedBundle));
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
        throw Fail`${installation} was not a valid installation`;
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
