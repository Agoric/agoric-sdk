// @ts-check
import { E } from '@endo/far';

const { details: X } = assert;

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
 * @param {{ zoeRef: VatSourceRef; zcfRef: VatSourceRef }} options.options
 */
export const upgradeZcf = async (
  { consume: { vatAdminSvc, vatStore } },
  options,
) => {
  const { zoeRef, zcfRef } = options.options;

  let zoeBundleID = zoeRef.bundleID;
  await null;
  if (!zoeBundleID) {
    const zoeBundleName = zoeRef.bundleName;
    assert(zoeBundleName, X`zoeRef ${zoeRef} must have bundleID or bundleName`);
    zoeBundleID = await E(vatAdminSvc).getBundleIDByName(zoeBundleName);
  }
  const zoeBundleCap = await E(vatAdminSvc).getBundleCap(zoeBundleID);
  console.log(`ZOE BUNDLE ID: `, zoeBundleID);

  const { adminNode, root: zoeRoot } = await E(vatStore).get('zoe');

  await E(adminNode).upgrade(zoeBundleCap, {});

  const zoeConfigFacet = await E(zoeRoot).getZoeConfigFacet();
  await E(zoeConfigFacet).updateZcfBundleId(zcfRef.bundleID);
  console.log(`ZCF BUNDLE ID: `, zcfRef.bundleID);
};

export const getManifestForZoe = (_powers, { zoeRef, zcfRef }) => ({
  manifest: {
    [upgradeZcf.name]: {
      consume: {
        vatAdminSvc: 'vatAdminSvc',
        vatStore: 'vatStore',
      },
      produce: {},
    },
  },
  options: {
    zoeRef,
    zcfRef,
  },
});
