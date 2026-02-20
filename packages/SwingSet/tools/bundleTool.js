import { makeNodeBundleCache as wrappedMaker } from '@endo/bundle-source/cache.js';
import styles from 'ansi-styles'; // less authority than 'chalk'
import { mkdir, readFile, rm, stat, writeFile } from 'fs/promises';
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
 * @typedef {{
 *   delayMs: (ms: number) => Promise<unknown>,
 *   isPidAlive: (pid: number) => boolean,
 *   log: (...args: unknown[]) => void,
 *   monotonicNow: () => number,
 *   now: () => number,
 *   pid: number,
 * }} BundleToolPowers
 */

/**
 * @param {string} dest
 * @param {Parameters<typeof wrappedMaker>[1]} options
 * @param {Parameters<typeof wrappedMaker>[2]} loadModule
 * @param {BundleToolPowers} powers
 * @returns {Promise<BundleCache>}
 */
const BUNDLE_LOCK_ACQUIRE_TIMEOUT_MS = 5 * 60_000;
const BUNDLE_STALE_LOCK_MS = 60_000;

const defaultBundleToolLog = (...args) => {
  const joined = args.map(arg => String(arg)).join(' ');
  const isCacheHit = joined.includes(' valid:');
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
harden(defaultBundleToolLog);

/**
 * @param {{
 *   delayMs?: (ms: number) => Promise<unknown>,
 *   isPidAlive?: (pid: number) => boolean,
 *   log?: (...args: unknown[]) => void,
 *   monotonicNow?: () => number,
 *   now?: () => number,
 *   pid?: number,
 * }} [options]
 * @returns {BundleToolPowers}
 * @alpha
 */
export const makeAmbientBundleToolPowers = (options = {}) => {
  const {
    delayMs = ms => delay(ms),
    isPidAlive = lockPid => {
      if (!Number.isInteger(lockPid) || lockPid <= 0) {
        return false;
      }
      try {
        process.kill(lockPid, 0);
        return true;
      } catch {
        return false;
      }
    },
    log = defaultBundleToolLog,
    monotonicNow = () => performance.now(),
    now = () => Date.now(),
    pid = process.pid,
  } = options;
  return harden({
    delayMs,
    isPidAlive,
    log,
    monotonicNow,
    now,
    pid,
  });
};
harden(makeAmbientBundleToolPowers);

/**
 * @param {string} dest
 * @param {Parameters<typeof wrappedMaker>[1]} options
 * @param {Parameters<typeof wrappedMaker>[2]} loadModule
 * @param {BundleToolPowers} powers
 * @returns {Promise<BundleCache>}
 * @alpha
 */
export const makeNodeBundleCache = async (
  dest,
  options,
  loadModule,
  powers,
) => {
  const { delayMs, isPidAlive, log, monotonicNow, now, pid } = powers;

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
    const ownerPath = path.resolve(lockPath, 'owner.json');
    await mkdir(lockRoot, { recursive: true });
    const started = monotonicNow();

    const maybeBreakStaleLock = async () => {
      const ownerTxt = await readFile(ownerPath, 'utf8').catch(() => undefined);
      let lockInfo;
      if (typeof ownerTxt === 'string') {
        try {
          lockInfo = JSON.parse(ownerTxt);
        } catch {
          // Another process may be in the middle of writing owner.json.
          // Treat malformed data as unknown owner and rely on age checks below.
          lockInfo = undefined;
        }
      }
      if (
        lockInfo &&
        Number.isInteger(lockInfo.pid) &&
        !isPidAlive(lockInfo.pid)
      ) {
        await rm(lockPath, { recursive: true, force: true });
        return true;
      }
      try {
        const st = await stat(lockPath);
        const ageMs = now() - st.mtimeMs;
        if (ageMs >= BUNDLE_STALE_LOCK_MS) {
          await rm(lockPath, { recursive: true, force: true });
          return true;
        }
      } catch {
        return true;
      }
      return false;
    };

    // Cross-process lock via mkdir(). Retriable on EEXIST.
    for (;;) {
      try {
        await mkdir(lockPath);
        await writeFile(
          ownerPath,
          JSON.stringify({ pid, createdAt: now() }),
          'utf8',
        );
        break;
      } catch (e) {
        if (e && typeof e === 'object' && 'code' in e && e.code === 'EEXIST') {
          const brokeStaleLock = await maybeBreakStaleLock();
          if (brokeStaleLock) {
            continue;
          }
          const waitedMs = monotonicNow() - started;
          if (waitedMs >= BUNDLE_LOCK_ACQUIRE_TIMEOUT_MS) {
            throw Error(
              `Timed out waiting for bundle lock ${lockPath} after ${waitedMs}ms`,
            );
          }
          await delayMs(20);
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
    validateOrAdd: (rootPath, targetName, log0, options0) => {
      const canonicalRootPath = canonicalizeSourceSpec(rootPath);
      const resolvedTargetName =
        targetName || path.basename(canonicalRootPath, '.js');
      return withBundleLock(resolvedTargetName, () =>
        rawCache.validateOrAdd(
          canonicalRootPath,
          resolvedTargetName,
          log0,
          options0,
        ),
      );
    },
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
      void pending.then(
        () => inProcessLoads.delete(key),
        () => inProcessLoads.delete(key),
      );
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
    const started = monotonicNow();
    await null;
    try {
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
    } finally {
      const elapsedMs = monotonicNow() - started;
      log(
        `${styles.dim.open}[bundleTool][registry] loaded ${Object.keys(registry).length} bundle(s) in ${elapsedMs}ms`,
        styles.dim.close,
      );
    }
  };
  return /** @type {BundleCache} */ (
    harden({
      ...cache,
      loadRegistry,
    })
  );
};

/**
 * @param {string} dest
 * @param {number} [pid]
 * @returns {Promise<BundleCache>}
 * @alpha
 */
export const unsafeMakeBundleCache = (dest, pid = process.pid) =>
  makeNodeBundleCache(
    dest,
    {},
    s => import(s),
    makeAmbientBundleToolPowers({ pid }),
  );

const sharedBundleCachePath = fileURLToPath(
  new URL('../../../bundles', import.meta.url),
);

/**
 * @alpha
 */
export const unsafeSharedBundleCache = unsafeMakeBundleCache(
  sharedBundleCachePath,
);
