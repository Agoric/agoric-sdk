// @ts-check
import { AmountMath, AssetKind } from '@agoric/ertp';
import { makeRatio } from '@agoric/zoe/src/contractSupport/index.js';
import { E } from '@endo/far';

const reserveThenGetNames = async (nameAdmin, names) => {
  for (const name of names) {
    E(nameAdmin).reserve(name);
  }
  const nameHub = E(nameAdmin).readonly();
  return Promise.all(names.map(name => E(nameHub).lookup(name)));
};

/**
 * @param { BootstrapPowers } powers
 * @param {*} config
 */
export const addInterchainAsset = async (
  {
    consume: { zoe, bankManager, agoricNamesAdmin },
    produce: { ibcAtomMintForTesting },
    installation: {
      consume: { mintHolder },
    },
  },
  {
    options: {
      denom,
      keyword = 'IbcATOM',
      proposedName = 'ATOM',
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

  E(E(agoricNamesAdmin).lookupAdmin('issuer')).update('IbcATOM', issuer);
  E(E(agoricNamesAdmin).lookupAdmin('brand')).update('IbcATOM', brand);
  ibcAtomMintForTesting.resolve(mint);

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
    [ibcAtomBrand, runBrand],
    [usdBrand, atomBrand],
    [scaledPriceAuthority],
  ] = await Promise.all([
    priceAuthority,
    reserveThenGetNames(E(agoricNamesAdmin).lookupAdmin('brand'), [
      'IbcATOM',
      'RUN',
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
  const scaleOut = makeRatio(1n, usdBrand, 1n, runBrand);
  const terms = { sourcePriceAuthority, scaleIn, scaleOut };
  const { publicFacet } = E.get(
    E(zoe).startInstance(scaledPriceAuthority, undefined, terms),
  );
  await E(priceAuthorityAdmin).registerPriceAuthority(
    E(publicFacet).getPriceAuthority(),
    ibcAtomBrand,
    runBrand,
    true, // force
  );
};

/** @typedef {import('../econ-behaviors.js').EconomyBootstrapPowers} EconomyBootstrapPowers */

/** @param {EconomyBootstrapPowers} powers */
export const addAssetToVault = async ({
  consume: { vaultFactoryCreator, reserveCreatorFacet, agoricNamesAdmin, zoe },
  brand: {
    consume: { RUN: runP },
  },
  instance: {
    consume: { amm },
  },
}) => {
  const [ibcAtomIssuer] = await reserveThenGetNames(
    E(agoricNamesAdmin).lookupAdmin('issuer'),
    ['IbcATOM', 'RUN'],
  );

  /** @type {ERef<XYKAMMPublicFacet>} */
  const ammPub = E(zoe).getPublicFacet(amm);
  await E(ammPub).addPool(ibcAtomIssuer, 'IbcATOM');
  await E(reserveCreatorFacet).addIssuer(ibcAtomIssuer, 'IbcATOM');

  const RUN = await runP;
  await E(vaultFactoryCreator).addVaultType(ibcAtomIssuer, 'ATOM', {
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
  { denom, scaledPriceAuthorityRef },
) => {
  return {
    manifest: {
      addInterchainAsset: {
        consume: { zoe: true, bankManager: true, agoricNamesAdmin: true },
        produce: { ibcAtomMintForTesting: true },
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
          consume: { RUN: true },
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
