import { makeTracer, deeplyFulfilledObject } from '@agoric/internal';
import { E } from '@endo/far';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { parseRatio } from '@agoric/zoe/src/contractSupport/ratio.js';

import { reserveThenGetNames, scaledPriceFeedName } from './utils.js';

const trace = makeTracer('replaceScaledPA', true);

/**
 * Copied with minor modification from addAssetToVault.js because a previous
 * scaledPriceAuthority is being replaced.
 *
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {import('./addAssetToVault.js').InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const replaceScaledPriceAuthority = async (
  {
    consume: {
      agoricNamesAdmin,
      startUpgradable,
      priceAuthorityAdmin,
      priceAuthority,
    },
    instance: { produce: produceInstance },
  },
  { options: { interchainAssetOptions } },
) => {
  const {
    keyword,
    issuerName = keyword,
    oracleBrand = issuerName,
    initialPrice: initialPriceRaw,
  } = interchainAssetOptions;
  assert.typeof(issuerName, 'string');
  assert.typeof(oracleBrand, 'string');

  const [
    sourcePriceAuthority,
    [interchainBrand, stableBrand],
    [interchainOracleBrand, usdBrand],
    [scaledPriceAuthority],
  ] = await Promise.all([
    priceAuthority,
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('brand'), [
      issuerName,
      'IST',
    ]),
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('oracleBrand'), [
      oracleBrand,
      'USD',
    ]),
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('installation'), [
      'scaledPriceAuthority',
    ]),
  ]);

  // We need "unit amounts" of each brand in order to get the ratios right.  You
  // can ignore decimalPlaces when adding and subtracting a brand with itself,
  // but not when creating ratios.
  const getDecimalP = async brand => {
    const displayInfo = E(brand).getDisplayInfo();
    return E.get(displayInfo).decimalPlaces;
  };
  const [
    decimalPlacesInterchainOracle = 0,
    decimalPlacesInterchain = 0,
    decimalPlacesUsd = 0,
    decimalPlacesRun = 0,
  ] = await Promise.all([
    getDecimalP(interchainOracleBrand),
    getDecimalP(interchainBrand),
    getDecimalP(usdBrand),
    getDecimalP(stableBrand),
  ]);

  const scaleIn = makeRatio(
    10n ** BigInt(decimalPlacesInterchainOracle),
    interchainOracleBrand,
    10n ** BigInt(decimalPlacesInterchain),
    interchainBrand,
  );
  const scaleOut = makeRatio(
    10n ** BigInt(decimalPlacesUsd),
    usdBrand,
    10n ** BigInt(decimalPlacesRun),
    stableBrand,
  );
  const initialPrice = initialPriceRaw
    ? parseRatio(initialPriceRaw, stableBrand, interchainBrand)
    : undefined;

  const terms = await deeplyFulfilledObject(
    harden({
      sourcePriceAuthority,
      scaleIn,
      scaleOut,
      initialPrice,
    }),
  );

  const label = scaledPriceFeedName(issuerName);

  const spaKit = await E(startUpgradable)({
    installation: scaledPriceAuthority,
    label,
    terms,
  });

  // @ts-expect-error The public facet should have getPriceAuthority
  const pa = await E(spaKit.publicFacet).getPriceAuthority();
  trace(pa);

  await E(priceAuthorityAdmin).registerPriceAuthority(
    pa,
    interchainBrand,
    stableBrand,
    true, // force
  );

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
      instancePrivateArgs: instancePrivateArgsP,
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

  const [contractKits] = await Promise.all([
    contractKitsP,
    instancePrivateArgsP,
  ]);
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
        instancePrivateArgs: t,
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
