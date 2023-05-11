/* eslint-disable no-await-in-loop */
// @ts-check

import { Fail } from '@agoric/assert';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { M, mustMatch } from '@agoric/store';
import { E, getInterfaceOf } from '@endo/far';

const trace = makeTracer('RV');

const HR = '----------------';

/**
 * TODO cover each of these collections
 * - [x] contractKits
 * - [ ] psmKit
 * - [x] governedContractKits
 * - [ ] vatStore
 */

/**
 * @param {BootstrapPowers & import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} space
 * @param {object} config
 * @param {{ skip: Array<string>}} config.options
 */
export const restartVats = async ({ consume }, { options }) => {
  console.log(HR);
  console.log(HR);
  trace('restartVats start', options);
  mustMatch(options, harden({ skip: M.arrayOf(M.string()) }));

  trace('awaiting VaultFactorKit as a proxy for "bootstrap done"');
  await consume.vaultFactoryKit;

  trace('testing restarts');
  const { contractKits, governedContractKits } = await deeplyFulfilledObject(
    harden({
      contractKits: consume.contractKits,
      governedContractKits: consume.governedContractKits,
    }),
  );

  const { instancePrivateArgs } = await consume.diagnostics;

  const failures = [];
  /**
   *
   * @param {string} debugName
   * @param {Instance} instance
   * @param {ERef<AdminFacet>} adminFacet
   */
  const tryRestart = async (debugName, instance, adminFacet) => {
    // TODO document that privateArgs cannot contain promises
    // TODO try making all the contract starts take resolved values
    const privateArgs = await deeplyFulfilledObject(
      // @ts-expect-error cast
      harden(instancePrivateArgs.get(instance) || {}),
    );

    console.log(HR);
    console.log(HR);
    console.log(HR);
    console.log(HR);
    trace('tryRestart', debugName, privateArgs);

    if (options.skip.includes(debugName)) {
      trace('SKIPPED', debugName);
      return;
    }
    try {
      await E(adminFacet).restartContract(privateArgs);
      trace('RESTARTED', debugName);
    } catch (err) {
      trace('🚨 RESTART FAILED', debugName, err);
      failures.push(debugName);
    }
  };

  // iterate over the two contractKits and use the adminFacet to restartContract
  for (const kit of contractKits.values()) {
    const debugName =
      kit.label || getInterfaceOf(kit.publicFacet) || 'UNLABELED';
    if (debugName !== kit.label) {
      console.warn('MISSING LABEL:', kit);
    }
    await tryRestart(debugName, kit.instance, kit.adminFacet);
  }

  for (const kit of governedContractKits.values()) {
    const debugName =
      kit.label || getInterfaceOf(kit.publicFacet) || 'UNLABELED';
    if (debugName !== kit.label) {
      console.warn('MISSING LABEL:', kit);
    }

    trace('restarting governed', debugName);
    await tryRestart(debugName, kit.instance, kit.adminFacet);

    trace('restarting governor of', debugName);
    await tryRestart(
      `${debugName} [Governor]`,
      kit.governor,
      kit.governorAdminFacet,
    );
  }

  trace('restartVats done with ', failures.length, 'failures');
  console.log(HR);
  if (failures.length) {
    Fail`restart failed for ${failures.join(',')}`;
  }
  console.log(HR);
};
harden(restartVats);

export const getManifestForRestart = (_powers, options) => ({
  manifest: {
    [restartVats.name]: {
      consume: {
        contractKits: true,
        diagnostics: true,
        governedContractKits: true,
        loadCriticalVat: true,
        zoe: 'zoe',
        provisioning: 'provisioning',
        vaultFactoryKit: true,
      },
      produce: {},
    },
  },
  options,
});
harden(getManifestForRestart);
