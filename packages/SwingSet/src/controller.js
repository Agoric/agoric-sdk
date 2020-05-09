// eslint-disable-next-line no-redeclare
/* global setImmediate Compartment harden */
import fs from 'fs';
import path from 'path';
import { assert } from '@agoric/assert';

import makeDefaultEvaluateOptions from '@agoric/default-evaluate-options';
import bundleSource from '@agoric/bundle-source';
import { importBundle } from '@agoric/import-bundle';
import { initSwingStore } from '@agoric/swing-store-simple';
import {
  SES1ReplaceGlobalMeter,
  SES1TameMeteringShim,
} from '@agoric/tame-metering';

import { makeMeteringTransformer } from '@agoric/transform-metering';
import * as babelCore from '@babel/core';

import anylogger from 'anylogger';

import { waitUntilQuiescent } from './waitUntilQuiescent';
import { insistStorageAPI } from './storageAPI';
import { insistCapData } from './capdata';
import { parseVatSlot } from './parseVatSlots';
import { SES1MakeConsole } from './makeConsole';
import { SES1MakeNestedEvaluate } from './makeNestedEvaluate';

const log = anylogger('SwingSet:controller');

// FIXME: Put this somewhere better.
process.on('unhandledRejection', e =>
  log.error('UnhandledPromiseRejectionWarning:', e),
);

const ADMIN_DEVICE_PATH = require.resolve('./kernel/vatAdmin/vatAdmin-src');
const ADMIN_VAT_PATH = require.resolve('./kernel/vatAdmin/vatAdminWrapper');

function byName(a, b) {
  if (a.name < b.name) {
    return -1;
  }
  if (a.name > b.name) {
    return 1;
  }
  return 0;
}

/**
 * Scan a directory for files defining the vats to bootstrap for a swingset.
 * Looks for files with names of the pattern `vat-NAME.js` as well as a file
 * named 'bootstrap.js'.
 *
 * @param basedir  The directory to scan
 *
 * @return an object {
 *    vats, // map from NAME to the full path to the corresponding .js file
 *    bootstrapIndexJS, // path to the bootstrap.js file, or undefined if none
 * }
 *
 * TODO: bootstrapIndexJS is a terrible name.  Rename to something like
 * bootstrapSourcePath (renaming mildly complicated because it's referenced in
 * lots of places).
 */
export function loadBasedir(basedir) {
  log.debug(`= loading config from basedir ${basedir}`);
  const vats = new Map(); // name -> { sourcepath, options }
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
      vats.set(name, { sourcepath: vatSourcePath, options: {} });
    } else {
      log.debug('ignoring ', dirent.name);
    }
  });
  let bootstrapIndexJS = path.resolve(basedir, 'bootstrap.js');
  try {
    fs.statSync(bootstrapIndexJS);
  } catch (e) {
    // TODO this will catch the case of the file not existing but doesn't check
    // that it's a plain file and not a directory or something else unreadable.
    // Consider putting in a more sophisticated check if this whole directory
    // scanning thing is something we decide we want to have long term.
    bootstrapIndexJS = undefined;
  }
  return { vats, bootstrapIndexJS };
}

export async function buildVatController(config, withSES = true, argv = []) {
  if (!withSES) {
    throw Error('SES is now mandatory');
  }
  if (typeof Compartment === 'undefined') {
    throw Error('SES must be installed before calling buildVatController');
  }
  // todo: move argv into the config

  // once https://github.com/Agoric/SES-shim/issues/292 is fixed, this goes
  // away and we can just harden(console) and pass 'console' as an endowment
  const newConsole = harden({
    log(...args) { return console.log(...args); },
    debug(...args) { return console.debug(...args); },
    error(...args) { return console.error(...args); },
    info(...args) { return console.info(...args); },
    
  });
  harden(newConsole);

  function kernelRequire(what) {
    if (what === '@agoric/harden') {
      return harden;
    } else {
      throw Error(`kernelRequire unprepared to satisfy require(${what})`);
    }
  }
  const kernelSource = await bundleSource('./src/kernel/kernel.js', 'nestedEvaluate');
  const kernelNS = await importBundle(kernelSource,
                                      { filePrefix: 'kernel',
                                        endowments: {
                                          console: newConsole,
                                          require: kernelRequire,
                                        },
                                      });
  const buildKernel = kernelNS.default;

  function vatRequire(what) {
    if (what === '@agoric/harden') {
      return harden;
    } else {
      throw Error(`vatRequire unprepared to satisfy require(${what})`);
    }
  }

  async function loadStaticVat(sourceIndex, name) {
    if (!(sourceIndex[0] === '.' || path.isAbsolute(sourceIndex))) {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }
    const bundle = await bundleSource(sourceIndex, 'nestedEvaluate');
    const vatNS = await importBundle(bundle,
                                     { filePrefix: name,
                                       endowments: {
                                         console: newConsole,
                                         require: vatRequire,
                                       },
                                     });
    const setup = vatNS.default;
    return setup;
  }

  const hostStorage = config.hostStorage || initSwingStore().storage;
  insistStorageAPI(hostStorage);
  const kernelEndowments = {
    waitUntilQuiescent,
    hostStorage,
    runEndOfCrank: () => 0, // not implemented
    vatAdminDevSetup: await loadStaticVat(ADMIN_DEVICE_PATH, 'dev-vatAdmin'),
    vatAdminVatSetup: await loadStaticVat(ADMIN_VAT_PATH, 'vat-vatAdmin'),
  };

  const kernel = buildKernel(kernelEndowments);

  if (config.verbose) {
    kernel.kdebugEnable(true);
  }

  async function addGenesisVat(name, sourceIndex, options = {}) {
    log.debug(`= adding vat '${name}' from ${sourceIndex}`);
    const setup = await loadStaticVat(sourceIndex, `vat-${name}`);
    kernel.addGenesisVat(name, setup, options);
  }

  async function addGenesisDevice(name, sourceIndex, endowments) {
    const setup = await loadStaticVat(sourceIndex, `dev-${name}`);
    kernel.addGenesisDevice(name, setup, endowments);
  }

  if (config.devices) {
    for (const [name, srcpath, endowments] of config.devices) {
      // eslint-disable-next-line no-await-in-loop
      await addGenesisDevice(name, srcpath, endowments);
    }
  }

  if (config.vats) {
    for (const name of config.vats.keys()) {
      const v = config.vats.get(name);
      // eslint-disable-next-line no-await-in-loop
      await addGenesisVat(name, v.sourcepath, v.options || {});
    }
  }

  let bootstrapVatName;
  if (config.bootstrapIndexJS) {
    bootstrapVatName = '_bootstrap';
    await addGenesisVat(bootstrapVatName, config.bootstrapIndexJS, {});
  }

  // start() may queue bootstrap if state doesn't say we did it already. It
  // also replays the transcripts from a previous run, if any, which will
  // execute vat code (but all syscalls will be disabled)
  await kernel.start(bootstrapVatName, JSON.stringify(argv));

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

    // these are for tests

    vatNameToID(vatName) {
      return kernel.vatNameToID(vatName);
    },
    deviceNameToID(deviceName) {
      return kernel.deviceNameToID(deviceName);
    },

    queueToVatExport(vatName, exportID, method, args) {
      const vatID = kernel.vatNameToID(vatName);
      parseVatSlot(exportID);
      assert.typeof(method, 'string');
      insistCapData(args);
      kernel.addExport(vatID, exportID);
      kernel.queueToExport(vatID, exportID, method, args);
    },
  });

  return controller;
}
