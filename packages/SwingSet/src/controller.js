// eslint-disable-next-line no-redeclare
/* global setImmediate */
import fs from 'fs';
import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';
import { assert } from '@agoric/assert';

import makeDefaultEvaluateOptions from '@agoric/default-evaluate-options';
import bundleSource from '@agoric/bundle-source';
import { makeMemorySwingStore } from '@agoric/swing-store-simple';
import {
  SES1ReplaceGlobalMeter,
  SES1TameMeteringShim,
} from '@agoric/tame-metering';

// eslint-disable-next-line import/extensions
import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import { insistStorageAPI } from './storageAPI';
import { insistCapData } from './capdata';
import { parseVatSlot } from './parseVatSlots';

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
  console.log(`= loading config from basedir ${basedir}`);
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
      console.log('ignoring ', dirent.name);
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

function getKernelSource() {
  return `(${kernelSourceFunc})`;
}

// this feeds the SES realm's (real/safe) confine*() back into the Realm
// when it does require('@agoric/evaluate'), so we can get the same
// functionality both with and without SES
// To support makeEvaluators, we create a new Compartment.
function makeEvaluate(e) {
  const { makeCompartment, rootOptions, confine, confineExpr } = e;
  const makeEvaluators = (realmOptions = {}) => {
    // Realm transforms need to be vetted by global transforms.
    const transforms = (realmOptions.transforms || []).concat(
      rootOptions.transforms || [],
    );

    const c = makeCompartment({
      ...rootOptions,
      ...realmOptions,
      transforms,
    });
    transforms.forEach(t => t.closeOverSES && t.closeOverSES(c));
    return {
      evaluateExpr(source, endowments = {}, options = {}) {
        return c.evaluate(`(${source}\n)`, endowments, options);
      },
      evaluateProgram(source, endowments = {}, options = {}) {
        return c.evaluate(`${source}`, endowments, options);
      },
    };
  };

  // As an optimization, do not create a new compartment unless
  // they call makeEvaluators explicitly.
  const evaluateExpr = (source, endowments = {}, options = {}) =>
    confineExpr(source, endowments, options);
  const evaluateProgram = (source, endowments = {}, options = {}) =>
    confine(source, endowments, options);
  return Object.assign(evaluateExpr, {
    evaluateExpr,
    evaluateProgram,
    makeEvaluators,
  });
}

function makeSESEvaluator() {
  const evaluateOptions = makeDefaultEvaluateOptions();
  const { transforms, shims = [], ...otherOptions } = evaluateOptions;
  const s = SES.makeSESRootRealm({
    ...otherOptions,
    transforms,
    consoleMode: 'allow',
    errorStackMode: 'allow',
    shims: [SES1TameMeteringShim, ...shims],
    configurableGlobals: true,
  });
  const replaceGlobalMeter = SES1ReplaceGlobalMeter(s);
  transforms.forEach(t => {
    t.closeOverSES && t.closeOverSES(s);
  });

  // TODO: if the 'require' we provide here supplies a non-pure module,
  // that could open a communication channel between otherwise isolated
  // Vats. For now that's just harden and Nat, but others might get added
  // in the future, so pay attention to what we allow in. We could build
  // a new makeRequire for each Vat, but 1: performance and 2: the same
  // comms problem exists between otherwise-isolated code within a single
  // Vat so it doesn't really help anyways
  const r = s.makeRequire({
    '@agoric/evaluate': {
      attenuatorSource: `${makeEvaluate}`,
      confine: s.global.SES.confine,
      confineExpr: s.global.SES.confineExpr,
      rootOptions: evaluateOptions,
      makeCompartment: (...args) => {
        const c = s.global.Realm.makeCompartment(...args);
        // FIXME: This call should be unnecessary.
        // We currently need it because fresh Compartments
        // do not inherit the configured stable globals.
        Object.defineProperties(
          c.global,
          Object.getOwnPropertyDescriptors(s.global),
        );
        return c;
      },
    },
    '@agoric/harden': true,
    '@agoric/nat': Nat,
  });
  return src => {
    // FIXME: Note that this replaceGlobalMeter endowment is not any
    // worse than before metering existed.  However, it probably is
    // only necessary to be added to the kernel, rather than all
    // static vats once we add metering support to the dynamic vat
    // implementation.
    return s.evaluate(src, { require: r, replaceGlobalMeter })().default;
  };
}

function buildSESKernel(sesEvaluator, endowments) {
  const kernelSource = getKernelSource();
  const buildKernel = sesEvaluator(kernelSource);
  return buildKernel(endowments);
}

function buildNonSESKernel(endowments) {
  // Evaluate shims to produce desired globals.
  const evaluateOptions = makeDefaultEvaluateOptions();
  // eslint-disable-next-line no-eval
  (evaluateOptions.shims || []).forEach(shim => (1, eval)(shim));

  return buildKernelNonSES(endowments);
}

export async function buildVatController(config, withSES = true, argv = []) {
  // todo: move argv into the config

  // sesEvaluator is only valid when withSES === true. It might be nice to
  // untangle this so we don't have to check withSES in three different places.
  let sesEvaluator;
  if (withSES) {
    sesEvaluator = makeSESEvaluator();
  }

  // Evaluate source to produce a setup function. This binds withSES from the
  // enclosing context and evaluates it either in a SES context, or without SES
  // by directly calling require().
  async function evaluateToSetup(sourceIndex) {
    if (!(sourceIndex[0] === '.' || path.isAbsolute(sourceIndex))) {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }

    // we load the sourceIndex (and everything it imports), and expect to get
    // two symbols from each Vat: 'start' and 'dispatch'. The code in
    // bootstrap.js gets a 'controller' object which can invoke start()
    // (which is expected to initialize some state and export some facetIDs)
    let setup;
    if (withSES) {
      const { source, sourceMap } = await bundleSource(`${sourceIndex}`);
      const actualSource = `(${source})\n${sourceMap}`;
      setup = sesEvaluator(actualSource);
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
    return setup;
  }

  const hostStorage = config.hostStorage || makeMemorySwingStore().storage;
  insistStorageAPI(hostStorage);
  const kernelEndowments = {
    setImmediate,
    hostStorage,
    vatAdminDevSetup: await evaluateToSetup(ADMIN_DEVICE_PATH),
    vatAdminVatSetup: await evaluateToSetup(ADMIN_VAT_PATH),
  };

  const kernel = withSES
    ? buildSESKernel(sesEvaluator, kernelEndowments)
    : buildNonSESKernel(kernelEndowments);

  async function addGenesisVat(name, sourceIndex, options = {}) {
    console.log(`= adding vat '${name}' from ${sourceIndex}`);
    const setup = await evaluateToSetup(sourceIndex);
    kernel.addGenesisVat(name, setup, options);
  }

  async function addGenesisDevice(name, sourceIndex, endowments) {
    const setup = await evaluateToSetup(sourceIndex);
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

    async run() {
      await kernel.run();
    },

    async step() {
      await kernel.step();
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
