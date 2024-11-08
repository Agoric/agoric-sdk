// @ts-check
import { E } from '@endo/far';
import { AmountMath } from '@agoric/ertp';
import { Stable } from '@agoric/internal/src/tokens.js';

/**
 * @param {BootstrapPowers} powers
 * @param {object} options
 * @param {{ registryRef: VatSourceRef }} options.options
 */
export const upgradePriceAuthorityRegistry = async (
  {
    consume: { vatAdminSvc, vatStore, priceAuthority, agoricNames },
    brand: {
      consume: { [Stable.symbol]: stableBrandP },
    },
  },
  options,
) => {
  const { registryRef } = options.options;

  assert(registryRef.bundleID);
  console.log(`PriceAuthorityRegistry BUNDLE ID: `, registryRef.bundleID);

  const [{ adminNode }, stableBrand, atomBrand, bundleCap] = await Promise.all([
    E(vatStore).get('priceAuthority'),
    stableBrandP,
    E(agoricNames).lookup('brand', 'ATOM'),
    E(vatAdminSvc).getBundleCap(registryRef.bundleID),
  ]);

  await E(adminNode).upgrade(bundleCap, {});

  const oneATOM = AmountMath.make(atomBrand, 1_000_000n);
  const quoteAtom = await E(priceAuthority).quoteGiven(oneATOM, stableBrand);
  console.log('paRegistry quote', quoteAtom);

  assert(quoteAtom.quoteAmount.value, 'insist on getting a quote');
};

const par = 'paRegistry';
export const getManifestForUpgradingRegistry = (_powers, { registryRef }) => ({
  manifest: {
    [upgradePriceAuthorityRegistry.name]: {
      consume: {
        agoricNames: par,
        vatAdminSvc: par,
        vatStore: par,
        priceAuthority: par,
      },
      brand: { consume: { [Stable.symbol]: par } },
    },
  },
  options: {
    registryRef,
  },
});
