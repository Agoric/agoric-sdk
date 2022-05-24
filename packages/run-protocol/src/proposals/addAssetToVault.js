// @ts-check
import { AmountMath } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';

import { reserveThenGetNames } from './utils.js';

export * from './startPSM.js';

/**
 * @typedef {object} InterchainAssetOptions
 * @property {string} issuerBoardId
 * @property {string} keyword
 * @property {string} proposedName
 * @property {number} decimalPlaces
 * @property {string} oracleBrand
 */

/**
 * @param { EconomyBootstrapPowers } powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const addInterchainAsset = async (
  { consume: { board, agoricNamesAdmin } },
  { options: { interchainAssetOptions } },
) => {
  const { issuerBoardId, keyword, decimalPlaces, proposedName } =
    interchainAssetOptions;
  assert.typeof(issuerBoardId, 'string');
  assert.typeof(keyword, 'string');
  assert.typeof(decimalPlaces, 'number');
  assert.typeof(proposedName, 'string');

  const issuer = await E(board).getValue(issuerBoardId);
  const brand = await E(issuer).getBrand();

  E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, issuer);
  E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, brand);
};

/**
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const registerScaledPriceAuthority = async (
  { consume: { agoricNamesAdmin, zoe, priceAuthorityAdmin, priceAuthority } },
  { options: { interchainAssetOptions } },
) => {
  const { keyword, oracleBrand } = interchainAssetOptions;
  assert.typeof(keyword, 'string');
  assert.typeof(oracleBrand, 'string');

  const [
    sourcePriceAuthority,
    [interchainBrand, runBrand],
    [interchainOracleBrand, usdBrand],
    [scaledPriceAuthority],
  ] = await Promise.all([
    priceAuthority,
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('brand'), [
      keyword,
      'RUN',
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
    getDecimalP(runBrand),
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
    runBrand,
  );
  const terms = { sourcePriceAuthority, scaleIn, scaleOut };
  const { publicFacet } = E.get(
    E(zoe).startInstance(scaledPriceAuthority, undefined, terms),
  );
  await E(priceAuthorityAdmin).registerPriceAuthority(
    E(publicFacet).getPriceAuthority(),
    interchainBrand,
    runBrand,
    true, // force
  );
};

/** @typedef {import('./econ-behaviors.js').EconomyBootstrapPowers} EconomyBootstrapPowers */

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const addAssetToVault = async (
  {
    consume: { vaultFactoryCreator, reserveCreatorFacet, agoricNamesAdmin },
    brand: {
      consume: { RUN: runP },
    },
  },
  { options: { interchainAssetOptions } },
) => {
  const { keyword, oracleBrand } = interchainAssetOptions;
  assert.typeof(keyword, 'string');
  assert.typeof(oracleBrand, 'string');
  const [interchainIssuer] = await reserveThenGetNames(
    E(agoricNamesAdmin).lookupAdmin('issuer'),
    [keyword],
  );

  await E(reserveCreatorFacet).addIssuer(interchainIssuer, keyword);

  const RUN = await runP;
  await E(vaultFactoryCreator).addVaultType(interchainIssuer, oracleBrand, {
    debtLimit: AmountMath.make(RUN, 0n),
    // the rest of these are arbitrary, TBD by gov cttee
    interestRate: makeRatio(1n, RUN),
    liquidationMargin: makeRatio(1n, RUN),
    liquidationPenalty: makeRatio(1n, RUN),
    loanFee: makeRatio(1n, RUN),
  });
};

export const getManifestForAddAssetToVault = (
  { restoreRef },
  { interchainAssetOptions, scaledPriceAuthorityRef },
) => {
  return {
    manifest: {
      [addInterchainAsset.name]: {
        consume: {
          board: true,
          zoe: true,
          bankManager: true,
          agoricNamesAdmin: true,
        },
      },
      [registerScaledPriceAuthority.name]: {
        consume: {
          agoricNamesAdmin: true,
          zoe: true,
          priceAuthorityAdmin: true,
          priceAuthority: true,
        },
        installation: {
          consume: { scaledPriceAuthority: true },
        },
      },
      [addAssetToVault.name]: {
        consume: {
          vaultFactoryCreator: true,
          reserveCreatorFacet: true,
          agoricNamesAdmin: true,
        },
        brand: {
          consume: { RUN: true },
        },
      },
    },
    installations: {
      scaledPriceAuthority: restoreRef(scaledPriceAuthorityRef),
    },
    options: {
      interchainAssetOptions,
    },
  };
};
