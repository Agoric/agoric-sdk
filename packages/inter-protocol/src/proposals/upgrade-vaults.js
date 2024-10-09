import { E } from '@endo/far';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { makeTracer } from '@agoric/internal/src/index.js';
import { Fail } from '@endo/errors';
import { TimeMath } from '@agoric/time';

const trace = makeTracer('upgrade Vaults proposal');

/**
 * @typedef {PromiseSpaceOf<{
 *   priceAuthority8400: Instance;
 *   auctionUpgradeNewInstance: Instance;
 * }>} interlockPowers
 */

/**
 * @param {import('../../src/proposals/econ-behaviors').EconomyBootstrapPowers &
 *     interlockPowers} powers
 * @param {{
 *   options: {
 *     VaultFactoryBundle: { bundleID: string };
 *     contractGovernorBundle: { bundleID: string };
 *   };
 * }} options
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
      priceAuthority8400,
    },
    produce: { auctionUpgradeNewInstance: auctionUpgradeNewInstanceProducer },
    instance: {
      consume: { auctioneer: auctioneerInstanceP },
    },
  },
  { options: { VaultFactoryBundle: vaultBundleRef, contractGovernorBundle } },
) => {
  const kit = await vaultFactoryKit;
  const { instance: directorInstance } = kit;
  const allBrands = await E(zoe).getBrands(directorInstance);
  const { Minted: _istBrand, ...vaultBrands } = allBrands;

  await priceAuthority8400;

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
    const { updateCount } = await notifier.getUpdateSince();

    // subscribeAfter(<some known state>) retrieves the latest value.
    const after = await E(subscription).subscribeAfter(updateCount);
    const { current } = after.head.value;

    return harden({
      MinInitialDebt: current.MinInitialDebt.value,
      ReferencedUI: current.ReferencedUI.value,
      RecordingPeriod: current.RecordingPeriod.value,
      ChargingPeriod: current.ChargingPeriod.value,
    });
  };
  const directorParamOverrides = await readCurrentDirectorParams();
  trace({ directorParamOverrides });

  const readManagerParams = async () => {
    const { publicFacet: directorPF } = kit;

    await null;

    const params = {};
    for (const kwd of Object.keys(vaultBrands)) {
      const collateralBrand = vaultBrands[kwd];

      /** @type {any} */
      const governedParams = await E(directorPF).getGovernedParams({
        collateralBrand,
      });
      trace({ kwd, governedParams });
      params[kwd] = harden({
        brand: collateralBrand,
        debtLimit: governedParams.DebtLimit.value,
        interestRate: governedParams.InterestRate.value,
        liquidationMargin: governedParams.LiquidationMargin.value,
        liquidationPadding: governedParams.LiquidationPadding.value,
        liquidationPenalty: governedParams.LiquidationPenalty.value,
        mintFee: governedParams.MintFee.value,
      });
      trace(kwd, params[kwd]);
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
      vaultBundleRef.bundleID,
      newPrivateArgs,
    );

    trace('upgraded vaultFactory.', upgradeResult);
  };
  await upgradeVaultFactory();

  // @ts-expect-error It's saved in econ-behaviors.js:startVaultFactory()
  const vaultFactoryPrivateArgs = kit.privateArgs;
  trace('restarting governor');

  const ecf = await electorateCreatorFacet;
  // upgrade vaultFactory governor. Won't be needed next time: see #10063
  await E(kit.governorAdminFacet).upgradeContract(
    contractGovernorBundle.bundleID,
    harden({
      electorateCreatorFacet: ecf,
      governed: vaultFactoryPrivateArgs,
    }),
  );

  trace('restarted governor');
};

const uV = 'upgradeVaults';
/**
 * Return the manifest, installations, and options for upgrading Vaults.
 *
 * @param {object} utils
 * @param {any} utils.restoreRef
 * @param {any} vaultUpgradeOptions
 */
export const getManifestForUpgradeVaults = async (
  { restoreRef },
  { VaultFactoryRef, contractGovernorRef },
) => {
  return {
    manifest: {
      [upgradeVaults.name]: {
        consume: {
          priceAuthority8400: uV,
          auctionUpgradeNewInstance: uV,
          chainTimerService: uV,
          economicCommitteeCreatorFacet: uV,
          reserveKit: uV,
          vaultFactoryKit: uV,
          zoe: uV,
        },
        produce: { auctionUpgradeNewInstance: uV },
        instance: { consume: { auctioneer: uV } },
      },
    },
    installations: {
      VaultFactory: restoreRef(VaultFactoryRef),
      contractGovernor: restoreRef(contractGovernorRef),
    },
    options: {
      VaultFactoryBundle: VaultFactoryRef,
      contractGovernorBundle: contractGovernorRef,
    },
  };
};
