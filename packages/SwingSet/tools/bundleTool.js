import { makeNodeBundleCache as wrappedMaker } from '@endo/bundle-source/cache.js';
import styles from 'ansi-styles'; // less authority than 'chalk'
import { mkdir, rm } from 'fs/promises';
import { fileURLToPath } from 'url';
import path from 'path';
import { setTimeout as delay } from 'timers/promises';

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
  /** @param {string} sourceSpec */
  const canonicalizeSourceSpec = sourceSpec => {
    if (sourceSpec.startsWith('file:')) {
      return fileURLToPath(sourceSpec);
    }
    if (sourceSpec.startsWith('./') || sourceSpec.startsWith('../')) {
      return path.resolve(sourceSpec);
    }
    if (path.isAbsolute(sourceSpec)) {
      // On Windows, URL-style paths like '/C:/x/y.js' are absolute but need
      // the leading slash stripped to become a valid local path.
      if (path.sep === '\\' && /^\/[a-zA-Z]:\//.test(sourceSpec)) {
        return path.normalize(sourceSpec.slice(1));
      }
      return path.normalize(sourceSpec);
    }
    try {
      return fileURLToPath(import.meta.resolve(sourceSpec));
    } catch {
      return sourceSpec;
    }
  };

  const log = (...args) => {
    const joined = args.map(arg => String(arg)).join(' ');
    const isCacheHit = joined.includes(' valid:');
    const phase = isCacheHit
      ? '[cache-hit]'
      : joined.includes(' add:') || joined.includes(' bundled ')
        ? '[rebuilt]'
        : '[check]';
    if (isCacheHit) {
      return;
    }
    let phase = '[check]';
    if (joined.includes(' add:') || joined.includes(' bundled ')) {
      phase = '[rebuilt]';
    }
    const flattened = args.map(arg =>
      // Don't print stack traces.
      arg instanceof Error ? arg.message : arg,
    );
    console.log(
      // Make all messages prefixed and dim.
      `${styles.dim.open}[bundleTool]${phase}`,
      ...flattened,
      styles.dim.close,
    );
  };
  const rawCache = await wrappedMaker(
    dest,
    { log, ...options },
    loadModule,
    pid,
  );
  const lockRoot = path.resolve(dest, '.bundle-locks');
  /** @type {Map<string, Promise<unknown>>} */
  const inProcessLoads = new Map();

  /**
   * @param {string} targetName
   * @param {() => Promise<any>} duringLock
   */
  const withBundleLock = async (targetName, duringLock) => {
    const lockName = `${encodeURIComponent(targetName)}.lock`;
    const lockPath = path.resolve(lockRoot, lockName);
    await mkdir(lockRoot, { recursive: true });

    // Cross-process lock via mkdir(). Retriable on EEXIST.
    for (;;) {
      try {
        await mkdir(lockPath);
        break;
      } catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EEXIST') {
          await delay(20);
          continue;
        }
        throw e;
      }
    }

    try {
      return await duringLock();
    } finally {
      await rm(lockPath, { recursive: true, force: true });
    }
  };

  const cache = harden({
    ...rawCache,
    add: (rootPath, targetName, log0, options0) => {
      const canonicalRootPath = canonicalizeSourceSpec(rootPath);
      const resolvedTargetName =
        targetName || path.basename(canonicalRootPath, '.js');
      return withBundleLock(resolvedTargetName, () =>
        rawCache.add(canonicalRootPath, resolvedTargetName, log0, options0),
      );
    },
    validateOrAdd: (rootPath, targetName, log0, options0) =>
      withBundleLock(
        targetName || path.basename(canonicalizeSourceSpec(rootPath), '.js'),
        () =>
          rawCache.validateOrAdd(
            canonicalizeSourceSpec(rootPath),
            targetName ||
              path.basename(canonicalizeSourceSpec(rootPath), '.js'),
            log0,
            options0,
          ),
      ),
    load: async (rootPath, targetName, log0, options0) => {
      const canonicalRootPath = canonicalizeSourceSpec(rootPath);
      const resolvedTargetName =
        targetName || path.basename(canonicalRootPath, '.js');
      const key = `${resolvedTargetName}:${canonicalRootPath}:${JSON.stringify(
        options0 || {},
      )}`;
      const found = inProcessLoads.get(key);
      if (found) {
        return found;
      }
      const pending = withBundleLock(resolvedTargetName, async () => {
        const { bundleFileName } = await rawCache.validateOrAdd(
          canonicalRootPath,
          resolvedTargetName,
          log0,
          options0,
        );
        const bundlePath = path.resolve(dest, bundleFileName);
        return import(bundlePath).then(m => harden(m.default));
      });
      inProcessLoads.set(key, pending);
      return pending;
    },
  });
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
