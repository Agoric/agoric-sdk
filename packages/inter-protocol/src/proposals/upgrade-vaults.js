import { E } from '@endo/far';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp/src/index.js';
import { makeTracer } from '@agoric/internal/src/index.js';
import { Fail } from '@endo/errors';
import { TimeMath } from '@agoric/time';

const trace = makeTracer('upgrade Vaults proposal');

/**
 * @typedef {PromiseSpaceOf<{
 *   auctionUpgradeNewInstance: Instance;
 * }>} interlockPowers
 */

/**
 * @param {import('../../src/proposals/econ-behaviors').EconomyBootstrapPowers &
 *     interlockPowers} powers
 * @param {{ options: { vaultsRef: { bundleID: string } } }} options
 */
export const upgradeVaults = async (
  {
    consume: {
      auctionUpgradeNewInstance,
      chainTimerService,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveKit,
      vaultFactoryKit,
      zoe,
    },
    produce: { auctionUpgradeNewInstance: auctionUpgradeNewInstanceProducer },
    installation: {
      produce: { VaultFactory: produceVaultInstallation },
    },
    instance: {
      consume: { auctioneer: auctioneerInstanceP },
    },
  },
  { options },
) => {
  const { vaultsRef } = options;
  const kit = await vaultFactoryKit;
  const { instance: directorInstance } = kit;
  const allBrands = await E(zoe).getBrands(directorInstance);
  const { Minted: _istBrand, ...vaultBrands } = allBrands;

  const bundleID = vaultsRef.bundleID;
  console.log(`upgradeVaults: bundleId`, bundleID);
  /**
   * @type {Promise<
   *   Installation<import('../../src/vaultFactory/vaultFactory.js')['start']>
   * >}
   */
  const installationP = E(zoe).installBundleID(bundleID);
  produceVaultInstallation.reset();
  produceVaultInstallation.resolve(installationP);

  const [auctionOldInstance, auctionNewInstance] = await Promise.all([
    auctioneerInstanceP,
    auctionUpgradeNewInstance,
  ]);
  auctionOldInstance !== auctionNewInstance ||
    Fail`Auction instance didn't change`;
  auctionUpgradeNewInstanceProducer.reset();
  const publicFacet = E(zoe).getPublicFacet(auctionNewInstance);
  /** @type {import('@agoric/inter-protocol/src/auction/scheduler.js').FullSchedule} */
  const schedules = await E(publicFacet).getSchedules();
  const now = await E(chainTimerService).getCurrentTimestamp();
  (schedules.nextAuctionSchedule &&
    TimeMath.compareAbs(schedules.nextAuctionSchedule.startTime, now) > 0) ||
    Fail`Expected next start time in the future ${schedules.nextAuctionSchedule?.startTime}`;

  const readCurrentDirectorParams = async () => {
    const { publicFacet: directorPF } = kit;

    await null;

    const subscription = E(directorPF).getElectorateSubscription();
    const notifier = makeNotifierFromAsyncIterable(subscription);
    let { value, updateCount } = await notifier.getUpdateSince(0n);
    // @ts-expect-error It's an amount.
    while (AmountMath.isEmpty(value.current.MinInitialDebt.value)) {
      ({ value, updateCount } = await notifier.getUpdateSince(updateCount));
      trace(
        `minInitialDebt was empty, retried`,
        value.current.MinInitialDebt.value,
      );
    }

    return harden({
      MinInitialDebt: value.current.MinInitialDebt.value,
      ReferencedUI: value.current.ReferencedUI.value,
      RecordingPeriod: value.current.RecordingPeriod.value,
      ChargingPeriod: value.current.ChargingPeriod.value,
    });
  };
  const directorParamOverrides = await readCurrentDirectorParams();

  const readManagerParams = async () => {
    const { publicFacet: directorPF } = kit;

    await null;

    const params = {};
    for (const kwd of Object.keys(vaultBrands)) {
      const collateralBrand = vaultBrands[kwd];
      const subscription = E(directorPF).getSubscription({
        collateralBrand,
      });
      const notifier = makeNotifierFromAsyncIterable(subscription);
      let { value, updateCount } = await notifier.getUpdateSince(0n);
      // @ts-expect-error It's an amount.
      if (AmountMath.isEmpty(value.current.DebtLimit.value)) {
        // The parameters might have been empty at start, and the notifier might
        // give the first state before the current state.
        trace(`debtLimit was empty, retrying`, value.current.DebtLimit.value);
        ({ value, updateCount } = await notifier.getUpdateSince(updateCount));

        // @ts-expect-error It's an amount.
        if (AmountMath.isEmpty(value.current.DebtLimit.value)) {
          trace('debtLimit was empty after retrying');
          throw Error('🚨Governed parameters empty after retry, Giving up');
        }
      }
      trace(kwd, 'params at', updateCount, 'are', value.current);
      params[kwd] = harden({
        brand: collateralBrand,
        debtLimit: value.current.DebtLimit.value,
        interestRate: value.current.InterestRate.value,
        liquidationMargin: value.current.LiquidationMargin.value,
        liquidationPadding: value.current.LiquidationPadding.value,
        liquidationPenalty: value.current.LiquidationPenalty.value,
        mintFee: value.current.MintFee.value,
      });
    }
    return params;
  };
  const managerParamValues = await readManagerParams();

  // upgrade the vaultFactory
  const upgradeVaultFactory = async () => {
    // @ts-expect-error cast XXX privateArgs missing from type
    const { privateArgs } = kit;

    const shortfallInvitation = await E(
      E.get(reserveKit).creatorFacet,
    ).makeShortfallReportingInvitation();

    const poserInvitation = await E(
      electorateCreatorFacet,
    ).getPoserInvitation();

    /** @type {import('../../src/vaultFactory/vaultFactory').VaultFactoryContract['privateArgs']} */
    const newPrivateArgs = harden({
      ...privateArgs,
      auctioneerInstance: auctionNewInstance,
      initialPoserInvitation: poserInvitation,
      initialShortfallInvitation: shortfallInvitation,
      managerParams: managerParamValues,
      directorParamOverrides,
    });

    const upgradeResult = await E(kit.adminFacet).upgradeContract(
      bundleID,
      newPrivateArgs,
    );

    trace('upgraded vaultFactory.', upgradeResult);
  };

  await upgradeVaultFactory();

  // @ts-expect-error It's saved in econ-behaviors.js:startVaultFactory()
  const vaultFactoryPrivateArgs = kit.privateArgs;
  console.log('UPGV upgraded vaults, restarting governor');

  const ecf = await electorateCreatorFacet;
  // restart vaultFactory governor
  await E(kit.governorAdminFacet).restartContract(
    harden({
      electorateCreatorFacet: ecf,
      governed: vaultFactoryPrivateArgs,
    }),
  );

  console.log('UPGV restarted governor');
};

const uV = 'upgradeVaults';
/**
 * Return the manifest, installations, and options for upgrading Vaults.
 *
 * @param {object} _ign
 * @param {any} vaultUpgradeOptions
 */
export const getManifestForUpgradeVaults = async (
  _ign,
  vaultUpgradeOptions,
) => ({
  manifest: {
    [upgradeVaults.name]: {
      consume: {
        auctionUpgradeNewInstance: uV,
        chainTimerService: uV,
        economicCommitteeCreatorFacet: uV,
        reserveKit: uV,
        vaultFactoryKit: uV,
        zoe: uV,
      },
      produce: { auctionUpgradeNewInstance: uV },
      installation: {
        produce: { VaultFactory: true },
      },
      instance: { consume: { auctioneer: true } },
    },
  },
  options: { ...vaultUpgradeOptions },
});
