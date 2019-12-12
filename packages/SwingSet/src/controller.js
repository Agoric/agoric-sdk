// eslint-disable-next-line no-redeclare
/* global setImmediate */
import fs from 'fs';
import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import makeDefaultEvaluateOptions from '@agoric/default-evaluate-options';
import bundleSource from '@agoric/bundle-source';

import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import { insist } from './insist';
import { insistStorageAPI } from './storageAPI';
import { insistCapData } from './capdata';
import { parseVatSlot } from './parseVatSlots';
import { buildStorageInMemory } from './hostStorage';

export function loadBasedir(basedir) {
  console.log(`= loading config from basedir ${basedir}`);
  const vats = new Map(); // name -> { sourcepath, options }
  const subs = fs.readdirSync(basedir, { withFileTypes: true });
  subs.forEach(dirent => {
    if (dirent.name.endsWith('~')) {
      return;
    }
    if (
      dirent.name.startsWith('vat-') &&
      dirent.isFile() &&
      dirent.name.endsWith('.js')
    ) {
      const name = dirent.name.slice('vat-'.length, -'.js'.length);
      const indexJS = path.resolve(basedir, dirent.name);
      vats.set(name, { sourcepath: indexJS, options: {} });
    } else {
      console.log('ignoring ', dirent.name);
    }
  });
  let bootstrapIndexJS = path.resolve(basedir, 'bootstrap.js');
  try {
    fs.statSync(bootstrapIndexJS);
  } catch (e) {
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
    // Global shims need to take effect before realm shims.
    const shims = (rootOptions.shims || []).concat(realmOptions.shims || []);
    shims.forEach(shim => c.evaluate(shim));
    return {
      evaluateExpr(source, endowments = {}, options = {}) {
        return c.evaluate(`(${source}\n)`, endowments, options);
      },
      evaluateProgram(source, endowments = {}, options = {}) {
        return c.evaluate(`${source}`, endowments, options);
      },
    };
  };

  // As an optimisation, do not create a new compartment unless
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

function buildSESKernel(hostStorage) {
  // console.log('transforms', transforms);
  const evaluateOptions = makeDefaultEvaluateOptions();
  const { transforms, ...otherOptions } = evaluateOptions;
  const s = SES.makeSESRootRealm({
    ...otherOptions,
    transforms,
    consoleMode: 'allow',
    errorStackMode: 'allow',
  });
  transforms.forEach(t => {
    t.closeOverSES && t.closeOverSES(s);
  });

  const r = s.makeRequire({
    '@agoric/evaluate': {
      attenuatorSource: `${makeEvaluate}`,
      confine: s.global.SES.confine,
      confineExpr: s.global.SES.confineExpr,
      rootOptions: evaluateOptions,
      makeCompartment: s.global.Realm.makeCompartment,
    },
    '@agoric/harden': true,
    '@agoric/nat': Nat,
  });
  const kernelSource = getKernelSource();
  // console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })().default;
  const kernelEndowments = { setImmediate, hostStorage };
  const kernel = buildKernel(kernelEndowments);
  return { kernel, s, r };
}

function buildNonSESKernel(hostStorage) {
  // Evaluate shims to produce desired globals.
  const evaluateOptions = makeDefaultEvaluateOptions();
  // eslint-disable-next-line no-eval
  (evaluateOptions.shims || []).forEach(shim => (1, eval)(shim));

  const kernelEndowments = { setImmediate, hostStorage };
  const kernel = buildKernelNonSES(kernelEndowments);
  return { kernel };
}

export async function buildVatController(config, withSES = true, argv = []) {
  // todo: move argv into the config
  const hostStorage = config.hostStorage || buildStorageInMemory().storage;
  insistStorageAPI(hostStorage);
  const { kernel, s, r } = withSES
    ? buildSESKernel(hostStorage)
    : buildNonSESKernel(hostStorage);
  // console.log('kernel', kernel);

  async function addGenesisVat(name, sourceIndex, options = {}) {
    console.log(`= adding vat '${name}' from ${sourceIndex}`);
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
      // TODO: if the 'require' we provide here supplies a non-pure module,
      // that could open a communication channel between otherwise isolated
      // Vats. For now that's just harden and Nat, but others might get added
      // in the future, so pay attention to what we allow in. We could build
      // a new makeRequire for each Vat, but 1: performance and 2: the same
      // comms problem exists between otherwise-isolated code within a single
      // Vat so it doesn't really help anyways
      // const r = s.makeRequire({ '@agoric/harden': true, '@agoric/nat': Nat });
      const { source, sourceMap } = await bundleSource(`${sourceIndex}`);
      const actualSource = `(${source})\n${sourceMap}`;
      setup = s.evaluate(actualSource, { require: r })().default;
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
    kernel.addGenesisVat(name, setup, options);
  }

  async function addGenesisDevice(name, sourceIndex, endowments) {
    if (!(sourceIndex[0] === '.' || path.isAbsolute(sourceIndex))) {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }

    let setup;
    if (withSES) {
      const { source, sourceMap } = await bundleSource(`${sourceIndex}`);
      const actualSource = `(${source})\n${sourceMap}`;
      setup = s.evaluate(actualSource, { require: r })().default;
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
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
      insist(method === `${method}`);
      insistCapData(args);
      kernel.addExport(vatID, exportID);
      kernel.queueToExport(vatID, exportID, method, args);
    },
  });

  return controller;
}
