/* global globalThis, WeakRef, FinalizationRegistry */

import process from 'process';
import crypto from 'crypto';
import { performance } from 'perf_hooks';
import { spawn as ambientSpawn } from 'child_process';
import fs from 'fs';
import { tmpName } from 'tmp';
import anylogger from 'anylogger';
import microtime from 'microtime';

import { assert, q, Fail } from '@endo/errors';
import { importBundle } from '@endo/import-bundle';
import { initSwingStore } from '@agoric/swing-store';

import { mustMatch, M } from '@endo/patterns';
import { checkBundle } from '@endo/check-bundle/lite.js';
import { deepCopyJsonable } from '@agoric/internal/src/js-utils.js';
import { makeLimitedConsole } from '@agoric/internal/src/ses-utils.js';
import engineGC from '@agoric/internal/src/lib-nodejs/engine-gc.js';
import { startSubprocessWorker } from '@agoric/internal/src/lib-nodejs/spawnSubprocessWorker.js';
import { waitUntilQuiescent } from '@agoric/internal/src/lib-nodejs/waitUntilQuiescent.js';
import { makeGcAndFinalize } from '@agoric/internal/src/lib-nodejs/gc-and-finalize.js';
import { kslot, krefOf } from '@agoric/kmarshal';
import { insistStorageAPI } from '../lib/storageAPI.js';
import { insistCapData } from '../lib/capdata.js';
import {
  buildKernelBundle,
  swingsetIsInitialized,
  initializeSwingset,
} from './initializeSwingset.js';
import {
  makeWorkerBundleHandler,
  makeXsnapBundleData,
} from './bundle-handler.js';
import { makeStartXSnap } from './startXSnap.js';
import { makeStartSubprocessWorkerNode } from './startNodeSubprocess.js';

/**
 * @import {EReturn} from '@endo/far';
 * @import {LimitedConsole} from '@agoric/internal';
 * @import {VatID} from '../types-internal.js';
 */

/**
 * @typedef {Record<string, unknown> & {type: string, time?: never, monotime?: never}} SlogProps
 * @typedef {Omit<SlogProps, 'type'> & {type?: never, seconds?: never}} SlogDurationProps
 */

const { hasOwn } = Object;

const endoZipBase64Sha512Shape = harden({
  moduleFormat: 'endoZipBase64',
  endoZipBase64: M.string(harden({ stringLengthLimit: Infinity })),
  endoZipBase64Sha512: M.string(),
});

/** @param {Uint8Array} bytes */
export function computeSha512(bytes) {
  const hash = crypto.createHash('sha512');
  hash.update(bytes);
  return hash.digest().toString('hex');
}

/**
 * Make logger functions from either a prefix string or a function that receives
 * the first argument of a log-method invocation and returns a replacement that
 * provides more detail for source identification.
 *
 * @param {string | ((originalSource: unknown) => string)} prefixer
 */
function makeConsole(prefixer) {
  if (typeof prefixer !== 'function') {
    const logger = anylogger(prefixer);
    return makeLimitedConsole(level => logger[level]);
  }

  const prefixToLogger = new Map();
  return makeLimitedConsole(level => {
    return (source, ...args) => {
      const prefix = prefixer(source);
      let logger = prefixToLogger.get(prefix);
      if (!logger) {
        logger = anylogger(prefix);
        prefixToLogger.set(prefix, logger);
      }

      return logger[level](...args);
    };
  });
}

/**
 * A console-like object for logging. It starts as the global console but is
 * immediately replaced with an anylogger instance dedicated to this file, and
 * upon creation of a controller is replaced again with an anylogger dedicated
 * to that controller (and which also emits slog entries).
 *
 * @type {LimitedConsole}
 */
let sloggingConsole = console;
/** @type {(newConsole: LimitedConsole) => void} */
const setSloggingConsole = newConsole => {
  sloggingConsole = newConsole;
};
setSloggingConsole(makeConsole('SwingSet:controller'));

/**
 * @param {unknown} e
 * @param {Promise} pr
 */
function onUnhandledRejection(e, pr) {
  // Don't trigger sensitive hosts (like AVA).
  pr.catch(() => {});
  sloggingConsole.error('🤞 UnhandledPromiseRejection:', e);
}

/**
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {Record<string, unknown>} deviceEndowments
 * @param {{
 *   verbose?: boolean,
 *   debugPrefix?: string,
 *   slogCallbacks?: unknown,
 *   slogSender?: import('@agoric/telemetry').SlogSender,
 *   testTrackDecref?: unknown,
 *   warehousePolicy?: import('../types-external.js').VatWarehousePolicy,
 *   overrideVatManagerOptions?: unknown,
 *   spawn?: typeof import('child_process').spawn,
 *   env?: Record<string, string | undefined>,
 *   kernelBundle?: Bundle
 *   xsnapBundleData?: ReturnType<import('./bundle-handler.js').makeXsnapBundleData>,
 *   bundleHandler?: import('./bundle-handler.js').BundleHandler,
 *   profileVats?: string[],
 *   debugVats?: string[],
 * }} runtimeOptions
 */
export async function makeSwingsetController(
  kernelStorage = initSwingStore().kernelStorage,
  deviceEndowments = {},
  runtimeOptions = {},
) {
  const kvStore = kernelStorage.kvStore;
  insistStorageAPI(kvStore);

  const {
    // Use ambient process.env only if caller did not specify.
    env = process.env,
    verbose,
    debugPrefix = '',
    slogCallbacks,
    slogSender,
    spawn = ambientSpawn,
    warehousePolicy = {},
    overrideVatManagerOptions = {},
    xsnapBundleData = makeXsnapBundleData(),
    profileVats = [],
    debugVats = [],

    bundleHandler = makeWorkerBundleHandler(
      kernelStorage.bundleStore,
      xsnapBundleData,
    ),
  } = runtimeOptions;

  if (typeof Compartment === 'undefined') {
    throw Error('SES must be installed before calling makeSwingsetController');
  }

  /** @type {(obj: SlogProps) => void} */
  function writeSlogObject(obj) {
    if (!slogSender) return;

    const { type, seconds, ...props } = obj;
    const timings = {
      // microtime gives POSIX gettimeofday() with microsecond resolution
      time: microtime.nowDouble(),
      // this is CLOCK_MONOTONIC, seconds since process start
      monotime: performance.now() / 1000,
      ...(seconds === undefined ? undefined : { seconds }),
    };

    // rearrange the fields a bit to make it more legible to humans
    slogSender(harden({ type, ...props, ...timings }));
  }

  /**
   * Capture an extended process in the slog, writing an entry with `type`
   * $startLabel and then later (if the function returns successfully or calls
   * the finish callback provided to it) another entry with `type` $endLabel and
   * a `seconds` property valued with the total elapsed duration in seconds.
   * Finish is implied by settlement of the function's awaited return value, so
   * any explicit use of the finish callback MUST NOT follow that settlement.
   *
   * @template T
   * @template {unknown[]} A
   * @param {readonly [startLabel: string, endLabel: string]} labels
   * @param {SlogDurationProps} startProps for both slog entries
   * @param {(finish: (extraProps?: SlogDurationProps) => void, ...args: A) => (T | Promise<T>)} fn
   * @param {unknown[] & A} args
   * @returns {Promise<T>}
   */
  const slogDuration = async (labels, startProps, fn, ...args) => {
    const [startLabel, endLabel] = labels;
    const props = { ...startProps };
    if (hasOwn(props, 'type') || hasOwn(props, 'seconds')) {
      const msg = 'startProps must not include "type" or "seconds"';
      sloggingConsole.error(Error(msg));
      delete props.type;
      delete props.seconds;
    }
    let finished = false;
    /** @type {(extraProps?: SlogDurationProps) => void} */
    const finish = extraProps => {
      const seconds = (performance.now() - t0) / 1000;
      if (finished) {
        // `finish` should only be called once.
        // Log a stack-bearing error instance, but throw something more opaque.
        const msg = `slog event ${startLabel} ${q(startProps || {})} already finished; ignoring props ${q(extraProps || {})}`;
        sloggingConsole.error(Error(msg));
        Fail`slog event ${startLabel} already finished`;
      }
      finished = true;
      if (extraProps) {
        // Preserve extraProps as an atomic unit by deleting prior occurrences.
        for (const name of Object.keys(extraProps)) delete props[name];
        if (hasOwn(extraProps, 'type') || hasOwn(extraProps, 'seconds')) {
          const msg = `extraProps ${q(extraProps)} must not include "type" or "seconds"`;
          sloggingConsole.error(Error(msg));
          const {
            type: _ignoredType,
            seconds: _ignoredSeconds,
            ...validProps
          } = extraProps;
          extraProps = validProps;
        }
      }
      writeSlogObject({ type: endLabel, ...props, ...extraProps, seconds });
    };

    writeSlogObject({ type: startLabel, ...props });
    const t0 = performance.now();
    try {
      // We need to synchronously provide the finish function.
      // eslint-disable-next-line @jessie.js/safe-await-separator
      const result = await fn(finish, ...args);
      if (!finished) finish();
      return result;
    } catch (cause) {
      if (!finished) {
        const msg = `unfinished slog event ${startLabel} ${q(startProps || {})}`;
        sloggingConsole.error(Error(msg, { cause }));
      }
      throw cause;
    }
  };

  const controllerConsole = makeConsole(`${debugPrefix}SwingSet:controller`);
  const controllerSloggingConsole = makeLimitedConsole(level => {
    return (...args) => {
      controllerConsole[level](...args);
      writeSlogObject({ type: 'console', source: 'controller', level, args });
    };
  });
  setSloggingConsole(controllerSloggingConsole);

  const startXSnap = makeStartXSnap({
    bundleHandler,
    snapStore: kernelStorage.snapStore,
    spawn,
    fs,
    tmpName,
    debug: !!env.XSNAP_DEBUG,
    workerTraceRootPath: env.XSNAP_TEST_RECORD,
    profileVats,
    debugVats,
  });
  const startSubprocessWorkerNode = makeStartSubprocessWorkerNode(
    startSubprocessWorker,
    profileVats,
    debugVats,
  );

  const kernelInitLabels = /** @type {const} */ ([
    'kernel-init-start',
    'kernel-init-finish',
  ]);
  const controller = await slogDuration(kernelInitLabels, {}, async () => {
    const kernelBundle = await slogDuration(
      ['bundle-kernel-start', 'bundle-kernel-finish'],
      {},
      async () => runtimeOptions.kernelBundle ?? buildKernelBundle(),
    );

    // FIXME: Put this somewhere better.
    const rejectionHandlers = process.listeners('unhandledRejection');
    if (!rejectionHandlers.includes(onUnhandledRejection)) {
      process.on('unhandledRejection', onUnhandledRejection);
    }

    const kernelConsole = makeConsole(`${debugPrefix}SwingSet:kernel`);
    const sloggingKernelConsole = makeLimitedConsole(level => {
      return (...args) => {
        kernelConsole[level](...args);
        writeSlogObject({ type: 'console', source: 'kernel', level, args });
      };
    });
    const buildKernel = await slogDuration(
      ['import-kernel-start', 'import-kernel-finish'],
      {},
      async () => {
        const kernelNS = await importBundle(kernelBundle, {
          filePrefix: 'kernel/...',
          endowments: {
            console: sloggingKernelConsole,
            // See https://github.com/Agoric/agoric-sdk/issues/9515
            assert: globalThis.assert,
            require: harden(
              what =>
                Fail`kernelRequire unprepared to satisfy require(${what})`,
            ),
            URL: globalThis.Base64, // Unavailable only on XSnap
            Base64: globalThis.Base64, // Available only on XSnap
          },
        });
        return kernelNS.default;
      },
    );

    const kernelEndowments = {
      waitUntilQuiescent,
      kernelStorage,
      debugPrefix,
      // all vats get these in their global scope, plus a vat-specific 'console'
      vatEndowments: harden({}),
      makeConsole,
      startSubprocessWorkerNode,
      startXSnap,
      slogCallbacks,
      writeSlogObject,
      slogDuration,
      WeakRef,
      FinalizationRegistry,
      gcAndFinalize: makeGcAndFinalize(engineGC),
      bundleHandler,
    };
    const kernelRuntimeOptions = {
      verbose,
      warehousePolicy,
      overrideVatManagerOptions,
    };

    /** @type { ReturnType<typeof import('../kernel/kernel.js').default> } */
    const kernel = buildKernel(
      kernelEndowments,
      deviceEndowments,
      kernelRuntimeOptions,
    );

    await kernel.start();

    /**
     * Validate and install a code bundle.
     *
     * @param {EndoZipBase64Bundle} bundle
     * @param {BundleID} [allegedBundleID]
     * @returns {Promise<BundleID>}
     */
    async function validateAndInstallBundle(
      bundle,
      allegedBundleID = undefined,
    ) {
      // TODO The following assertion may be removed when checkBundle subsumes
      // the responsibility to verify the permanence of a bundle's properties.
      // https://github.com/endojs/endo/issues/1106
      mustMatch(bundle, endoZipBase64Sha512Shape);
      await checkBundle(bundle, computeSha512, allegedBundleID);
      const { endoZipBase64Sha512 } = bundle;
      assert.typeof(endoZipBase64Sha512, 'string');
      const bundleID = `b1-${endoZipBase64Sha512}`;
      if (allegedBundleID !== undefined) {
        bundleID === allegedBundleID ||
          Fail`alleged bundleID ${allegedBundleID} does not match actual ${bundleID}`;
      }
      await kernel.installBundle(bundleID, bundle);
      return bundleID;
    }

    // the kernel won't leak our objects into the Vats, we must do
    // the same in this wrapper
    return harden({
      log(str) {
        kernel.log(str);
      },

      writeSlogObject,

      slogDuration,

      dump() {
        return deepCopyJsonable(kernel.dump());
      },

      verboseDebugMode(flag) {
        kernel.kdebugEnable(flag);
      },

      validateAndInstallBundle,

      /**
       * Run the kernel until the policy says to stop, or the queue is empty.
       *
       * @param {RunPolicy} [policy] - a RunPolicy to limit the work being done
       * @returns {Promise<number>} The number of cranks that were executed.
       */
      async run(policy) {
        return kernel.run(policy);
      },

      async step() {
        return kernel.step();
      },

      async shutdown() {
        return kernel.shutdown();
      },

      reapAllVats(beforeReapPos) {
        return kernel.reapAllVats(beforeReapPos);
      },

      async snapshotAllVats() {
        return kernel.snapshotAllVats();
      },

      changeKernelOptions(options) {
        kernel.changeKernelOptions(options);
      },

      getStats() {
        return kernel.getStats();
      },

      getStatus() {
        return deepCopyJsonable(kernel.getStatus());
      },

      getActivityhash() {
        return kernelStorage.getActivityhash();
      },

      // everything beyond here is for tests, and everything should be migrated
      // to be on this 'debug' object to make that clear

      debug: {
        addDeviceHook: kernel.addDeviceHook,
      },

      pinVatRoot(vatName) {
        const vatID = kernel.vatNameToID(vatName);
        const kref = kernel.getRootObject(vatID);
        kernel.pinObject(kref);
        kernelStorage.emitCrankHashes();
        return kref;
      },

      kpRegisterInterest(kpid) {
        return kernel.kpRegisterInterest(kpid);
      },

      kpStatus(kpid) {
        return kernel.kpStatus(kpid);
      },

      kpResolution(kpid, options) {
        const result = kernel.kpResolution(kpid, options);
        // kpResolution does DB write (changes refcounts) so we need emitCrankHashes here
        kernelStorage.emitCrankHashes();
        return result;
      },

      vatNameToID(vatName) {
        return kernel.vatNameToID(vatName);
      },
      deviceNameToID(deviceName) {
        return kernel.deviceNameToID(deviceName);
      },

      injectQueuedUpgradeEvents: () => kernel.injectQueuedUpgradeEvents(),

      /**
       * Queue a method call into the named vat
       *
       * @param {string} vatName
       * @param {string|symbol} method
       * @param {unknown[]} args
       * @param {ResolutionPolicy} resultPolicy
       */
      queueToVatRoot(vatName, method, args = [], resultPolicy = 'ignore') {
        const vatID = kernel.vatNameToID(vatName);
        if (typeof method !== 'symbol') {
          assert.typeof(method, 'string');
        }
        const kref = kernel.getRootObject(vatID);
        const kpid = kernel.queueToKref(kref, method, args, resultPolicy);
        if (kpid) {
          kernel.kpRegisterInterest(kpid);
        }
        kernelStorage.emitCrankHashes();
        return kpid;
      },

      /**
       * Queue a method call to an object represented by a kmarshal token
       *
       * @param {any} target
       * @param {string|symbol} method
       * @param {unknown[]} args
       * @param {ResolutionPolicy} resultPolicy
       */
      queueToVatObject(target, method, args = [], resultPolicy = 'ignore') {
        const targetKref = krefOf(target);
        assert.typeof(targetKref, 'string');
        if (typeof method !== 'symbol') {
          assert.typeof(method, 'string');
        }
        const kpid = kernel.queueToKref(targetKref, method, args, resultPolicy);
        if (kpid) {
          kernel.kpRegisterInterest(kpid);
        }
        kernelStorage.emitCrankHashes();
        return kpid;
      },

      upgradeStaticVat(vatName, shouldPauseFirst, bundleID, options = {}) {
        const vatID = kernel.vatNameToID(vatName);
        let pauseTarget = null;
        if (shouldPauseFirst) {
          pauseTarget = kslot(kernel.getRootObject(vatID));
        }
        if (!options.upgradeMessage) {
          options.upgradeMessage = `vat ${vatName} upgraded`;
        }
        const result = controller.queueToVatRoot(
          'vatAdmin',
          'upgradeStaticVat',
          [vatID, pauseTarget, bundleID, options],
          'ignore',
        );
        // no emitCrankHashes here because queueToVatRoot did that
        return result;
      },

      /**
       * terminate a vat by ID
       *
       * This allows the host app to terminate any vat. The effect is
       * equivalent to the holder of the vat's `adminNode` calling
       * `E(adminNode).terminateWithFailure(reason)`, or the vat itself
       * calling `vatPowers.exitVatWithFailure(reason)`. It accepts a
       * reason capdata structure (use 'kser()' to build one), which
       * will be included in rejection data for the promise available to
       * `E(adminNode).done()`, just like the internal termination APIs.
       * Note that no slots/krefs are allowed in 'reason' when
       * terminating the vat externally.
       *
       * This is a superpower available only from the host app, not from
       * within vats, since `vatID` is merely a string and can be forged
       * trivially. The host app is responsible for supplying the right
       * vatID to kill, by looking at the database or logs (note that
       * vats do not know their own vatID, and `controller.vatNameToID`
       * only works for static vats, not dynamic).
       *
       * This will cause state changes in the swing-store (specifically
       * marking the vat as terminated, and rejection all its
       * outstanding promises), which must be committed before they will
       * be durable. Either call `hostStorage.commit()` immediately
       * after calling this, or call `controller.run()` and *then*
       * `hostStorage.commit()` as you would normally do in response to
       * other I/O or timer activity.
       *
       * The first `controller.run()` after this call will delete all
       * the old vat's state at once, unless you use a
       * [`runPolicy`](../../docs/run-policy.md) to rate-limit cleanups.
       *
       * @param {VatID} vatID
       * @param {SwingSetCapData} reasonCD
       */

      terminateVat(vatID, reasonCD) {
        insistCapData(reasonCD);
        assert(reasonCD.slots.length === 0, 'no slots allowed in reason');
        kernel.terminateVatExternally(vatID, reasonCD);
      },
    });
  });

  return controller;
}
/** @typedef {EReturn<typeof makeSwingsetController>} SwingsetController */

/**
 * NB: To be used only in tests. An app with this may not survive a reboot.
 *
 * This helper makes Swingset controllers and automatically initializes the
 * SwingSet if it isn't already. It will not work for use cases that need to
 * configure devices.
 *
 * The official API does these as two separate steps because the two sometimes
 * need to happen at different times.  In particular, sometimes you need the
 * host to be able to control whether or not to initialize independent of the
 * SwingSet's history.  Also sometimes you want different runtime options for
 * the two stages; this can happen, for example, in some debugging cases.
 *
 * @param {SwingSetConfig} config
 * @param {string[]} argv
 * @param {{
 *   kernelStorage?: SwingStoreKernelStorage;
 *   env?: Record<string, string>;
 *   verbose?: boolean;
 *   kernelBundles?: Record<string, Bundle>;
 *   debugPrefix?: string;
 *   slogCallbacks?: unknown;
 *   slogSender?: import('@agoric/telemetry').SlogSender;
 *   testTrackDecref?: unknown;
 *   warehousePolicy?: import('../types-external.js').VatWarehousePolicy;
 * }} runtimeOptions
 * @param {Record<string, unknown>} deviceEndowments
 * @typedef { import('@agoric/swing-store').KVStore } KVStore
 */
export async function buildVatController(
  config,
  argv = [],
  runtimeOptions = {},
  deviceEndowments = {},
) {
  const {
    env,
    verbose,
    kernelBundles: kernelAndOtherBundles = {},
    debugPrefix,
    slogCallbacks,
    warehousePolicy,
    slogSender,
  } = runtimeOptions;
  let { kernelStorage } = runtimeOptions;
  let hostStorage;
  if (!kernelStorage) {
    ({ kernelStorage, hostStorage } = initSwingStore());
  }
  const { kernel: kernelBundle, ...otherBundles } = kernelAndOtherBundles;
  const kernelBundles = runtimeOptions.kernelBundles ? otherBundles : undefined;

  const actualRuntimeOptions = {
    env,
    verbose,
    debugPrefix,
    slogCallbacks,
    warehousePolicy,
    slogSender,
    kernelBundle,
  };
  const initializationOptions = { verbose, kernelBundles };
  let bootstrapResult;
  await null;
  if (!swingsetIsInitialized(kernelStorage)) {
    bootstrapResult = await initializeSwingset(
      config,
      argv,
      kernelStorage,
      initializationOptions,
      runtimeOptions,
    );
  }
  const controller = await makeSwingsetController(
    kernelStorage,
    deviceEndowments,
    actualRuntimeOptions,
  );
  const shutdown = async () =>
    Promise.all([
      controller.shutdown(),
      hostStorage && hostStorage.close(),
    ]).then(() => {});
  return harden({ bootstrapResult, ...controller, shutdown });
}
