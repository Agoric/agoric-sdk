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

export const addInterchainAsset = async (
  {
    consume: { zoe, bankManager, agoricNamesAdmin },
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
  installation: {
    // @ts-expect-error bootstrap types are out of sync
    consume: { scaledPriceAuthority },
  },
}) => {
  const [
    sourcePriceAuthority,
    [ibcAtomBrand, runBrand],
    [usdBrand, atomBrand],
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
  consume: { vaultFactoryCreator, agoricNamesAdmin, zoe },
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
  E(ammPub).addPool(ibcAtomIssuer, 'IbcATOM');

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

export const getManifestForStep2 = (
  { restoreRef },
  { denom, scaledPriceAuthority },
) => {
  return {
    manifest: {
      addInterchainAsset: {
        consume: { zoe: true, bankManager: true, agoricNamesAdmin: true },
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
        consume: { vaultFactoryCreator: true, agoricNamesAdmin: true },
        brand: {
          consume: { RUN: true },
        },
      },
    },
    installations: {
      scaledPriceAuthority: restoreRef(scaledPriceAuthority),
    },
    options: {
      denom,
    },
  };
};
