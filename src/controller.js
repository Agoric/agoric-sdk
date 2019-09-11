// eslint-disable-next-line no-redeclare
/* global setImmediate */
import fs from 'fs';
import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import makeDefaultEvaluateOptions from '@agoric/default-evaluate-options';

import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import bundleSource from './build-source-bundle';
import { insistCapData } from './capdata';

const evaluateOptions = makeDefaultEvaluateOptions();

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
    const c = makeCompartment({
      ...rootOptions,
      ...realmOptions,
      // Global shims need to take effect before realm shims.
      shims: (rootOptions.shims || []).concat(realmOptions.shims || []),
      // Realm transforms need to be vetted by global transforms.
      transforms: (realmOptions.transforms || []).concat(
        rootOptions.transforms || [],
      ),
    });
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

function buildSESKernel(initialState) {
  // console.log('transforms', transforms);
  const s = SES.makeSESRootRealm({
    ...evaluateOptions,
    consoleMode: 'allow',
    errorStackMode: 'allow',
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
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = { setImmediate };
  const kernel = buildKernel(kernelEndowments, initialState);
  return { kernel, s, r };
}

function buildNonSESKernel(initialState) {
  // Evaluate shims to produce desired globals.
  // eslint-disable-next-line no-eval
  (evaluateOptions.shims || []).forEach(shim => (1, eval)(shim));

  const kernelEndowments = { setImmediate };
  const kernel = buildKernelNonSES(kernelEndowments, initialState);
  return { kernel };
}

export async function buildVatController(config, withSES = true, argv = []) {
  // todo: move argv into the config
  const initialState = config.initialState || JSON.stringify({});
  const { kernel, s, r } = withSES
    ? buildSESKernel(initialState)
    : buildNonSESKernel(initialState);
  // console.log('kernel', kernel);

  async function addGenesisVat(vatID, sourceIndex, options = {}) {
    console.log(`= adding vat '${vatID}' from ${sourceIndex}`);
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
      let source = await bundleSource(`${sourceIndex}`);
      source = `(${source})`;
      setup = s.evaluate(source, { require: r })();
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
    kernel.addGenesisVat(vatID, setup, options);
  }

  async function addGenesisDevice(name, sourceIndex, endowments) {
    if (!(sourceIndex[0] === '.' || path.isAbsolute(sourceIndex))) {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }

    let setup;
    if (withSES) {
      let source = await bundleSource(`${sourceIndex}`);
      source = `(${source})`;
      setup = s.evaluate(source, { require: r })();
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
    }
    kernel.addGenesisDevice(name, setup, endowments);
  }

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    addVat(vatID, sourceIndex, options = {}) {
      return addGenesisVat(vatID, sourceIndex, options);
    },

    log(str) {
      kernel.log(str);
    },

    dump() {
      return JSON.parse(JSON.stringify(kernel.dump()));
    },

    getState() {
      return `${kernel.getState()}`;
    },

    async run() {
      await kernel.run();
    },

    async step() {
      await kernel.step();
    },

    queueToExport(vatID, facetID, method, args) {
      insistCapData(args);
      kernel.addExport(vatID, facetID);
      kernel.queueToExport(vatID, facetID, method, args);
    },

    callBootstrap(vatID, bootstrapArgv) {
      kernel.callBootstrap(`${vatID}`, JSON.stringify(bootstrapArgv));
    },
  });

  if (config.devices) {
    for (const [name, srcpath, endowments] of config.devices) {
      // eslint-disable-next-line no-await-in-loop
      await addGenesisDevice(name, srcpath, endowments);
    }
  }

  if (config.vats) {
    for (const vatID of config.vats.keys()) {
      const v = config.vats.get(vatID);
      // eslint-disable-next-line no-await-in-loop
      await addGenesisVat(vatID, v.sourcepath, v.options || {});
    }
  }

  if (config.bootstrapIndexJS) {
    await addGenesisVat('_bootstrap', config.bootstrapIndexJS, {});
  }

  // start() may queue bootstrap if state doesn't say we did it already. It
  // also replays the transcripts from a previous run, if any, which will
  // execute vat code (but all syscalls will be disabled)
  await kernel.start('_bootstrap', JSON.stringify(argv));

  return controller;
}
