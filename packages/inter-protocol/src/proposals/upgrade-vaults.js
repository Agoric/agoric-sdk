import { makeTracer } from '@agoric/internal';
import {
  makeNotifierFromAsyncIterable,
  makeNotifierFromSubscriber,
} from '@agoric/notifier';
import { E } from '@endo/far';

const trace = makeTracer('UpgradeVaults');

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
  const kit = await vaultFactoryKit;
  const { instance: directorInstance } = kit;
  const allBrands = await E(zoe).getBrands(directorInstance);
  const { Minted: istBrand, ...vaultBrands } = allBrands;

  await null;

  const readManagerParams = async () => {
    const { publicFacet: directorPF } = kit;

    await null;

    const params = {};
    for (const kwd of Object.keys(vaultBrands)) {
      const collateralBrand = vaultBrands[kwd];
      const subscription = E(directorPF).getSubscription({
        collateralBrand,
      });
      const after = await E(subscription).subscribeAfter();
      let { current } = after.head.value;
      trace('readManagerParams', kwd, 'after', after.publishCount);
      // XXX to work around ATOM's first debt limit of 0, subsequent valid.
      // but I don't know how to confirm the most recent value
      if (current.DebtLimit.value.value === 0n) {
        trace(
          'readManagerParams',
          kwd,
          'DebtLimit zero, reading from susbscription again',
        );
        current = (await E(subscription).subscribeAfter()).head.value.current;
      }

      trace('readManagerParams', kwd, 'subscription', current);
      params[kwd] = harden({
        brand: collateralBrand,
        debtLimit: current.DebtLimit.value,
        interestRate: current.InterestRate.value,
        liquidationMargin: current.LiquidationMargin.value,
        liquidationPadding: current.LiquidationPadding.value,
        liquidationPenalty: current.LiquidationPenalty.value,
        mintFee: current.MintFee.value,
      });
    }
    return params;
  };
  const managerParamValues = await readManagerParams();

  trace(managerParamValues);

  assert(managerParamValues.ATOM.debtLimit.value > 0, 'debt limit must be > 0');
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
