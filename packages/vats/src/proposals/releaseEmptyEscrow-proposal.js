// @ts-check
import { E } from '@endo/far';
import { Stable } from '@agoric/internal/src/tokens.js';

/**
 * @param {BootstrapPowers & {
 *   consume: {
 *     vatAdminSvc: VatAdminSvc;
 *     vatStore: MapStore<
 *       string,
 *       import('@agoric/swingset-vat').CreateVatResults
 *     >;
 *   };
 * }} powers
 * @param {object} options
 * @param {{ zoeRef }} options.options
 */
export const ReleaseEmptyEscrow = async (
  {
    consume: { vatAdminSvc, vatStore },
    issuer: {
      consume: { [Stable.symbol]: feeIssuerP },
    },
    brand: {
      consume: { [Stable.symbol]: feeBrandP },
    },
  },
  options,
) => {
  const { zoeRef } = options.options;

  const [feeIssuer, feeBrand] = await Promise.all([feeIssuerP, feeBrandP]);

  assert(zoeRef.bundleID);
  const zoeBundleCap = await E(vatAdminSvc).getBundleCap(zoeRef.bundleID);
  const { adminNode, root: zoeRoot } = await E(vatStore).get('zoe');

  await E(adminNode).upgrade(zoeBundleCap, {});

  const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();
  await E(zoeConfigFacet).releaseEmptyPayments(feeIssuer, feeBrand, 1000);
  console.log(`Released empty payments: `);
};

export const getManifestForReleaseEmptyEscrow = (_powers, { zoeRef }) => ({
  manifest: {
    [ReleaseEmptyEscrow.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      issuer: { consume: { [Stable.symbol]: 'feeIssuer' } },
      brand: { consume: { [Stable.symbol]: 'feeBrand' } },
    },
  },
  options: {
    zoeRef,
  },
});
