// @ts-check
import { AmountMath, AssetKind } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { Stable } from '@agoric/vats/src/tokens.js';
import { E } from '@endo/far';

import { reserveThenGetNames } from './utils.js';

export * from './startPSM.js';

/**
 * @typedef {object} InterchainAssetOptions
 * @property {string} [issuerBoardId]
 * @property {string} [denom]
 * @property {number} [decimalPlaces]
 * @property {string} [proposedName]
 * @property {string} keyword
 * @property {string} oracleBrand
 */

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const publishInterchainAssetFromBoardId = async (
  { consume: { board, agoricNamesAdmin } },
  { options: { interchainAssetOptions } },
) => {
  const { issuerBoardId, keyword } = interchainAssetOptions;
  // Incompatible with denom.
  assert.equal(interchainAssetOptions.denom, undefined);
  assert.typeof(issuerBoardId, 'string');
  assert.typeof(keyword, 'string');

  const issuer = await E(board).getValue(issuerBoardId);
  const brand = await E(issuer).getBrand();

  return Promise.all([
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, brand),
  ]);
};

const addPool = async (
  zoe,
  amm,
  issuer,
  keyword,
  brand,
  runBrand,
  runIssuer,
) => {
  const ammPub = E(zoe).getPublicFacet(amm);
  const [addPoolInvitation] = await Promise.all([
    E(ammPub).addPoolInvitation(),
    E(ammPub).addIssuer(issuer, keyword),
  ]);
  const proposal = harden({
    give: {
      Secondary: AmountMath.makeEmpty(brand),
      Central: AmountMath.makeEmpty(runBrand),
    },
  });
  const centralPurse = E(runIssuer).makeEmptyPurse();
  const secondaryPurse = E(issuer).makeEmptyPurse();
  const [emptyCentral, emptySecondary] = await Promise.all([
    E(centralPurse).withdraw(proposal.give.Central),
    E(secondaryPurse).withdraw(proposal.give.Secondary),
  ]);
  const payments = harden({
    Central: emptyCentral,
    Secondary: emptySecondary,
  });
  const addLiquiditySeat = await E(zoe).offer(
    addPoolInvitation,
    proposal,
    payments,
  );
  await E(addLiquiditySeat).getOfferResult();
};

/**
 * @param {EconomyBootstrapPowers} powers
 * @param {object} config
 * @param {object} config.options
 * @param {InterchainAssetOptions} config.options.interchainAssetOptions
 */
export const publishInterchainAssetFromBank = async (
  {
    consume: { zoe, bankManager, agoricNamesAdmin, bankMints },
    produce: { bankMints: produceBankMints },
    installation: {
      consume: { mintHolder },
    },
    instance: {
      consume: { amm },
    },
    issuer: {
      consume: { [Stable.symbol]: runIssuer },
    },
    brand: {
      consume: { [Stable.symbol]: runBrandP },
    },
  },
  { options: { interchainAssetOptions } },
) => {
  const { denom, decimalPlaces, proposedName, keyword } =
    interchainAssetOptions;

  // Incompatible with issuerBoardId.
  assert.equal(interchainAssetOptions.issuerBoardId, undefined);
  assert.typeof(denom, 'string');
  assert.typeof(keyword, 'string');
  assert.typeof(decimalPlaces, 'number');
  assert.typeof(proposedName, 'string');

  /** @type {import('@agoric/vats/src/mintHolder.js').AssetTerms} */
  const terms = {
    keyword,
    assetKind: AssetKind.NAT,
    displayInfo: {
      decimalPlaces,
      assetKind: AssetKind.NAT,
    },
  };
  const { creatorFacet: mint, publicFacet: issuer } = E.get(
    E(zoe).startInstance(mintHolder, {}, terms),
  );

  const [brand, runBrand] = await Promise.all([
    E(issuer).getBrand(),
    runBrandP,
  ]);
  const kit = { mint, issuer, brand };

  await addPool(zoe, amm, issuer, keyword, brand, runBrand, runIssuer);

  // Create the mint list if it doesn't exist and wasn't already rejected.
  produceBankMints.resolve([]);
  await Promise.all([
    Promise.resolve(bankMints).then(
      mints => mints.push(mint),
      () => {}, // If the bankMints list was rejected, ignore the error.
    ),
    E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, issuer),
    E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, brand),
    E(bankManager).addAsset(denom, keyword, proposedName, kit),
  ]);
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
    consume: { vaultFactoryCreator, agoricNamesAdmin },
    brand: {
      consume: { [Stable.symbol]: runP },
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
            zoe: true,
            bankManager: true,
            agoricNamesAdmin: true,
            bankMints: true,
          },
          produce: { bankMints: true },
          installation: {
            consume: { mintHolder: true },
          },
          instance: { consume: { amm: 'amm' } },
          issuer: { consume: { [Stable.symbol]: 'zoe' } },
          brand: { consume: { [Stable.symbol]: 'zoe' } },
        },
      }),
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
          ammCreatorFacet: true,
          reserveCreatorFacet: true,
          agoricNamesAdmin: true,
        },
        brand: {
          consume: { [Stable.symbol]: true },
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
