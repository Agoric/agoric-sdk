import { makeNodeBundleCache as wrappedMaker } from '@endo/bundle-source/cache.js';
import styles from 'ansi-styles'; // less authority than 'chalk'
import * as fsPromises from 'fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'url';
import path from 'path';
import { setTimeout as delay } from 'timers/promises';
import { makeDirectoryLock } from '@agoric/internal/src/build-cache.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {BuildCacheEvent} from '@agoric/internal/src/build-cache-types.js';
 * @import {BundleOptions, ModuleFormat} from '@endo/bundle-source';
 */

/** @typedef {EReturn<typeof wrappedMaker>} WrappedBundleCache */
/** @typedef {BundleOptions<ModuleFormat> & Parameters<typeof wrappedMaker>[1]} BundleCacheOptions */
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
 *   onBundleToolEvent?: (event: BundleToolEvent) => void,
 * }} BundleToolEventSink
 */
/**
 * @typedef {{
 *   type: 'bundle-source-log';
 *   args: unknown[];
 *   phase: string;
 *   timestamp: number;
 * }} BundleSourceLogEvent
 */
/**
 * @typedef {{
 *   type: 'registry-loaded';
 *   args: string[];
 *   phase: '[registry]';
 *   elapsedMs: number;
 *   bundleCount: number;
 * }} RegistryLoadedEvent
 */
/**
 * @typedef {BundleSourceLogEvent | RegistryLoadedEvent | BuildCacheEvent} BundleToolEvent
 */
/**
 * @typedef {{
 *   delayMs: (ms: number) => Promise<unknown>,
 *   eventSink?: BundleToolEventSink,
 *   isPidAlive: (pid: number) => boolean,
 *   monotonicNow: () => number,
 *   now: () => number,
 *   pid: number,
 * }} BundleToolPowers
 */

const BUNDLE_LOCK_ACQUIRE_TIMEOUT_MS = 5 * 60_000;
const BUNDLE_STALE_LOCK_MS = 60_000;

const defaultBundleToolEventSink = {
  onBundleToolEvent: event => {
    if (
      event.type !== 'bundle-source-log' &&
      event.type !== 'registry-loaded'
    ) {
      return;
    }
    const { args = [], phase = '[check]', type } = event;
    if (type === 'bundle-source-log') {
      const joined = args.map(arg => String(arg)).join(' ');
      if (joined.includes(' valid:')) {
        return;
      }
    }
    const flattened = args.map(arg =>
      // Don't print stack traces.
      arg instanceof Error ? arg.message : arg,
    );
    console.log(
      `${styles.dim.open}[bundleTool]${phase}`,
      ...flattened,
      styles.dim.close,
    );
  },
};
harden(defaultBundleToolEventSink);

const inferLogPhase = args => {
  const joined = args.map(arg => String(arg)).join(' ');
  let phase = '[check]';
  if (joined.includes(' add:') || joined.includes(' bundled ')) {
    phase = '[rebuilt]';
  }
  return phase;
};
harden(inferLogPhase);

/**
 * @param {{
 *   delayMs?: (ms: number) => Promise<unknown>,
 *   eventSink?: BundleToolEventSink,
 *   isPidAlive?: (pid: number) => boolean,
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
    eventSink = defaultBundleToolEventSink,
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
    monotonicNow = () => performance.now(),
    now = () => Date.now(),
    pid = process.pid,
  } = options;
  return harden({
    delayMs,
    eventSink,
    isPidAlive,
    monotonicNow,
    now,
    pid,
  });
};
harden(makeAmbientBundleToolPowers);

/**
 * @param {string} dest
 * @param {BundleCacheOptions} options
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
  const {
    delayMs,
    eventSink = defaultBundleToolEventSink,
    isPidAlive,
    monotonicNow,
    now,
    pid,
  } = powers;

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

  const onEvent = eventSink.onBundleToolEvent || (() => {});
  const optionsKeyFor = options0 => {
    // Include options in the key on purpose: bundle output may differ by
    // bundle-source options, and correctness prefers over-segmentation over
    // accidental cache aliasing.
    try {
      return JSON.stringify(options0 || {});
    } catch {
      return '[unstringifiable-options]';
    }
  };
  const sanitizeName = name => name.replace(/[^a-zA-Z0-9._-]/g, '-');
  const getTargetNames = (canonicalRootPath, targetName, options0) => {
    const requestedTargetName =
      targetName || path.basename(canonicalRootPath, '.js');
    const optionsKey = optionsKeyFor(options0);
    const hashKey = createHash('sha256')
      .update(`${canonicalRootPath}\n${optionsKey}`)
      .digest('hex')
      .slice(0, 12);
    const cacheTargetName = `${sanitizeName(requestedTargetName)}-${hashKey}`;
    return harden({ requestedTargetName, cacheTargetName, optionsKey });
  };
  const log = (...args) => {
    onEvent({
      type: 'bundle-source-log',
      args,
      phase: inferLogPhase(args),
      timestamp: now(),
    });
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
  const { withLock } = makeDirectoryLock({
    fs: fsPromises,
    delayMs,
    now,
    pid,
    isPidAlive,
    lockRoot,
    staleLockMs: BUNDLE_STALE_LOCK_MS,
    acquireTimeoutMs: BUNDLE_LOCK_ACQUIRE_TIMEOUT_MS,
    onEvent,
  });

  const cache = harden({
    ...rawCache,
    add: (rootPath, targetName, log0, options0) => {
      const canonicalRootPath = canonicalizeSourceSpec(rootPath);
      const { requestedTargetName, cacheTargetName } = getTargetNames(
        canonicalRootPath,
        targetName,
        options0,
      );
      return withLock(requestedTargetName, () =>
        rawCache.add(canonicalRootPath, cacheTargetName, log0, options0),
      );
    },
    validateOrAdd: (rootPath, targetName, log0, options0) => {
      const canonicalRootPath = canonicalizeSourceSpec(rootPath);
      const { requestedTargetName, cacheTargetName } = getTargetNames(
        canonicalRootPath,
        targetName,
        options0,
      );
      return withLock(requestedTargetName, () =>
        rawCache.validateOrAdd(
          canonicalRootPath,
          cacheTargetName,
          log0,
          options0,
        ),
      );
    },
    load: async (rootPath, targetName, log0, options0) => {
      const canonicalRootPath = canonicalizeSourceSpec(rootPath);
      const { requestedTargetName, cacheTargetName, optionsKey } =
        getTargetNames(canonicalRootPath, targetName, options0);
      const key = `${cacheTargetName}:${canonicalRootPath}:${optionsKey}`;
      const found = inProcessLoads.get(key);
      if (found) {
        return found;
      }
      const pending = withLock(requestedTargetName, async () => {
        const { bundleFileName } = await rawCache.validateOrAdd(
          canonicalRootPath,
          cacheTargetName,
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
      onEvent({
        type: 'registry-loaded',
        phase: '[registry]',
        args: [
          `loaded ${Object.keys(registry).length} bundle(s) in ${elapsedMs}ms`,
        ],
        elapsedMs,
        bundleCount: Object.keys(registry).length,
      });
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
