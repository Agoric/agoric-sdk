import { E } from '@endo/far';
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { AmountMath } from '@agoric/ertp/src/index.js';
import { makeScalarMapStore } from '@agoric/store/src/index.js';

// // stand-in for Promise.any which isn't available to this version.
// // Not in use yet, because it seemed to cause a crash (?)
// const any = promises =>
//   new Promise((resolve, reject) => {
//     for (const promise of promises) {
//       promise.then(resolve);
//     }
//     Promise.allSettled(promises).then(results => {
//       const rejects = results.filter(({ status }) => status === 'rejected');
//       if (rejects.length === results.length) {
//         const messages = rejects.map(({ message }) => message);
//         const aggregate = new Error(messages.join(';'));
//         aggregate.errors = rejects.map(({ reason }) => reason);
//         reject(aggregate);
//       }
//     });
//   });

/**
 * @param {import('../../src/proposals/econ-behaviors').EconomyBootstrapPowers} powers
 * @param {{ options: { vaultsRef: { bundleID: string } } }} options
 */
export const upgradeVaults = async (powers, { options }) => {
  const {
    consume: {
      agoricNamesAdmin,
      newAuctioneerKit: auctioneerKitP,
      priceAuthority,
      vaultFactoryKit,
      zoe,
      economicCommitteeCreatorFacet: electorateCreatorFacet,
      reserveKit,
    },
    produce: { auctioneerKit: auctioneerKitProducer },
    instance: {
      produce: { auctioneer: auctioneerProducer },
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

    const params = makeScalarMapStore('brand');
    for (const kwd of Object.keys(vaultBrands)) {
      const b = vaultBrands[kwd];
      const subscription = E(directorPF).getSubscription({
        collateralBrand: b,
      });
      const notifier = makeNotifierFromAsyncIterable(subscription);
      const { value } = await notifier.getUpdateSince();
      params.init(
        b,
        harden({
          debtLimit: value.current.DebtLimit.value,
          interestRate: value.current.InterestRate.value,
          liquidationMargin: value.current.LiquidationMargin.value,
          liquidationPadding: value.current.LiquidationPadding.value,
          liquidationPenalty: value.current.LiquidationPenalty.value,
          mintFee: value.current.MintFee.value,
        }),
      );
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

  // Wait for at least one new price feed to be ready before upgrading Vaults
  void E.when(
    // XXX  use any(). We're not expecting failures, but if they happened we'd
    // prefer to ignore them. Promise.any() isn't available yet, so we use
    // race(), which isn't quite right, but it isn't expected to matter.
    Promise.race(
      Object.values(vaultBrands).map(brand =>
        E(priceAuthority).quoteGiven(AmountMath.make(brand, 10n), istBrand),
      ),
    ),
    async () => {
      await upgradeVaultFactory();
      auctioneerKitProducer.reset();
      auctioneerKitProducer.resolve(auctioneerKit);
      auctioneerProducer.reset();
      auctioneerProducer.resolve(auctioneerKit.instance);
    },
  );

  console.log(`upgradeVaults scheduled; waiting for priceFeeds`);
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
        newAuctioneerKit: t,
        economicCommitteeCreatorFacet: t,
        priceAuthority: t,
        reserveKit: t,
        vaultFactoryKit: t,
        board: t,
        zoe: t,
      },
      produce: { auctioneerKit: t },
      instance: { produce: { auctioneer: t } },
    },
  },
  options: { ...vaultUpgradeOptions },
});
