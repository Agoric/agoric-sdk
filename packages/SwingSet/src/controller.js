/* global Compartment */

import fs from 'fs';
import path from 'path';
import process from 'process';
import re2 from 're2';
import { Worker } from 'worker_threads';
import * as babelCore from '@babel/core';
import * as babelParser from '@agoric/babel-parser';
import babelGenerate from '@babel/generator';
import anylogger from 'anylogger';

import { assert } from '@agoric/assert';
import { isTamed, tameMetering } from '@agoric/tame-metering';
import bundleSource from '@agoric/bundle-source';
import { importBundle } from '@agoric/import-bundle';
import { initSwingStore } from '@agoric/swing-store-simple';
import { makeMeteringTransformer } from '@agoric/transform-metering';
import { makeTransform } from '@agoric/transform-eventual-send';
import { locateWorkerBin } from '@agoric/xs-vat-worker';

import { startSubprocessWorker } from './spawnSubprocessWorker';
import { assertKnownOptions } from './assertOptions';
import { waitUntilQuiescent } from './waitUntilQuiescent';
import { insistStorageAPI } from './storageAPI';
import { insistCapData } from './capdata';
import { parseVatSlot } from './parseVatSlots';

function makeConsole(tag) {
  const log = anylogger(tag);
  const cons = {};
  for (const level of ['debug', 'log', 'info', 'warn', 'error']) {
    cons[level] = log[level];
  }
  return harden(cons);
}

function byName(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

const KNOWN_CREATION_OPTIONS = harden([
  'enablePipelining',
  'metered',
  'enableSetup',
  'managerType',
]);

/**
 * @typedef {Object} SwingSetConfigProperties
 * @property {string} [sourceSpec] path to the source code
 * @property {string} [bundleSpec]
 * @property {Record<string, any>} [parameters]
 */

/**
 * @typedef {Record<string, SwingSetConfigProperties>} SwingSetConfigDescriptor
 * Where the property name is the name of the vat.  Note that
 * the `bootstrap` property names the vat that should be used as the bootstrap vat.  Although a swingset
 * configuration can designate any vat as its bootstrap vat, `loadBasedir` will always look for a file named
 * 'bootstrap.js' and use that (note that if there is no 'bootstrap.js', there will be no bootstrap vat).
 */

/**
 * @typedef {Object} SwingSetConfig a swingset config object
 * @property {string} bootstrap
 * @property {SwingSetConfigDescriptor} [vats]
 * @property {SwingSetConfigDescriptor} [bundles]
 * @property {*} [devices]
 *
 * Swingsets defined by scanning a directory in this manner define no devices.
 */

/**
 * Scan a directory for files defining the vats to bootstrap for a swingset, and
 * produce a swingset config object for what was found there.  Looks for files
 * with names of the pattern `vat-NAME.js` as well as a file named
 * 'bootstrap.js'.
 *
 * @param {string} basedir  The directory to scan
 * @returns {SwingSetConfig} a swingset config object: {
 *   bootstrap: "bootstrap",
 *   vats: {
 *     NAME: {
 *       sourceSpec: PATHSTRING
 *     }
 *   }
 * }
 */
export function loadBasedir(basedir) {
  const vats = {};
  const subs = fs.readdirSync(basedir, { withFileTypes: true });
  subs.sort(byName);
  subs.forEach(dirent => {
    if (dirent.name.endsWith('~')) {
      // Special case crap filter to ignore emacs backup files and the like.
      // Note that the regular filename parsing below will ignore such files
      // anyway, but this skips logging them so as to reduce log spam.
      return;
    }
    if (
      dirent.name.startsWith('vat-') &&
      dirent.isFile() &&
      dirent.name.endsWith('.js')
    ) {
      const name = dirent.name.slice('vat-'.length, -'.js'.length);
      const vatSourcePath = path.resolve(basedir, dirent.name);
      vats[name] = { sourceSpec: vatSourcePath, parameters: {} };
    }
  });
  let bootstrapPath = path.resolve(basedir, 'bootstrap.js');
  try {
    fs.statSync(bootstrapPath);
  } catch (e) {
    // TODO this will catch the case of the file not existing but doesn't check
    // that it's a plain file and not a directory or something else unreadable.
    // Consider putting in a more sophisticated check if this whole directory
    // scanning thing is something we decide we want to have long term.
    bootstrapPath = undefined;
  }
  const config = { vats };
  if (bootstrapPath) {
    vats.bootstrap = {
      sourceSpec: bootstrapPath,
      parameters: {},
    };
    config.bootstrap = 'bootstrap';
  }
  return config;
}

/**
 * Resolve a pathname found in a config descriptor.  First try to resolve it as
 * a module path, and then if that doesn't work try to resolve it as an
 * ordinary path relative to the directory in which the config file was found.
 *
 * @param {string} dirname  Path to directory containing the config file
 * @param {string} specPath  Path found in a `sourceSpec` or `bundleSpec` property
 *
 * @returns {string} the absolute path corresponding to `specPath` if it can be
 *    determined.
 */
function resolveSpecFromConfig(dirname, specPath) {
  try {
    return require.resolve(specPath, { path: [dirname] });
  } catch (e) {
    if (e.code !== 'MODULE_NOT_FOUND') {
      throw e;
    }
  }
  return path.resolve(dirname, specPath);
}

/**
 * For each entry in a config descriptor (i.e, `vats`, `bundles`, etc), convert
 * it to normal form: resolve each pathname to a context-insensitive absolute
 * path and make sure it has a `parameters` property if it's supposed to.
 *
 * @param {SwingSetConfigDescriptor} desc  The config descriptor to be normalized.
 * @param {string} dirname  The pathname of the directory in which the config file was found
 * @param {boolean} expectParameters `true` if the entries should have parameters (for
 *    example, `true` for `vats` but `false` for bundles).
 */
function normalizeConfigDescriptor(desc, dirname, expectParameters) {
  if (desc) {
    for (const name of Object.keys(desc)) {
      const entry = desc[name];
      if (entry.sourceSpec) {
        entry.sourceSpec = resolveSpecFromConfig(dirname, entry.sourceSpec);
      }
      if (entry.bundleSpec) {
        entry.bundleSpec = resolveSpecFromConfig(dirname, entry.bundleSpec);
      }
      if (expectParameters && !entry.parameters) {
        entry.parameters = {};
      }
    }
  }
}

/**
 * Read and parse a swingset config file and return it in normalized form.
 *
 * @param {string} configPath  Path to the config file to be processed
 *
 * @returns {SwingSetConfig} the contained config object, in normalized form, or null if the
 *    requested config file did not exist.
 *
 * @throws {Error} if the file existed but was inaccessible, malformed, or otherwise
 *    invalid.
 */
export function loadSwingsetConfigFile(configPath) {
  try {
    const config = JSON.parse(fs.readFileSync(configPath));
    const dirname = path.dirname(configPath);
    normalizeConfigDescriptor(config.vats, dirname, true);
    normalizeConfigDescriptor(config.bundles, dirname, false);
    // normalizeConfigDescriptor(config.devices, dirname, true); // TODO: represent devices
    if (!config.bootstrap) {
      throw Error(`no designated bootstrap vat in ${configPath}`);
    } else if (!config.vats[config.bootstrap]) {
      throw Error(
        `bootstrap vat ${config.bootstrap} not found in ${configPath}`,
      );
    }
    return config;
  } catch (e) {
    if (e.code === 'ENOENT') {
      return null;
    } else {
      throw e;
    }
  }
}

/**
 * Build the kernel source bundles.
 *
 */
export async function buildKernelBundles() {
  // this takes 2.7s on my computer
  const sources = {
    kernel: require.resolve('./kernel/kernel.js'),
    adminDevice: require.resolve('./kernel/vatAdmin/vatAdmin-src'),
    adminVat: require.resolve('./kernel/vatAdmin/vatAdminWrapper'),
    comms: require.resolve('./vats/comms'),
    vattp: require.resolve('./vats/vat-tp'),
    timer: require.resolve('./vats/vat-timerWrapper'),
  };
  const kernelBundles = {};
  for (const name of Object.keys(sources)) {
    // this was harder to read with Promise.all
    // eslint-disable-next-line no-await-in-loop
    kernelBundles[name] = await bundleSource(sources[name]);
  }
  return harden(kernelBundles);
}

export async function buildVatController(
  config,
  argv = [],
  runtimeOptions = {},
) {
  // build console early so we can add console.log to diagnose early problems
  const { debugPrefix = '' } = runtimeOptions;
  if (typeof Compartment === 'undefined') {
    throw Error('SES must be installed before calling buildVatController');
  }

  // eslint-disable-next-line no-shadow
  const console = makeConsole(`${debugPrefix}SwingSet:controller`);
  // We can harden this 'console' because it's new, but if we were using the
  // original 'console' object (which has a unique prototype), we'd have to
  // harden(Object.getPrototypeOf(console));
  // see https://github.com/Agoric/SES-shim/issues/292 for details
  harden(console);

  const {
    verbose = false,
    kernelBundles = await buildKernelBundles(),
  } = runtimeOptions;

  // FIXME: Put this somewhere better.
  process.on('unhandledRejection', e =>
    console.error('UnhandledPromiseRejectionWarning:', e),
  );

  if (config.bootstrap && argv) {
    // move 'argv' into parameters on the bootstrap vat, without changing the
    // original config (which might be hardened or shared)
    const bootstrapName = config.bootstrap;
    const parameters = { ...config.vats[bootstrapName].parameters, argv };
    const bootstrapVat = { ...config.vats[bootstrapName], parameters };
    const vats = { ...config.vats, [bootstrapName]: bootstrapVat };
    config = { ...config, vats };
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
      throw Error(`kernelRequire unprepared to satisfy require(${what})`);
    }
  }
  const kernelNS = await importBundle(kernelBundles.kernel, {
    filePrefix: 'kernel',
    endowments: {
      console: makeConsole(`${debugPrefix}SwingSet:kernel`),
      require: kernelRequire,
    },
  });
  const buildKernel = kernelNS.default;

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

  const hostStorage = runtimeOptions.hostStorage || initSwingStore().storage;
  insistStorageAPI(hostStorage);

  // It is important that tameMetering() was called by application startup,
  // before install-ses. Rather than ask applications to capture the return
  // value and pass it all the way through to here, we just run
  // tameMetering() again (and rely upon its only-once behavior) to get the
  // control facet (replaceGlobalMeter), and pass it in through
  // kernelEndowments. If our enclosing application decided to not tame the
  // globals, we detect that and refrain from touching it later.
  const replaceGlobalMeter = isTamed() ? tameMetering() : undefined;
  console.log(
    `SwingSet global metering is ${
      isTamed() ? 'enabled' : 'disabled (no replaceGlobalMeter)'
    }`,
  );

  // this launches a worker in a Node.js thread (aka "Worker")
  function makeNodeWorker() {
    // TODO: after we move away from `-r esm` and use real ES6 modules, point
    // this at nodeWorkerSupervisor.js instead of the CJS intermediate
    const supercode = require.resolve(
      './kernel/vatManager/nodeWorkerSupervisorCJS.js',
    );
    return new Worker(supercode);
  }

  // launch a worker in a subprocess (which runs Node.js)
  function startSubprocessWorkerNode() {
    const supercode = require.resolve(
      './kernel/vatManager/subprocessSupervisor.js',
    );
    return startSubprocessWorker(process.execPath, ['-r', 'esm', supercode]);
  }

  let startSubprocessWorkerXS;
  const xsWorkerBin = locateWorkerBin({ resolve: path.resolve });
  if (fs.existsSync(xsWorkerBin)) {
    startSubprocessWorkerXS = () => startSubprocessWorker(xsWorkerBin);
  }

  function writeSlogObject(_obj) {
    // TODO sqlite
    // console.log(`--slog ${JSON.stringify(obj)}`);
  }

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
    startSubprocessWorkerXS,
    writeSlogObject,
  };

  const kernelOptions = { verbose };
  const kernel = buildKernel(kernelEndowments, kernelOptions);

  if (runtimeOptions.verbose) {
    kernel.kdebugEnable(true);
  }

  // the vatAdminDevice is given endowments by the kernel itself
  kernel.addGenesisVat('vatAdmin', kernelBundles.adminVat);
  kernel.addVatAdminDevice(kernelBundles.adminDevice);

  // comms vat is added automatically, but TODO: bootstraps must still
  // connect it to vat-tp. TODO: test-message-patterns builds two comms and
  // two vattps, must handle somehow.
  kernel.addGenesisVat(
    'comms',
    kernelBundles.comms,
    {},
    {
      enablePipelining: true,
      enableSetup: true,
    },
  );

  // vat-tp is added automatically, but TODO: bootstraps must still connect
  // it to comms
  kernel.addGenesisVat('vattp', kernelBundles.vattp);

  // timer wrapper vat is added automatically, but TODO: bootstraps must
  // still provide a timer device, and connect it to the wrapper vat
  kernel.addGenesisVat('timer', kernelBundles.timer);

  function addGenesisVat(
    name,
    bundleName,
    vatParameters = {},
    creationOptions = {},
  ) {
    if (verbose) {
      console.debug(`= adding vat '${name}' from bundle ${bundleName}`);
    }
    const bundle = kernel.getBundle(bundleName);
    kernel.addGenesisVat(name, bundle, vatParameters, creationOptions);
  }

  async function addGenesisDevice(name, sourcePath, endowments) {
    const bundle = await bundleSource(sourcePath);
    kernel.addGenesisDevice(name, bundle, endowments);
  }

  function validateBundleDescriptor(desc, groupName, descName) {
    if (desc.bundleHash) {
      throw Error(
        `config ${groupName}.${descName}: "bundleHash" is not yet supported for specifying bundles`,
      );
    }
    let count = 0;
    if (desc.bundleName) {
      if (groupName === 'bundles') {
        throw Error(
          `config bundles.${descName}: "bundleName" is only available in vat or device descriptors`,
        );
      } else if (!kernel.hasBundle(desc.bundleName)) {
        throw Error(
          `config ${groupName}.${descName}: bundle ${desc.bundleName} is undefined`,
        );
      }
      count += 1;
    }
    if (desc.sourceSpec) {
      count += 1;
    }
    if (desc.bundleSpec) {
      count += 1;
    }
    if (desc.bundle) {
      count += 1;
    }
    if (count > 1) {
      throw Error(
        `config ${groupName}.${descName}: "bundleName", "bundle", "bundleSpec", and "sourceSpec" are mutually exclusive`,
      );
    } else if (count === 0) {
      throw Error(
        `config ${groupName}.${descName}: you must specify one of: "bundleName", "bundle", "bundleSpec", or "sourceSpec"`,
      );
    }
    if (kernel.hasBundle(descName) && !desc.bundleName) {
      throw Error(`config ${groupName}: bundle ${descName} multiply defined`);
    }
  }

  async function bundleBundles(group, groupName) {
    if (group) {
      const names = [];
      const presumptiveBundles = [];
      for (const name of Object.keys(group)) {
        const desc = group[name];
        validateBundleDescriptor(desc, groupName, name);
        if (!desc.bundleName) {
          names.push(name);
          if (desc.sourceSpec) {
            presumptiveBundles.push(bundleSource(desc.sourceSpec));
          } else if (desc.bundleSpec) {
            presumptiveBundles.push(fs.readFileSync(desc.bundleSpec));
          } else if (desc.bundle) {
            presumptiveBundles.push(desc.bundle);
          } else {
            assert.fail(`this can't happen`);
          }
        }
      }
      const actualBundles = await Promise.all(presumptiveBundles);
      for (let i = 0; i < names.length; i += 1) {
        kernel.addBundle(names[i], actualBundles[i]);
      }
    }
  }

  await bundleBundles(config.bundles, 'bundles');
  await bundleBundles(config.vats, 'vats');
  // await bundleBundles(config.devices, 'devices'); // TODO: refactor device config

  if (config.devices) {
    const devices = [];
    for (const [name, srcpath, endowments] of config.devices) {
      devices.push(addGenesisDevice(name, srcpath, endowments));
    }
    await Promise.all(devices);
  }

  if (config.vats) {
    for (const name of Object.keys(config.vats)) {
      const { bundleName, parameters, creationOptions = {} } = config.vats[
        name
      ];
      assertKnownOptions(creationOptions, KNOWN_CREATION_OPTIONS);
      addGenesisVat(name, bundleName || name, parameters, creationOptions);
    }
  }

  // start() may queue bootstrap if state doesn't say we did it already. It
  // also replays the transcripts from a previous run, if any, which will
  // execute vat code (but all syscalls will be disabled)
  const bootstrapResult = await kernel.start(config.bootstrap);

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
      return kernel.queueToExport(vatID, exportID, method, args, resultPolicy);
    },

    bootstrapResult,
  });

  return controller;
}
