// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

/**
 *
 */
export const makeInstallationStorage = () => {
  /** @type {WeakSet<Installation>} */
  const installations = new WeakSet();

  /**
   * Create an installation by permanently storing the bundle. The code will be
   * evaluated once when creating a zcfZygote, then the start() function will be
   * called each time an instance is started.
   */
  /** @type {Install} */
  const install = async bundle => {
    assert.typeof(bundle, 'object', X`a bundle must be provided`);
    /** @type {Installation} */
    const installation = Far('Installation', {
      getBundle: () => bundle,
    });
    installations.add(installation);
    return installation;
  };

  const assertInstallation = installation =>
    assert(
      installations.has(installation),
      X`${installation} was not a valid installation`,
    );

  /** @type {UnwrapInstallation} */
  const unwrapInstallation = installationP => {
    return E.when(installationP, installation => {
      assertInstallation(installation);
      const bundle = installation.getBundle();
      return { bundle, installation };
    });
  };

  return harden({
    install,
    unwrapInstallation,
  });
};
