/**
 * @file this core-eval proposal is a generic and reusable script for executing
 *   a Vault Factory upgrade. In contrast, upgrade-vaults.js is a specific
 *   implementation tailored to the upgrade-18.
 */

import { E } from '@endo/far';
import { makeTracer } from '@agoric/internal/src/index.js';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';

const trace = makeTracer('upgrade Vaults proposal');

export const upgradeVaultFactory = async (powers, options) => {
  trace('Initiate VaultFactory contract upgrade');

  const {
    consume: {
      zoe,
      vaultFactoryKit,
      reserveKit,
      auctioneerKit,
      economicCommitteeCreatorFacet,
    },
  } = powers;

  const {
    options: { contractRef },
  } = options;

  const { adminFacet, privateArgs, publicFacet, instance } =
    await vaultFactoryKit;

  const allBrands = await E(zoe).getBrands(instance);
  const { Minted: _istBrand, ...vaultBrands } = allBrands;

  const initialPoserInvitation = await E(
    economicCommitteeCreatorFacet,
  ).getPoserInvitation();

  const initialShortfallInvitation = await E(
    E.get(reserveKit).creatorFacet,
  ).makeShortfallReportingInvitation();

  const auctioneerInstance = await E.get(auctioneerKit).instance;

  const readCurrentDirectorParams = async () => {
    await null;

    const subscription = E(publicFacet).getElectorateSubscription();
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
    await null;

    const params = {};
    for (const kwd of Object.keys(vaultBrands)) {
      const collateralBrand = vaultBrands[kwd];

      /** @type {any} */
      const governedParams = await E(publicFacet).getGovernedParams({
        collateralBrand,
      });
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
  const managerParams = await readManagerParams();

  const newPrivateArgs = harden({
    ...privateArgs,
    auctioneerInstance,
    initialPoserInvitation,
    initialShortfallInvitation,
    managerParams,
    directorParamOverrides,
  });

  await E(adminFacet).upgradeContract(contractRef.bundleID, newPrivateArgs);

  trace('VaultFactory contract upgraded!');
};

export const getManifestForVaultFactoryUpgrade = (
  { restoreRef },
  { contractRef },
) => ({
  manifest: {
    [upgradeVaultFactory.name]: {
      consume: {
        zoe: true,
        vaultFactoryKit: true,
        reserveKit: true,
        auctioneerKit: true,
        economicCommitteeCreatorFacet: true,
      },
    },
  },
  installations: { vaultFactory: restoreRef(contractRef) },
  options: { contractRef },
});
