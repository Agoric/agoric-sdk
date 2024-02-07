import { E } from '@endo/far';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp/src/index.js';

/**
 * @param {import('../../src/proposals/econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { vaultsRef: { bundleID: string } } }} options
 */
export const upgradeVaults = async (powers, { options }) => {
  const {
    consume: {
      agoricNamesAdmin,
      auctioneerKit: auctioneerKitP,
      priceAuthority,
      vaultFactoryKit,
      zoe,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveKit,
    },
  } = powers;
  const { vaultsRef } = options;
  const kit = await vaultFactoryKit;
  const auctioneerKit = await auctioneerKitP;
  const { instance: directorInstance } = kit;
  const allBrands = await E(zoe).getBrands(directorInstance);
  const { Minted: istBrand, ...vaultBrands } = allBrands;

  const bundleID = vaultsRef.bundleID;
  console.log(`upgradeVaults: bundleId`, bundleID);
  let installationP;
  await null;
  if (vaultsRef) {
    if (bundleID) {
      installationP = E(zoe).installBundleID(bundleID);
      await E.when(
        installationP,
        installation =>
          E(E(agoricNamesAdmin).lookupAdmin('installation')).update(
            // TODO(cth)  fix!
            'aultFact',
            installation,
          ),
        err =>
          console.error(`🚨 failed to update vaultFactory installation`, err),
      );
    }
  }

  const readManagerParams = async () => {
    const { publicFacet: directorPF } = kit;

    await null;

    const params = {};
    for (const kwd of Object.keys(vaultBrands)) {
      const b = vaultBrands[kwd];
      const subscription = E(directorPF).getSubscription({
        collateralBrand: b,
      });
      const notifier = makeNotifierFromAsyncIterable(subscription);
      const { value } = await notifier.getUpdateSince();
      const rec = {};
      for (const k of Object.keys(value.current)) {
        rec[k] = value.current[k].value;
      }
      params[kwd] = rec;
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
      auctioneerInstance: auctioneerKit.instance,
      initialPoserInvitation: poserInvitation,
      initialShortfallInvitation: shortfallInvitation,
      managerParams: managerParamValues,
    });

    const upgradeResult = await E(kit.adminFacet).upgradeContract(
      bundleID,
      newPrivateArgs,
    );

    console.log('upgraded vaultFactory.', upgradeResult);
  };

  await upgradeVaultFactory();

  console.log(`upgradeVaults: done`);
};

const t = 'upgradeVaults';
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
        agoricNamesAdmin: t,
        auctioneerKit: t,
        economicCommitteeCreatorFacet: t,
        priceAuthority: t,
        reserveKit: t,
        vaultFactoryKit: t,
        board: t,
        zoe: t,
      },
    },
  },
  options: { ...vaultUpgradeOptions },
});
