import { Fail } from '@endo/errors';
import { deeplyFulfilledObject, makeTracer } from '@agoric/internal';
import { M, mustMatch } from '@agoric/store';
import { E, getInterfaceOf } from '@endo/far';

const trace = makeTracer('RV');

const HR = '----------------';

/**
 * Non-contract vats aren't automatically restarted here because doing it would
 * break many other tests that are fragile.
 */
const vatUpgradeStatus = {
  agoricNames: 'UNTESTED',
  bank: 'covered by test-upgrade-vats: upgrade vat-bank',
  board: 'covered by test-upgrade-vats: upgrade vat-board',
  bridge: 'covered by test-upgrade-vats: upgrade vat-bridge',
  ibc: 'upgradeable',
  localchain: 'UNTESTED',
  network: 'upgradeable',
  priceAuthority: 'covered by test-upgrade-vats: upgrade vat-priceAuthority',
  provisioning: 'UNTESTED',
  transfer: 'UNTESTED',
  zoe: 'tested in @agoric/zoe',
};

/**
 * @param {BootstrapPowers &
 *   import('@agoric/inter-protocol/src/proposals/econ-behaviors.js').EconomyBootstrapSpace} space
 * @param {object} config
 * @param {{ skip: string[] }} config.options
 */
export const restartVats = async ({ consume }, { options }) => {
  console.log(HR);
  console.log(HR);
  trace('restartVats start', options);
  mustMatch(options, harden({ skip: M.arrayOf(M.string()) }));

  trace('awaiting VaultFactorKit as a proxy for "bootstrap done"');
  await consume.vaultFactoryKit;

  trace('testing restarts');
  const { contractKits, governedContractKits, psmKit, vatStore } =
    await deeplyFulfilledObject(
      harden({
        contractKits: consume.contractKits,
        governedContractKits: consume.governedContractKits,
        psmKit: consume.psmKit,
        vatStore: consume.vatStore,
      }),
    );

  const instancePrivateArgs = await consume.instancePrivateArgs;

  const failures = [];
  /**
   * @param {string} debugName
   * @param {Instance} instance
   * @param {ERef<AdminFacet>} adminFacet
   */
  const tryRestartContract = async (debugName, instance, adminFacet) => {
    // TODO document that privateArgs cannot contain promises
    // TODO try making all the contract starts take resolved values
    const privateArgs = await deeplyFulfilledObject(
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

  trace('iterating over contractKits');
  for (const kit of contractKits.values()) {
    const debugName =
      kit.label || getInterfaceOf(kit.publicFacet) || 'UNLABELED';
    if (debugName !== kit.label) {
      console.warn('MISSING LABEL:', kit);
    }
    await tryRestartContract(debugName, kit.instance, kit.adminFacet);
  }

  trace('iterating over governedContractKits');
  for (const kit of governedContractKits.values()) {
    const debugName =
      kit.label || getInterfaceOf(kit.publicFacet) || 'UNLABELED';
    if (debugName !== kit.label) {
      console.warn('MISSING LABEL:', kit);
    }

    trace('restarting governed', debugName);
    await tryRestartContract(debugName, kit.instance, kit.adminFacet);

    trace('restarting governor of', debugName);
    await tryRestartContract(
      `${debugName} [Governor]`,
      kit.governor,
      kit.governorAdminFacet,
    );
  }

  trace('iterating over psmKit');
  for (const kit of psmKit.values()) {
    console.log('restarting PSM', kit.label);
    await tryRestartContract(kit.label, kit.psm, kit.psmAdminFacet);
  }

  trace('iterating over vatStore');
  for (const [name, { adminNode }] of vatStore.entries()) {
    const status = vatUpgradeStatus[name];
    if (!status) {
      Fail`unaudited vat ${name}`;
    }
    if (status === 'upgradeable') {
      console.log('upgrading vat', name);
      const { vatAdminSvc } = consume;
      const info = await consume.vatUpgradeInfo;
      const { bundleID, bundleName } = info.get(name);
      const bcap = await (bundleID
        ? E(vatAdminSvc).getBundleCap(bundleID)
        : E(vatAdminSvc).getNamedBundleCap(bundleName));
      await E(adminNode).upgrade(bcap);
    }
    console.log('VAT', name, status);
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
        governedContractKits: true,
        instancePrivateArgs: true,
        loadCriticalVat: true,
        psmKit: true,
        vatStore: true,
        vatAdminSvc: true,
        vatUpgradeInfo: true,
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
