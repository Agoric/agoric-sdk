// @ts-check

import { assert, details as X } from '@agoric/assert';
import { Far } from '@agoric/marshal';
import { E } from '@agoric/eventual-send';

/**
 * @param {ChargeZoeFee} chargeZoeFee
 * @param {Amount} installFeeAmount
 */
export const makeInstallationStorage = (chargeZoeFee, installFeeAmount) => {
  /** @type {WeakSet<Installation>} */
  const installations = new WeakSet();

  /**
   * Create an installation by permanently storing the bundle. It will be
   * evaluated each time it is used to make a new instance of a contract.
   */
  /** @type {InstallFeePurseRequired} */
  const install = async (bundle, feePurse) => {
    assert.typeof(bundle, 'object', X`a bundle must be provided`);
    await chargeZoeFee(feePurse, installFeeAmount);
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
