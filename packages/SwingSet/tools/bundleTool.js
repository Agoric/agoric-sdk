import { makeNodeBundleCache as wrappedMaker } from '@endo/bundle-source/cache.js';
import styles from 'ansi-styles'; // less authority than 'chalk'
import { fileURLToPath } from 'url';

/**
 * @import {EReturn} from '@endo/far';
 */

/** @typedef {EReturn<typeof wrappedMaker>} WrappedBundleCache */
/**
 * @typedef {{
 *   sourceSpec?: string;
 *   packagePath?: string;
 *   bundleName?: string;
 * }} BundleRegistryEntry
 */
/**
 * @typedef {Awaited<ReturnType<WrappedBundleCache['load']>>} LoadedBundle
 */
/**
 * @template {Record<string, BundleRegistryEntry>} T
 * @typedef {{
 *   [K in keyof T as `${K & string}Bundle`]: LoadedBundle
 * }} LoadedRegistryBundles
 */
/**
 * @typedef {WrappedBundleCache & {
 *   loadRegistry: <T extends Record<string, BundleRegistryEntry>>(registry: T) => Promise<LoadedRegistryBundles<T>>;
 * }} BundleCache
 */

/**
 * @param {string} dest
 * @param {Parameters<typeof wrappedMaker>[1]} options
 * @param {Parameters<typeof wrappedMaker>[2]} loadModule
 * @param {number} [pid]
 * @returns {Promise<BundleCache>}
 */
export const makeNodeBundleCache = async (dest, options, loadModule, pid) => {
  const log = (...args) => {
    const flattened = args.map(arg =>
      // Don't print stack traces.
      arg instanceof Error ? arg.message : arg,
    );
    console.log(
      // Make all messages prefixed and dim.
      `${styles.dim.open}[bundleTool]`,
      ...flattened,
      styles.dim.close,
    );
  };
  const cache = await wrappedMaker(dest, { log, ...options }, loadModule, pid);
  /**
   * Load all entries in a source-spec registry.
   * Each returned property is named `${key}Bundle`.
   *
   * @template {Record<string, BundleRegistryEntry>} T
   * @param {T} registry
   * @returns {Promise<LoadedRegistryBundles<T>>}
   */
  const loadRegistry = async registry => {
    const loaded = await Promise.all(
      Object.entries(registry).map(async ([key, spec]) => {
        const sourceSpec = spec.sourceSpec || spec.packagePath;
        if (typeof sourceSpec !== 'string') {
          throw TypeError(
            `registry.${key} must include sourceSpec or packagePath`,
          );
        }
        const bundleName = spec.bundleName || key;
        const bundle = await cache.load(sourceSpec, bundleName);
        return [`${key}Bundle`, bundle];
      }),
    );
    return /** @type {LoadedRegistryBundles<T>} */ (
      harden(Object.fromEntries(loaded))
    );
  };
  return /** @type {BundleCache} */ (
    harden({
      ...cache,
      loadRegistry,
    })
  );
};

/** @type {Map<string, Promise<BundleCache>>} */
const providedCaches = new Map();

/**
 * Make a new bundle cache for the destination. If there is already one for that
 * destination, return it.
 *
 * @param {string} dest
 * @param {object} options
 * @param {string} [options.format]
 * @param {boolean} [options.dev]
 * @param {number} [options.byteLimit=490_000] - Maximum bundle size in bytes before
 *   falling back to optimizations that may reduce legibility.
 * @param {(id: string) => Promise<any>} loadModule
 * @param {number} [pid]
 * @returns {Promise<BundleCache>}
 */
export const provideBundleCache = (dest, options, loadModule, pid) => {
  const uniqueDest = [dest, options.format, options.dev].join('-');
  // store the promise instead of awaiting to prevent a race
  let bundleCache = providedCaches.get(uniqueDest);
  if (!bundleCache) {
    bundleCache = makeNodeBundleCache(dest, options, loadModule, pid);
    providedCaches.set(uniqueDest, bundleCache);
  }
  return bundleCache;
};
harden(provideBundleCache);

/**
 * @param {string} dest
 * @returns {Promise<BundleCache>}
 */
export const unsafeMakeBundleCache = dest =>
  makeNodeBundleCache(dest, {}, s => import(s));

const sharedBundleCachePath = fileURLToPath(
  new URL('../../../bundles', import.meta.url),
);

export const unsafeSharedBundleCache = unsafeMakeBundleCache(
  sharedBundleCachePath,
);
