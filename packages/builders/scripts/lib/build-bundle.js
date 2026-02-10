/* eslint-env node */
import { dirname, resolve as pathResolve } from 'path';
import { fileURLToPath } from 'url';

import { unsafeMakeBundleCache } from '@agoric/swingset-vat/tools/bundleTool.js';

/** @type {Map<string, Promise<Awaited<ReturnType<typeof unsafeMakeBundleCache>>>>} */
const bundleCaches = new Map();

/**
 * @typedef {{
 *   sourceSpec?: string;
 *   packagePath?: string;
 *   bundleName?: string;
 * }} BundleRegistryEntry
 */

/**
 * Build (or validate) a cached bundle and return the absolute pathname.
 *
 * @param {string} fromMetaUrl
 * @param {string | BundleRegistryEntry} moduleSpecifierOrEntry
 * @param {string} [bundleName]
 * @param {{ bundleDirRel?: string }} [options]
 */
export const buildBundlePath = async (
  fromMetaUrl,
  moduleSpecifierOrEntry,
  bundleName = undefined,
  options = {},
) => {
  const { bundleDirRel = '../bundles' } = options;
  const fromDir = dirname(fileURLToPath(fromMetaUrl));
  /** @type {string | undefined} */
  let sourceSpec;
  /** @type {string | undefined} */
  let resolvedBundleName;

  if (typeof moduleSpecifierOrEntry === 'string') {
    sourceSpec = fileURLToPath(import.meta.resolve(moduleSpecifierOrEntry));
    if (typeof bundleName !== 'string') {
      throw TypeError('bundleName is required when using a module specifier');
    }
    resolvedBundleName = bundleName;
  } else {
    const {
      sourceSpec: sourceSpec0,
      packagePath,
      bundleName: entryBundleName,
    } = /** @type {BundleRegistryEntry} */ (moduleSpecifierOrEntry);
    sourceSpec =
      sourceSpec0 ||
      (packagePath && fileURLToPath(import.meta.resolve(packagePath)));
    resolvedBundleName = entryBundleName;
  }
  if (!sourceSpec || !resolvedBundleName) {
    throw TypeError(
      'registry entry must provide sourceSpec/packagePath and bundleName',
    );
  }

  const bundleDir = pathResolve(fromDir, bundleDirRel);

  if (!bundleCaches.has(bundleDir)) {
    bundleCaches.set(bundleDir, unsafeMakeBundleCache(bundleDir));
  }
  const bundleCacheP = bundleCaches.get(bundleDir);
  assert(bundleCacheP, `missing bundle cache for ${bundleDir}`);
  const bundleCache = await bundleCacheP;
  const { bundleFileName } = await bundleCache.validateOrAdd(
    sourceSpec,
    resolvedBundleName,
  );
  return pathResolve(bundleDir, bundleFileName);
};
