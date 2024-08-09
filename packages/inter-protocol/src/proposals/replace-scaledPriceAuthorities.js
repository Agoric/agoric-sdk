import { makeTracer } from '@agoric/internal';
import { E } from '@endo/far';
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
    consume: {
      agoricNamesAdmin,
      contractKits: contractKitsP,
      priceAuthority,
      zoe,
    },
  } = powers;

  const { scaledPARef } = options;
  await null;

  const bundleID = scaledPARef.bundleID;
  if (scaledPARef && bundleID) {
    await E.when(
      E(zoe).installBundleID(bundleID),
      installation =>
        E(E(agoricNamesAdmin).lookupAdmin('installation')).update(
          'scaledPriceAuthority',
          installation,
        ),
      err =>
        console.error(
          `🚨 failed to update scaledPriceAuthority installation`,
          err,
        ),
    );
    trace('installed scaledPriceAuthority bundle', bundleID);
  }

  const contractKits = await contractKitsP;
  /** @type {StartedInstanceKit<any>[]} */
  const scaledPAKitEntries = Array.from(contractKits.values()).filter(
    kit => kit.label && kit.label.match(/scaledPriceAuthority/),
  );

  const pa = await priceAuthority;
  trace('priceAuthority', pa);

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
