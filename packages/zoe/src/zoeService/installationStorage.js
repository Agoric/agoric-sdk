import { assert, details as X } from '@agoric/assert';
import { E } from '@endo/eventual-send';
import {
  M,
  makeScalarBigMapStore,
  provideDurableWeakMapStore,
  vivifyFarInstance,
  vivifyKind,
} from '@agoric/vat-data';
import { initEmpty } from '@agoric/store';
import { InstallationShape } from '../typeGuards.js';

/** @typedef { import('@agoric/swingset-vat').BundleCap} BundleCap */
/** @typedef { import('@agoric/swingset-vat').BundleID} BundleID */
/** @typedef {import('@agoric/vat-data').Baggage} Baggage */

export const SourceBundleShape = M.recordOf(M.string(), M.string());
export const ModuleFormatBundleShape = M.splitRecord(
  harden({}),
  harden({ moduleFormat: M.any() }),
);
export const BundleShape = M.or(ModuleFormatBundleShape, SourceBundleShape);

/**
 * @param {GetBundleCapForID} getBundleCapForID
 * @param {Baggage} [zoeBaggage] optional only so it can be omitted in tests
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

  /** @type {InstallBundle} */
  const installSourceBundle = async bundle => {
    assert.typeof(bundle, 'object', 'a bundle must be provided');
    /** @type {Installation} */
    assert(bundle, 'a bundle must be provided');
    /** @type {Installation} */
    // @ts-expect-error cast
    const installation = makeBundleInstallation(bundle);
    installationsBundle.init(installation, bundle);
    return installation;
  };

  const InstallationStorageI = M.interface('InstallationStorage', {
    installBundle: M.call(BundleShape).returns(M.promise()),
    installBundleID: M.call(M.string()).returns(M.promise()),
    unwrapInstallation: M.callWhen(M.await(InstallationShape)).returns(M.any()),
    getBundleIDFromInstallation: M.call(InstallationShape).returns(M.promise()),
  });

  const installationStorage = vivifyFarInstance(
    zoeBaggage,
    'InstallationStorage',
    InstallationStorageI,
    {
      async installBundle(allegedBundle) {
        // Bundle is a very open-ended type and we must decide here whether to
        // treat it as either a HashBundle or SourceBundle. So we have to
        // inspect it.
        assert.typeof(allegedBundle, 'object', 'a bundle must be provided');
        assert(allegedBundle !== null, 'a bundle must be provided');
        const { moduleFormat } = allegedBundle;
        if (moduleFormat === 'endoZipBase64Sha512') {
          const { endoZipBase64Sha512 } = allegedBundle;
          assert.typeof(
            endoZipBase64Sha512,
            'string',
            `bundle endoZipBase64Sha512 must be a string, got ${endoZipBase64Sha512}`,
          );
          return this.installBundleID(`b1-${endoZipBase64Sha512}`);
        }
        return installSourceBundle(allegedBundle);
      },
      async installBundleID(bundleID) {
        assert.typeof(bundleID, 'string', `a bundle ID must be provided`);
        // this waits until someone tells the host application to store the
        // bundle into the kernel, with controller.validateAndInstallBundle()
        const bundleCap = await getBundleCapForID(bundleID);
        // AWAIT

        /** @type {Installation} */
        // @ts-expect-error cast
        const installation = makeBundleIDInstallation();
        installationsBundleCap.init(
          installation,
          harden({ bundleCap, bundleID }),
        );
        return installation;
      },
      unwrapInstallation(installation) {
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
      },
      async getBundleIDFromInstallation(allegedInstallationP) {
        // @ts-expect-error TS doesn't understand context
        const { self } = this;
        const { bundleID } = await self.unwrapInstallation(
          allegedInstallationP,
        );
        // AWAIT
        assert(bundleID, 'installation does not have a bundle ID');
        return bundleID;
      },
    },
  );

  return installationStorage;
};
