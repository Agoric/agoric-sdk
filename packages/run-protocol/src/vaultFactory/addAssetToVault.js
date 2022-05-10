// @ts-check
import { AmountMath, AssetKind } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';
import { Stable } from '@agoric/vats/src/tokens.js';

const IbcAsset = /** @type {const} */ ({
  keyword: 'IbcATOM',
  proposedName: 'ATOM',
});

const reserveThenGetNames = async (nameAdmin, names) => {
  for (const name of names) {
    E(nameAdmin).reserve(name);
  }
  const nameHub = E(nameAdmin).readonly();
  return Promise.all(names.map(name => E(nameHub).lookup(name)));
};

/**
 * @param { EconomyBootstrapPowers } powers
 * @param {*} config
 */
export const addInterchainAsset = async (
  {
    consume: { zoe, bankManager, agoricNamesAdmin, interchainMints },
    produce: { interchainMints: produceInterchainMints },
    installation: {
      consume: { mintHolder },
    },
  },
  {
    options: {
      denom,
      keyword = IbcAsset.keyword,
      proposedName = IbcAsset.proposedName,
      decimalPlaces = 4,
    },
  },
) => {
  /** @type {import('@agoric/vats/src/mintHolder.js').AssetTerms} */
  const terms = {
    keyword,
    assetKind: AssetKind.NAT,
    displayInfo: { decimalPlaces, assetKind: AssetKind.NAT },
  };
  const { creatorFacet: mint, publicFacet: issuer } = E.get(
    E(zoe).startInstance(mintHolder, {}, terms),
  );

  const brand = await E(issuer).getBrand();
  const kit = { mint, issuer, brand };

  // Create the mint list if it doesn't exist and wasn't already rejected.
  produceInterchainMints.resolve([]);
  Promise.resolve(interchainMints).then(
    mints => mints.push(mint),
    () => {}, // If the interchainMints list was rejected, ignore the error.
  );

  E(E(agoricNamesAdmin).lookupAdmin('issuer')).update(keyword, issuer);
  E(E(agoricNamesAdmin).lookupAdmin('brand')).update(keyword, brand);

  return E(bankManager).addAsset(
    denom,
    keyword,
    proposedName,
    kit, // with mint
  );
};

/** @param {BootstrapPowers} powers */
export const registerScaledPriceAuthority = async ({
  consume: { agoricNamesAdmin, zoe, priceAuthorityAdmin, priceAuthority },
}) => {
  const [
    sourcePriceAuthority,
    [ibcAtomBrand, istBrand],
    [usdBrand, atomBrand],
    [scaledPriceAuthority],
  ] = await Promise.all([
    priceAuthority,
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('brand'), [
      IbcAsset.keyword,
      Stable.symbol,
    ]),
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('oracleBrand'), [
      'USD',
      'ATOM',
    ]),
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('installation'), [
      'scaledPriceAuthority',
    ]),
  ]);

  // we used 4 decimals for ibcAtom above...
  // 1_000_000 atomBrand = 10_000 ibcAtomBrand
  const scaleIn = makeRatio(100n, atomBrand, 1n, ibcAtomBrand);
  const scaleOut = makeRatio(1n, usdBrand, 1n, istBrand);
  const terms = { sourcePriceAuthority, scaleIn, scaleOut };
  const { publicFacet } = E.get(
    E(zoe).startInstance(scaledPriceAuthority, undefined, terms),
  );
  await E(priceAuthorityAdmin).registerPriceAuthority(
    E(publicFacet).getPriceAuthority(),
    ibcAtomBrand,
    istBrand,
    true, // force
  );
};

/** @typedef {import('../econ-behaviors.js').EconomyBootstrapPowers} EconomyBootstrapPowers */

/** @param {EconomyBootstrapPowers} powers */
export const addAssetToVault = async ({
  consume: { vaultFactoryCreator, reserveCreatorFacet, agoricNamesAdmin, zoe },
  brand: {
    consume: { [Stable.symbol]: istP },
  },
  instance: {
    consume: { amm },
  },
}) => {
  const { keyword } = IbcAsset;
  const [ibcAtomIssuer] = await reserveThenGetNames(
    E(agoricNamesAdmin).lookupAdmin('issuer'),
    [keyword, Stable.symbol],
  );

  /** @type {ERef<XYKAMMPublicFacet>} */
  const ammPub = E(zoe).getPublicFacet(amm);
  await E(ammPub).addPool(ibcAtomIssuer, keyword);
  await E(reserveCreatorFacet).addIssuer(ibcAtomIssuer, keyword);

  const IST = await istP;
  await E(vaultFactoryCreator).addVaultType(ibcAtomIssuer, 'ATOM', {
    debtLimit: AmountMath.make(IST, 0n),
    // the rest of these are arbitrary, TBD by gov cttee
    interestRate: makeRatio(1n, IST),
    liquidationMargin: makeRatio(1n, IST),
    liquidationPenalty: makeRatio(1n, IST),
    loanFee: makeRatio(1n, IST),
  });
};

export const getManifestForAddAssetToVault = (
  { restoreRef },
  { denom, scaledPriceAuthorityRef },
) => {
  return {
    manifest: {
      addInterchainAsset: {
        consume: {
          zoe: true,
          bankManager: true,
          agoricNamesAdmin: true,
          interchainMints: true,
        },
        produce: { interchainMints: true },
        installation: { consume: { mintHolder: true } },
      },
      registerScaledPriceAuthority: {
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
      addAssetToVault: {
        consume: {
          vaultFactoryCreator: true,
          reserveCreatorFacet: true,
          agoricNamesAdmin: true,
          zoe: true,
        },
        brand: {
          consume: { [Stable.symbol]: true },
        },
        instance: {
          consume: { amm: true },
        },
      },
    },
    installations: {
      scaledPriceAuthority: restoreRef(scaledPriceAuthorityRef),
    },
    options: {
      denom,
    },
  };
};
