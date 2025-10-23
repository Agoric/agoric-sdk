// @jessie-check
// @ts-check

import { AmountMath, AssetKind } from '@agoric/ertp';
import { parseRatio } from '@agoric/ertp/src/ratio.js';
import { deeplyFulfilledObject } from '@agoric/internal';
import { Stable } from '@agoric/internal/src/tokens.js';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';

import {
  oracleBrandFeedName,
  reserveThenGetNames,
  scaledPriceFeedName,
} from './utils.js';

export * from './startPSM.js';

/**
 * @typedef {object} InterchainAssetOptions
 * @property {string} [issuerBoardId]
 * @property {string} [denom]
 * @property {number} [decimalPlaces]
 * @property {string} keyword - used in regstering with reserve, vaultFactory
 * @property {string} [issuerName] - used in agoricNames for compatibility:
 *   defaults to `keyword` if not provided
 * @property {string} [proposedName] - defaults to `issuerName` if not provided
 * @property {string} [oracleBrand] - defaults to `issuerName` if not provided
 * @property {number} [initialPrice]
 */

/** @import {EconomyBootstrapPowers} from './econ-behaviors.js' */

/**
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const publishInterchainAssetFromBoardId = async (
  { consume: { board, agoricNamesAdmin } },
  { options: { interchainAssetOptions } },
) => {
  const {
    issuerBoardId,
    keyword,
    issuerName = keyword,
  } = interchainAssetOptions;
  // Incompatible with denom.
  assert.equal(interchainAssetOptions.denom, undefined);
  assert.typeof(issuerBoardId, 'string');
  assert.typeof(issuerName, 'string');

  const issuer = /** @type {Issuer} */ (await E(board).getValue(issuerBoardId));
  const brand = await E(issuer).getBrand();

  return Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(issuerName, issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(issuerName, brand),
  ]);
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const publishInterchainAssetFromBank = async (
  {
    consume: { bankManager, agoricNamesAdmin, reserveKit, startUpgradable },
    installation: {
      consume: { mintHolder },
    },
  },
  { options: { interchainAssetOptions } },
) => {
  const {
    denom,
    decimalPlaces,
    keyword,
    issuerName = keyword,
    proposedName = keyword,
  } = interchainAssetOptions;

  // Incompatible with issuerBoardId.
  assert.equal(interchainAssetOptions.issuerBoardId, undefined);
  assert.typeof(denom, 'string');
  assert.typeof(decimalPlaces, 'number');
  assert.typeof(issuerName, 'string');
  assert.typeof(proposedName, 'string');

  const terms = {
    keyword: issuerName, // "keyword" is a misnomer in mintHolder terms
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces,
      assetKind: AssetKind.NAT,
    },
  };

  const { creatorFacet: mint, publicFacet: issuer } = await E(startUpgradable)({
    installation: mintHolder,
    label: issuerName,
    privateArgs: undefined,
    terms,
  });

  const brand = await E(issuer).getBrand();
  const kit = /** @type {IssuerKit<'nat'>} */ ({ mint, issuer, brand });

  await E(E.get(reserveKit).creatorFacet).addIssuer(issuer, keyword);

  await Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(issuerName, issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(issuerName, brand),
    E(bankManager).addAsset(denom, issuerName, proposedName, kit),
  ]);
};

/**
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const startScaledPriceAuthority = async (
  {
    consume: {
      agoricNamesAdmin,
      startUpgradable,
      priceAuthorityAdmin,
      priceAuthority,
    },
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

  // TODO get unit amounts elsewhere https://github.com/Agoric/agoric-sdk/issues/10235
  // We need "unit amounts" of each brand in order to get the ratios right.  You
  // can ignore unit amounts when adding and subtracting a brand with itself,
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

  await E(priceAuthorityAdmin).registerPriceAuthority(
    // @ts-expect-error The public facet should have getPriceAuthority
    E(spaKit.publicFacet).getPriceAuthority(),
    interchainBrand,
    stableBrand,
    true, // force
  );

  return spaKit;
};

/**
 * @param {BootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 */
export const registerScaledPriceAuthority = async (powers, { options }) => {
  const {
    instance: { produce: produceInstance },
  } = powers;

  const { keyword, issuerName = keyword } = options.interchainAssetOptions;

  const spaKit = await startScaledPriceAuthority(powers, { options });

  const label = scaledPriceFeedName(issuerName);

  // publish into agoricNames so that others can await its presence.
  // This must stay after registerPriceAuthority above so it's evidence of registration.
  // eslint-disable-next-line no-restricted-syntax -- computed property
  produceInstance[label].resolve(spaKit.instance);
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 * @param {bigint | number | string} config.options.debtLimitValue
 * @param {bigint} config.options.interestRateValue
 */
export const addAssetToVault = async (
  {
    consume: { vaultFactoryKit, agoricNamesAdmin },
    brand: {
      consume: { [Stable.symbol]: stableP },
    },
    instance: { consume: consumeInstance },
  },
  {
    options: {
      // Default to 1000 IST to simplify testing. A production proposal will set this.
      debtLimitValue = 1_000n * 1_000_000n,
      // Default to a safe value. Production will likely set this through governance.
      // Allow setting through bootstrap to simplify testing.
      interestRateValue = 1n,
      interchainAssetOptions,
    },
  },
) => {
  const {
    keyword,
    issuerName = keyword,
    oracleBrand = issuerName,
  } = interchainAssetOptions;
  assert.typeof(keyword, 'string');
  assert.typeof(issuerName, 'string');
  assert.typeof(oracleBrand, 'string');
  const [interchainIssuer] = await reserveThenGetNames(
    E(agoricNamesAdmin).lookupAdmin('issuer'),
    [issuerName],
  );

  // don't add the collateral offering to vaultFactory until its price feed is available
  // eslint-disable-next-line no-restricted-syntax -- allow this computed property
  await consumeInstance[oracleBrandFeedName(oracleBrand, 'USD')];
  // await also the negotiable brand
  // eslint-disable-next-line no-restricted-syntax -- allow this computed property
  await consumeInstance[scaledPriceFeedName(issuerName)];

  const stable = await stableP;
  const vaultFactoryCreator = E.get(vaultFactoryKit).creatorFacet;
  await E(vaultFactoryCreator).addVaultType(interchainIssuer, keyword, {
    debtLimit: AmountMath.make(stable, BigInt(debtLimitValue)),
    interestRate: makeRatio(interestRateValue, stable),
    // The rest of these we use safe defaults.
    // In production they will be governed by the Econ Committee.
    // Product deployments are also expected to have a low debtLimitValue at the outset,
    // limiting the impact of these defaults.
    liquidationPadding: makeRatio(25n, stable),
    liquidationMargin: makeRatio(150n, stable),
    mintFee: makeRatio(50n, stable, 10_000n),
    liquidationPenalty: makeRatio(1n, stable),
  });
};

export const getManifestForAddAssetToVault = (
  { restoreRef },
  {
    debtLimitValue,
    interestRateValue,
    interchainAssetOptions,
    scaledPriceAuthorityRef,
  },
) => {
  const publishIssuerFromBoardId =
    typeof interchainAssetOptions.issuerBoardId === 'string';
  const publishIssuerFromBank =
    !publishIssuerFromBoardId &&
    typeof interchainAssetOptions.denom === 'string';
  return {
    manifest: {
      ...(publishIssuerFromBoardId && {
        [publishInterchainAssetFromBoardId.name]: {
          consume: {
            board: true,
            agoricNamesAdmin: true,
          },
        },
      }),
      ...(publishIssuerFromBank && {
        [publishInterchainAssetFromBank.name]: {
          consume: {
            bankManager: true,
            agoricNamesAdmin: true,
            reserveKit: true,
            startUpgradable: true,
          },
          produce: { bankMints: true, vBankKits: true },
          installation: {
            consume: { mintHolder: true },
          },
        },
      }),
      [registerScaledPriceAuthority.name]: {
        consume: {
          agoricNamesAdmin: true,
          startUpgradable: true,
          priceAuthorityAdmin: true,
          priceAuthority: true,
        },
        instance: {
          produce: true,
        },
        installation: {
          consume: { scaledPriceAuthority: true },
        },
      },
      [addAssetToVault.name]: {
        consume: {
          vaultFactoryKit: 'vaultFactory',
          agoricNamesAdmin: true,
          chainTimerService: true,
        },
        brand: {
          consume: { [Stable.symbol]: true },
        },
        instance: {
          // allow any instance because the AGORIC_INSTANCE_NAME of
          // priceFeedOptions cannot be known statically.
          consume: true,
        },
      },
    },
    installations: {
      scaledPriceAuthority: restoreRef(scaledPriceAuthorityRef),
    },
    options: {
      debtLimitValue,
      interchainAssetOptions,
      interestRateValue,
    },
  };
};
