/**
 * @file this core-eval proposal is specific to the upgrade-18 scenario,
 *   handling tasks beyond generic Vault Factory null upgrade. For a reusable
 *   proposal, see upgrade-vaultFactory-proposal.js.
 */

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
 *   newContractGovBundleId: string;
 * }>} interlockPowers
 */

/**
 * @param {import('../../src/proposals/econ-behaviors').EconomyBootstrapPowers &
 *     interlockPowers} powers
 * @param {{
 *   options: {
 *     VaultFactoryBundle: { bundleID: string };
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
      newContractGovBundleId: newContractGovBundleIdP,
    },
    produce: {
      auctionUpgradeNewInstance: auctionUpgradeNewInstanceProducer,
      newContractGovBundleId: newContractGovBundleIdErasor,
    },
  },
  { options: { VaultFactoryBundle: vaultBundleRef } },
) => {
  const kit = await vaultFactoryKit;
  const { instance: directorInstance } = kit;
  const allBrands = await E(zoe).getBrands(directorInstance);
  const { Minted: _istBrand, ...vaultBrands } = allBrands;

  await priceAuthority8400;

  /** @type {Instance<import('../auction/auctioneer.js').start>} */
  const auctionNewInstance = await auctionUpgradeNewInstance;
  auctionUpgradeNewInstanceProducer.reset();
  const publicFacet = E(zoe).getPublicFacet(auctionNewInstance);
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

  const [ecf, newContractGovBundleId] = await Promise.all([
    electorateCreatorFacet,
    newContractGovBundleIdP,
  ]);
  newContractGovBundleIdErasor.reset();

  // upgrade vaultFactory governor. Won't be needed next time: see #10063
  await E(kit.governorAdminFacet).upgradeContract(
    newContractGovBundleId,
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
  { VaultFactoryRef },
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
          newContractGovBundleId: uV,
        },
        produce: {
          auctionUpgradeNewInstance: uV,
          newContractGovBundleId: uV,
        },
      },
    },
    installations: { VaultFactory: restoreRef(VaultFactoryRef) },
    options: { VaultFactoryBundle: VaultFactoryRef },
  };
};
