// @ts-check
/* global globalThis */

import fs from 'fs';
import process from 'process';
import { performance } from 'perf_hooks';
import { spawn as ambientSpawn } from 'child_process';
import { type as osType } from 'os';
import { Worker } from 'worker_threads';
import anylogger from 'anylogger';

import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@endo/import-bundle';
import { xsnap, recordXSnap } from '@agoric/xsnap';

import { createSHA256 } from './hasher.js';
import engineGC from './engine-gc.js';
import { WeakRef, FinalizationRegistry } from './weakref.js';
import { startSubprocessWorker } from './spawnSubprocessWorker.js';
import { waitUntilQuiescent } from './waitUntilQuiescent.js';
import { makeGcAndFinalize } from './gc-and-finalize.js';
import { insistStorageAPI } from './storageAPI.js';
import { insistCapData } from './capdata.js';
import { provideHostStorage } from './hostStorage.js';
import {
  swingsetIsInitialized,
  initializeSwingset,
} from './initializeSwingset.js';

/** @param {string} tag */
function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

/** @param {Error} e */
function unhandledRejectionHandler(e) {
  console.error('UnhandledPromiseRejectionWarning:', e);
}

/**
 * @param {{ moduleFormat: string, source: string }[]} bundles
 * @param {{
 *   snapStore?: SnapStore,
 *   spawn: typeof import('child_process').spawn
 *   env: Record<string, string | undefined>,
 * }} opts
 */
export function makeStartXSnap(bundles, { snapStore, env, spawn }) {
  /** @type { import('@agoric/xsnap/src/xsnap').XSnapOptions } */
  const xsnapOpts = {
    os: osType(),
    spawn,
    stdout: 'inherit',
    stderr: 'inherit',
    debug: !!env.XSNAP_DEBUG,
  };

  let doXSnap = xsnap;
  const { XSNAP_TEST_RECORD } = env;
  if (XSNAP_TEST_RECORD) {
    console.log('SwingSet xs-worker tracing:', { XSNAP_TEST_RECORD });
    let serial = 0;
    doXSnap = opts => {
      const workerTrace = `${XSNAP_TEST_RECORD}/${serial}/`;
      serial += 1;
      fs.mkdirSync(workerTrace, { recursive: true });
      return recordXSnap(opts, workerTrace, {
        writeFileSync: fs.writeFileSync,
      });
    };
  }

  /**
   * @param {string} name
   * @param {(request: Uint8Array) => Promise<Uint8Array>} handleCommand
   * @param { boolean } [metered]
   * @param { string } [snapshotHash]
   */
  async function startXSnap(
    name,
    handleCommand,
    metered,
    snapshotHash = undefined,
  ) {
    if (snapStore && snapshotHash) {
      // console.log('startXSnap from', { snapshotHash });
      return snapStore.load(snapshotHash, async snapshot => {
        const xs = doXSnap({ snapshot, name, handleCommand, ...xsnapOpts });
        await xs.isReady();
        return xs;
      });
    }
    // console.log('fresh xsnap', { snapStore: snapStore });
    const meterOpts = metered ? {} : { meteringLimit: 0 };
    const worker = doXSnap({ handleCommand, name, ...meterOpts, ...xsnapOpts });

    for (const bundle of bundles) {
      assert(
        bundle.moduleFormat === 'getExport',
        X`unexpected: ${bundle.moduleFormat}`,
      );
      // eslint-disable-next-line no-await-in-loop
      await worker.evaluate(`(${bundle.source}\n)()`.trim());
    }
    return worker;
  }
  return startXSnap;
}

/**
 *
 * @param {HostStore} hostStorage
 * @param {Record<string, unknown>} deviceEndowments
 * @param {{
 *   verbose?: boolean,
 *   debugPrefix?: string,
 *   slogCallbacks?: unknown,
 *   slogFile?: string,
 *   testTrackDecref?: unknown,
 *   warehousePolicy?: { maxVatsOnline?: number },
 *   overrideVatManagerOptions?: { consensusMode?: boolean },
 *   spawn?: typeof import('child_process').spawn,
 *   env?: Record<string, string | undefined>
 * }} runtimeOptions
 */
export async function makeSwingsetController(
  hostStorage = provideHostStorage(),
  deviceEndowments = {},
  runtimeOptions = {},
) {
  const kvStore = hostStorage.kvStore;
  insistStorageAPI(kvStore);

  // Use ambient process.env only if caller did not specify.
  const { env = process.env } = runtimeOptions;

  // build console early so we can add console.log to diagnose early problems
  const {
    verbose,
    debugPrefix = '',
    slogCallbacks,
    slogFile,
    spawn = ambientSpawn,
    warehousePolicy = {},
    overrideVatManagerOptions = {},
  } = runtimeOptions;
  if (typeof Compartment === 'undefined') {
    throw Error('SES must be installed before calling makeSwingsetController');
  }

  const slogF =
    slogFile && (await fs.createWriteStream(slogFile, { flags: 'a' })); // append

  function writeSlogObject(obj) {
    // TODO sqlite
    if (slogF) {
      const timeMS = performance.timeOrigin + performance.now();
      const time = timeMS / 1000;
      slogF.write(
        JSON.stringify({ time, ...obj }, (_, arg) =>
          typeof arg === 'bigint' ? Number(arg) : arg,
        ),
      );
      slogF.write('\n');
    }
  }

  // eslint-disable-next-line no-shadow
  const console = makeConsole(`${debugPrefix}SwingSet:controller`);
  // We can harden this 'console' because it's new, but if we were using the
  // original 'console' object (which has a unique prototype), we'd have to
  // harden(Object.getPrototypeOf(console));
  // see https://github.com/Agoric/SES-shim/issues/292 for details
  harden(console);

  // FIXME: Put this somewhere better.
  const handlers = process.listeners('unhandledRejection');
  let haveUnhandledRejectionHandler = false;
  for (const handler of handlers) {
    if (handler === unhandledRejectionHandler) {
      haveUnhandledRejectionHandler = true;
      break;
    }
  }
  if (!haveUnhandledRejectionHandler) {
    process.on('unhandledRejection', unhandledRejectionHandler);
  }

  function kernelRequire(what) {
    assert.fail(X`kernelRequire unprepared to satisfy require(${what})`);
  }
  // @ts-ignore assume kernelBundle is set
  const kernelBundle = JSON.parse(kvStore.get('kernelBundle'));
  writeSlogObject({ type: 'import-kernel-start' });
  const kernelNS = await importBundle(kernelBundle, {
    filePrefix: 'kernel/...',
    endowments: {
      console: makeConsole(`${debugPrefix}SwingSet:kernel`),
      assert,
      require: kernelRequire,
      URL: globalThis.Base64, // Unavailable only on XSnap
      Base64: globalThis.Base64, // Available only on XSnap
    },
  });
  const buildKernel = kernelNS.default;
  writeSlogObject({ type: 'import-kernel-finish' });

  // all vats get these in their global scope, plus a vat-specific 'console'
  const vatEndowments = harden({});

  // this launches a worker in a Node.js thread (aka "Worker")
  function makeNodeWorker() {
    const supercode = new URL(
      'kernel/vatManager/supervisor-nodeworker.js',
      import.meta.url,
    ).pathname;
    return new Worker(supercode);
  }

  // launch a worker in a subprocess (which runs Node.js)
  function startSubprocessWorkerNode() {
    const supercode = new URL(
      'kernel/vatManager/supervisor-subprocess-node.js',
      import.meta.url,
    ).pathname;
    const args = [supercode];
    return startSubprocessWorker(process.execPath, args);
  }

  const bundles = [
    // @ts-ignore assume lockdownBundle is set
    JSON.parse(kvStore.get('lockdownBundle')),
    // @ts-ignore assume supervisorBundle is set
    JSON.parse(kvStore.get('supervisorBundle')),
  ];
  const startXSnap = makeStartXSnap(bundles, {
    snapStore: hostStorage.snapStore,
    env,
    spawn,
  });

  const kernelEndowments = {
    waitUntilQuiescent,
    hostStorage,
    debugPrefix,
    vatEndowments,
    makeConsole,
    makeNodeWorker,
    startSubprocessWorkerNode,
    startXSnap,
    slogCallbacks,
    writeSlogObject,
    WeakRef,
    FinalizationRegistry,
    gcAndFinalize: makeGcAndFinalize(engineGC),
    createSHA256,
  };

  const kernelOptions = { verbose, warehousePolicy, overrideVatManagerOptions };
  /** @type { ReturnType<typeof import('./kernel').default> } */
  const kernel = buildKernel(kernelEndowments, deviceEndowments, kernelOptions);

  if (runtimeOptions.verbose) {
    kernel.kdebugEnable(true);
  }

  await kernel.start();

  /**
   * @param {T} x
   * @returns {T}
   * @template T
   */
  const defensiveCopy = x => JSON.parse(JSON.stringify(x));

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    log(str) {
      kernel.log(str);
    },

    writeSlogObject,

    dump() {
      return defensiveCopy(kernel.dump());
    },

    verboseDebugMode(flag) {
      kernel.kdebugEnable(flag);
    },

    async run(policy) {
      return kernel.run(policy);
    },

    async step() {
      return kernel.step();
    },

    async shutdown() {
      return kernel.shutdown();
    },

    getStats() {
      return defensiveCopy(kernel.getStats());
    },

    getStatus() {
      return defensiveCopy(kernel.getStatus());
    },

    getActivityhash() {
      return kernel.getActivityhash();
    },

    pinVatRoot(vatName) {
      const vatID = kernel.vatNameToID(vatName);
      const kref = kernel.getRootObject(vatID);
      kernel.pinObject(kref);
      return kref;
    },

    // these are for tests

    kpStatus(kpid) {
      return kernel.kpStatus(kpid);
    },

    kpResolution(kpid) {
      return kernel.kpResolution(kpid);
    },
    vatNameToID(vatName) {
      return kernel.vatNameToID(vatName);
    },
    deviceNameToID(deviceName) {
      return kernel.deviceNameToID(deviceName);
    },

    /**
     * @param {string} vatName
     * @param {string} method
     * @param {CapData<unknown>} args
     * @param {ResolutionPolicy} resultPolicy
     */
    queueToVatRoot(vatName, method, args, resultPolicy = 'ignore') {
      const vatID = kernel.vatNameToID(vatName);
      assert.typeof(method, 'string');
      insistCapData(args);
      const kref = kernel.getRootObject(vatID);
      const kpid = kernel.queueToKref(kref, method, args, resultPolicy);
      if (kpid) {
        kernel.kpRegisterInterest(kpid);
      }
      return kpid;
    },
  });

  return controller;
}

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
 * @param {{ hostStorage?: HostStore, env?: Record<string, string>, verbose?:
 *   boolean, kernelBundles?: Record<string, string>, debugPrefix?: string,
 *   slogCallbacks?: unknown, testTrackDecref?: unknown, warehousePolicy?: {
 *   maxVatsOnline?: number }, overrideVatManagerOptions?: { consensusMode?:
 *   boolean }, slogFile?: string, }} runtimeOptions
 * @typedef { import('@agoric/swing-store').KVStore } KVStore
 */
export async function buildVatController(
  config,
  argv = [],
  runtimeOptions = {},
) {
  const {
    hostStorage = provideHostStorage(),
    env,
    verbose,
    kernelBundles,
    debugPrefix,
    slogCallbacks,
    warehousePolicy,
    slogFile,
  } = runtimeOptions;
  const actualRuntimeOptions = {
    env,
    verbose,
    debugPrefix,
    slogCallbacks,
    warehousePolicy,
    slogFile,
  };
  const initializationOptions = { verbose, kernelBundles };
  let bootstrapResult;
  if (!swingsetIsInitialized(hostStorage)) {
    bootstrapResult = await initializeSwingset(
      config,
      argv,
      hostStorage,
      initializationOptions,
      runtimeOptions,
    );
  }
  const controller = await makeSwingsetController(
    hostStorage,
    {},
    actualRuntimeOptions,
  );
  return harden({ bootstrapResult, ...controller });
}
