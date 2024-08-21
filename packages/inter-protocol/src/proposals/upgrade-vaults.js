import { E } from '@endo/far';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp/src/index.js';
import { makeTracer } from '@agoric/internal/src/index.js';

const trace = makeTracer('upgrade Vaults proposal');

/**
 * @typedef {PromiseSpaceOf<{
 *   auctionsUpgradeComplete: boolean;
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
      vaultFactoryKit,
      zoe,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveKit,
      auctionsUpgradeComplete,
    },
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

  await auctionsUpgradeComplete;
  auctionsUpgradeCompleteProducer.reset();

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

    const [poserInvitation, auctioneerInstance] = await Promise.all([
      E(electorateCreatorFacet).getPoserInvitation(),
      auctioneerInstanceP,
    ]);

    /** @type {import('../../src/vaultFactory/vaultFactory').VaultFactoryContract['privateArgs']} */
    const newPrivateArgs = harden({
      ...privateArgs,
      auctioneerInstance,
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
        economicCommitteeCreatorFacet: uV,
        reserveKit: uV,
        vaultFactoryKit: uV,
        zoe: uV,
        auctionsUpgradeComplete: uV,
      },
      produce: { auctionsUpgradeComplete: uV },
      installation: {
        produce: { VaultFactory: true },
      },
      instance: { consume: { auctioneer: uV } },
    },
  },
  options: { ...vaultUpgradeOptions },
});
