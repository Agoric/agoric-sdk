// @ts-check
import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';

/**
 * Get bundle ID of a bundle
 *
 * See @agoric/swingset-vat/docs/bundles.md
 *
 * @param {{ endoZipBase64Sha512: string }} bundle
 *
 */
export const getBundleId = bundle => `b1-${bundle.endoZipBase64Sha512}`;

export const makeBundleCacheContext = async (_t, dest = 'bundles/') => {
  const bundleCache = await makeNodeBundleCache(dest, {}, s => import(s));

  const shared = {};
  return { bundleCache, shared };
};
