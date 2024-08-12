import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
import { deeplyFulfilled } from '@endo/marshal';

import { startScaledPriceAuthority } from './addAssetToVault.js';
import { scaledPriceFeedName } from './utils.js';

const trace = makeTracer('replaceScaledPA', true);

/**
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 */
export const replaceScaledPriceAuthority = async (powers, { options }) => {
  const {
    instance: { produce: produceInstance },
  } = powers;
  const { keyword, issuerName = keyword } = options.interchainAssetOptions;

  const spaKit = await startScaledPriceAuthority(powers, { options });

  const label = scaledPriceFeedName(issuerName);
  produceInstance[label].reset();

  // publish into agoricNames so that others can await its presence.
  // This must stay after registerPriceAuthority above so it's evidence of registration.
  produceInstance[label].resolve(spaKit.instance);
};

/**
 * Look up the existing assets known to auctions, and replace the corresponding
 * scaledPriceAuthorities. The existing contracts will be left behind to be
 * cleaned up later.
 *
 * @param {ChainBootstrapSpace & BootstrapPowers} powers
 * @param {{ options: { scaledPARef: { bundleID: string } } }} options
 */
export const replaceScaledPriceAuthorities = async (powers, { options }) => {
  trace('start');
  const {
    consume: { agoricNamesAdmin, contractKits: contractKitsP, zoe },
  } = powers;

  const { scaledPARef } = options;

  const installationsAdmin = E(agoricNamesAdmin).lookupAdmin('installation');
  const [spaInstallation, contractKits] = await Promise.all([
    E(E(installationsAdmin).readonly()).lookup('scaledPriceAuthority'),
    contractKitsP,
  ]);

  const bundleID = scaledPARef.bundleID;
  if (scaledPARef && bundleID) {
    await E.when(
      E(zoe).installBundleID(bundleID),
      installation =>
        E(installationsAdmin).update('scaledPriceAuthority', installation),
      err =>
        console.error(
          `🚨 failed to update scaledPriceAuthority installation`,
          err,
        ),
    );
    trace('installed scaledPriceAuthority bundle', bundleID);
  }

  // Ask Zoe for the installation for each kit's instance, and return all the
  // kits where that matches the given installation.
  async function selectKitsWithInstallation(kits) {
    /** @type {StartedInstanceKit<any>[]} */
    const scaledPAKitMapP = Array.from(kits.values()).map(kit => [
      kit,
      E(zoe).getInstallationForInstance(kit.instance),
    ]);
    const scaledPAKitMap = await deeplyFulfilled(harden(scaledPAKitMapP));
    const scaledPAKitEntries = [];
    for (const [instance, installation] of scaledPAKitMap) {
      if (spaInstallation === installation) {
        scaledPAKitEntries.push(instance);
      }
    }
    return scaledPAKitEntries;
  }
  const scaledPAKitEntries = await selectKitsWithInstallation(contractKits);

  for (const kitEntry of scaledPAKitEntries) {
    trace({ kitEntry });

    const keyword = kitEntry.label.match(/scaledPriceAuthority-(.*)/)[1];
    const interchainAssetOptions = { keyword };
    await replaceScaledPriceAuthority(powers, {
      options: { interchainAssetOptions },
    });
  }
};

const t = 'replaceScaledPriceAuthority';
export const getManifestForReplaceScaledPriceAuthorities = async (
  _ign,
  upgradeSPAOptions,
) => ({
  manifest: {
    [replaceScaledPriceAuthorities.name]: {
      consume: {
        agoricNamesAdmin: t,
        contractKits: t,
        priceAuthority: t,
        priceAuthorityAdmin: t,
        zoe: t,
        startUpgradable: t,
      },
      instance: {
        produce: t,
      },
    },
  },
  options: { ...upgradeSPAOptions },
});
