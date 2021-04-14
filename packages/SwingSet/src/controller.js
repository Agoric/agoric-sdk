/* global require */
import fs from 'fs';
import path from 'path';
import process from 'process';
import re2 from 're2';
import { performance } from 'perf_hooks';
import { spawn } from 'child_process';
import { type as osType } from 'os';
import { Worker } from 'worker_threads';
import * as babelCore from '@babel/core';
import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';
import anylogger from 'anylogger';
import { tmpName } from 'tmp';

import { assert, details as X } from '@agoric/assert';
import { isTamed, tameMetering } from '@agoric/tame-metering';
import { importBundle } from '@agoric/import-bundle';
import { initSwingStore } from '@agoric/swing-store-simple';
import { makeMeteringTransformer } from '@agoric/transform-metering';
import { makeTransform } from '@agoric/transform-eventual-send';
import { xsnap, makeSnapstore } from '@agoric/xsnap';

import { WeakRef, FinalizationRegistry } from './weakref';
import { startSubprocessWorker } from './spawnSubprocessWorker';
import { waitUntilQuiescent } from './waitUntilQuiescent';
import { insistStorageAPI } from './storageAPI';
import { insistCapData } from './capdata';
import { parseVatSlot } from './parseVatSlots';
import {
  swingsetIsInitialized,
  initializeSwingset,
} from './initializeSwingset';

function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

function unhandledRejectionHandler(e) {
  console.error('UnhandledPromiseRejectionWarning:', e);
}

export function makeStartXSnap(bundles, { snapstorePath, env }) {
  const xsnapOpts = {
    os: osType(),
    spawn,
    stdout: 'inherit',
    stderr: 'inherit',
    debug: !!env.XSNAP_DEBUG,
  };

  let snapStore;

  if (snapstorePath) {
    fs.mkdirSync(snapstorePath, { recursive: true });

    snapStore = makeSnapstore(snapstorePath, {
      tmpName,
      existsSync: fs.existsSync,
      createReadStream: fs.createReadStream,
      createWriteStream: fs.createWriteStream,
      rename: fs.promises.rename,
      unlink: fs.promises.unlink,
      resolve: path.resolve,
    });
  }

  let supervisorHash = '';
  return async function startXSnap(name, handleCommand) {
    if (supervisorHash) {
      return snapStore.load(supervisorHash, async snapshot => {
        const xs = xsnap({ snapshot, name, handleCommand, ...xsnapOpts });
        await xs.evaluate('null'); // ensure that spawn is done
        return xs;
      });
    }
    const worker = xsnap({ handleCommand, name, ...xsnapOpts });

    for (const bundle of bundles) {
      assert(
        bundle.moduleFormat === 'getExport',
        X`unexpected: ${bundle.moduleFormat}`,
      );
      // eslint-disable-next-line no-await-in-loop
      await worker.evaluate(`(${bundle.source}\n)()`.trim());
    }
    if (snapStore) {
      supervisorHash = await snapStore.save(async fn => worker.snapshot(fn));
    }
    return worker;
  };
}

export async function makeSwingsetController(
  hostStorage = initSwingStore().storage,
  deviceEndowments = {},
  runtimeOptions = {},
) {
  insistStorageAPI(hostStorage);

  // Use ambient process.env only if caller did not specify.
  const { env = process.env } = runtimeOptions;

  // build console early so we can add console.log to diagnose early problems
  const {
    verbose,
    debugPrefix = '',
    slogCallbacks,
    slogFile,
    testTrackDecref,
    snapstorePath,
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
    if (what === 're2') {
      // The kernel imports @agoric/transform-metering to get makeMeter(),
      // and transform-metering imports re2, to add it to the generated
      // endowments. TODO Our transformers no longer traffic in endowments,
      // so that could probably be removed, in which case we'd no longer need
      // to provide it here. We should decide whether to let the kernel use
      // the native RegExp or replace it with re2. TODO we also need to make
      // sure vats get (and stick with) re2 for their 'RegExp'.
      return re2;
    } else {
      assert.fail(X`kernelRequire unprepared to satisfy require(${what})`);
    }
  }
  const kernelBundle = JSON.parse(hostStorage.get('kernelBundle'));
  writeSlogObject({ type: 'import-kernel-start' });
  const kernelNS = await importBundle(kernelBundle, {
    filePrefix: 'kernel/...',
    endowments: {
      console: makeConsole(`${debugPrefix}SwingSet:kernel`),
      assert,
      require: kernelRequire,
    },
  });
  const buildKernel = kernelNS.default;
  writeSlogObject({ type: 'import-kernel-finish' });

  // transformMetering() requires Babel, which imports 'fs' and 'path', so it
  // cannot be implemented within a non-start-Compartment. We build it out
  // here and pass it to the kernel, which then passes it to vats. This is
  // intended to be powerless. TODO: when we remove metering within vats
  // (leaving only vat-at-a-time metering), this function should only be used
  // to build loadStaticVat and loadDynamicVat. It may still be passed to the
  // kernel (for loadDynamicVat), but it should no longer be passed into the
  // vats themselves. TODO: transformMetering() is sync because it is passed
  // into c.evaluate (which of course cannot handle async), but in the
  // future, this may live on the far side of a kernel/vatworker boundary, so
  // we kind of want it to be async.
  const mt = makeMeteringTransformer(babelCore);
  function transformMetering(src, getMeter) {
    // 'getMeter' provides the meter to which the transformation itself is
    // billed (the COMPUTE meter is charged the length of the source string).
    // The endowment must be present and truthy, otherwise the transformation
    // is disabled. TODO: rethink that, and have @agoric/transform-metering
    // export a simpler function (without 'endowments' or .rewrite).
    const ss = mt.rewrite({ src, endowments: { getMeter } });
    return ss.src;
  }
  harden(transformMetering);

  // the same is true for the tildot transform
  const transformTildot = harden(makeTransform(babelParser, babelGenerate));

  // all vats get these in their global scope, plus a vat-specific 'console'
  const vatEndowments = harden({
    // re2 is a RegExp work-a-like that disables backtracking expressions for
    // safer memory consumption
    RegExp: re2,
  });

  // It is important that tameMetering() was called by application startup,
  // before install-ses. Rather than ask applications to capture the return
  // value and pass it all the way through to here, we just run
  // tameMetering() again (and rely upon its only-once behavior) to get the
  // control facet (replaceGlobalMeter), and pass it in through
  // kernelEndowments. If our enclosing application decided to not tame the
  // globals, we detect that and refrain from touching it later.
  const replaceGlobalMeter = isTamed() ? tameMetering() : undefined;
  if (verbose) {
    console.log(
      `SwingSet global metering is ${
        isTamed() ? 'enabled' : 'disabled (no replaceGlobalMeter)'
      }`,
    );
  }

  // this launches a worker in a Node.js thread (aka "Worker")
  function makeNodeWorker() {
    // TODO: after we move away from `-r esm` and use real ES6 modules, point
    // this at nodeWorkerSupervisor.js instead of the CJS intermediate
    const supercode = require.resolve(
      './kernel/vatManager/supervisor-nodeworker-cjs.js',
    );
    return new Worker(supercode);
  }

  // launch a worker in a subprocess (which runs Node.js)
  function startSubprocessWorkerNode() {
    const supercode = require.resolve(
      './kernel/vatManager/supervisor-subprocess-node.js',
    );
    return startSubprocessWorker(process.execPath, ['-r', 'esm', supercode]);
  }

  const bundles = [
    JSON.parse(hostStorage.get('lockdownBundle')),
    JSON.parse(hostStorage.get('supervisorBundle')),
  ];
  const startXSnap = makeStartXSnap(bundles, { snapstorePath, env });

  const kernelEndowments = {
    waitUntilQuiescent,
    hostStorage,
    debugPrefix,
    vatEndowments,
    makeConsole,
    replaceGlobalMeter,
    transformMetering,
    transformTildot,
    makeNodeWorker,
    startSubprocessWorkerNode,
    startXSnap,
    slogCallbacks,
    writeSlogObject,
    WeakRef,
    FinalizationRegistry,
  };

  const kernelOptions = { verbose, testTrackDecref };
  const kernel = buildKernel(kernelEndowments, deviceEndowments, kernelOptions);

  if (runtimeOptions.verbose) {
    kernel.kdebugEnable(true);
  }

  await kernel.start();

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    log(str) {
      kernel.log(str);
    },

    dump() {
      return JSON.parse(JSON.stringify(kernel.dump()));
    },

    verboseDebugMode(flag) {
      kernel.kdebugEnable(flag);
    },

    async run() {
      return kernel.run();
    },

    async step() {
      return kernel.step();
    },

    async shutdown() {
      return kernel.shutdown();
    },

    getStats() {
      return JSON.parse(JSON.stringify(kernel.getStats()));
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

    queueToVatExport(vatName, exportID, method, args, resultPolicy = 'ignore') {
      const vatID = kernel.vatNameToID(vatName);
      parseVatSlot(exportID);
      assert.typeof(method, 'string');
      insistCapData(args);
      kernel.addExport(vatID, exportID);
      const kpid = kernel.queueToExport(
        vatID,
        exportID,
        method,
        args,
        resultPolicy,
      );
      kernel.kpRegisterInterest(kpid);
      return kpid;
    },
  });

  return controller;
}

// TODO: This is a shim provided strictly for backwards compatibility and should
// be removed once API changes are propagated everywhere.  Note that this shim
// will not work for use cases that need to configure devices.  It could be made
// to, but I've already changed all the places that do that to use the new API
// and I don't want to encourage people to use the old API.
export async function buildVatController(
  config,
  argv = [],
  runtimeOptions = {},
) {
  const {
    hostStorage = initSwingStore().storage,
    verbose,
    kernelBundles,
    debugPrefix,
    slogCallbacks,
    testTrackDecref,
    snapstorePath,
  } = runtimeOptions;
  const actualRuntimeOptions = {
    verbose,
    debugPrefix,
    testTrackDecref,
    slogCallbacks,
    snapstorePath,
  };
  const initializationOptions = { verbose, kernelBundles };
  let bootstrapResult;
  if (!swingsetIsInitialized(hostStorage)) {
    bootstrapResult = await initializeSwingset(
      config,
      argv,
      hostStorage,
      initializationOptions,
    );
  }
  const controller = await makeSwingsetController(
    hostStorage,
    {},
    actualRuntimeOptions,
  );
  return harden({ bootstrapResult, ...controller });
}
