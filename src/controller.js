/* global setImmediate */
import fs from 'fs';
import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import bundleSource from './build-source-bundle';

export function loadBasedir(basedir, stateArg) {
  console.log(`= loading config from basedir ${basedir}`);
  const vatSources = new Map();
  const subs = fs.readdirSync(basedir, { withFileTypes: true });
  subs.forEach(dirent => {
    if (dirent.name.endsWith('~')) {
      return;
    }
    if (dirent.name.startsWith('vat-')) {
      let name;
      let indexJS;
      if (dirent.isFile() && dirent.name.endsWith('.js')) {
        name = dirent.name.slice('vat-'.length, -'.js'.length);
        indexJS = path.resolve(basedir, dirent.name);
      } else if (dirent.isDirectory()) {
        name = dirent.name.slice('vat-'.length);
        indexJS = path.resolve(basedir, dirent.name, 'index.js');
      }
      vatSources.set(name, indexJS);
    }
  });
  let bootstrapIndexJS = path.resolve(basedir, 'bootstrap.js');
  try {
    fs.statSync(bootstrapIndexJS);
  } catch (e) {
    bootstrapIndexJS = undefined;
  }
  let state;
  const stateFile = path.resolve(basedir, 'state.json');
  try {
    const stateData = fs.readFileSync(stateFile);
    state = JSON.parse(stateData);
  } catch (e) {
    state = stateArg;
  }
  return { vatSources, bootstrapIndexJS, state };
}

function getKernelSource() {
  return `(${kernelSourceFunc})`;
}

// this feeds the SES realm's (real/safe) confineExpr() back into the Realm
// when it does require('@agoric/evaluate'), so we can get the same
// functionality both with and without SES
function makeEvaluate(e) {
  const { confineExpr } = e;
  return (source, endowments = {}) => confineExpr(source, endowments);
}

function buildSESKernel() {
  const s = SES.makeSESRootRealm({
    consoleMode: 'allow',
    errorStackMode: 'allow',
  });
  const r = s.makeRequire({
    '@agoric/evaluate': {
      attenuatorSource: `${makeEvaluate}`,
      confineExpr: s.global.SES.confineExpr,
    },
    '@agoric/harden': true,
    '@agoric/nat': Nat,
  });
  const kernelSource = getKernelSource();
  // console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = { setImmediate };
  const kernel = buildKernel(kernelEndowments);
  return { kernel, s, r };
}

function buildNonSESKernel() {
  const kernelEndowments = { setImmediate };
  const kernel = buildKernelNonSES(kernelEndowments);
  return { kernel };
}

export async function buildVatController(config, withSES = true, argv = []) {
  // console.log('in main');
  const { kernel, s, r } = withSES ? buildSESKernel() : buildNonSESKernel();
  // console.log('kernel', kernel);

  async function addVat(vatID, sourceIndex, options) {
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
    // note: the contents of this 'devices' object are kernel-realm, but
    // the object itself is host-realm. kernel.addVat is responsible for
    // unpacking it safely and not exposing the container to vat code.
    const devices = {};

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
      if (options.devices) {
        Object.getOwnPropertyNames(options.devices).forEach(name => {
          const d = options.devices[name];
          devices[name] = s.evaluate(`(${d.attenuatorSource})`, { require: r })(
            d,
          );
        });
      }
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      setup = require(`${sourceIndex}`).default;
      if (options.devices) {
        Object.getOwnPropertyNames(options.devices).forEach(name => {
          const d = options.devices[name];
          // eslint-disable-next-line no-eval
          devices[name] = eval(d.attenuatorSource)(d);
        });
      }
    }
    kernel.addVat(vatID, setup, devices);
  }

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    async addVat(vatID, sourceIndex, options = {}) {
      console.log(`= adding vat '${vatID}' from ${sourceIndex}`);
      await addVat(vatID, sourceIndex, options);
    },

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

    queueToExport(vatID, facetID, method, argsString) {
      kernel.queueToExport(vatID, facetID, method, argsString, []);
    },

    callBootstrap(vatID, bootstrapArgv) {
      kernel.callBootstrap(`${vatID}`, JSON.stringify(bootstrapArgv));
    },

    getState() {
      return JSON.parse(JSON.stringify(kernel.getState()));
    },
  });

  if (config.vatSources) {
    for (const vatID of config.vatSources.keys()) {
      if (config.vatDevices) {
        // eslint-disable-next-line no-await-in-loop
        await controller.addVat(
          vatID,
          config.vatSources.get(vatID),
          config.vatDevices.get(vatID),
        );
      } else {
        // eslint-disable-next-line no-await-in-loop
        await controller.addVat(vatID, config.vatSources.get(vatID));
      }
    }
  }

  if (config.bootstrapIndexJS) {
    await addVat('_bootstrap', config.bootstrapIndexJS, {});
  }

  if (config.state) {
    await kernel.loadState(config.state);
    console.log(`loadState complete`);
  } else if (config.bootstrapIndexJS) {
    // we invoke obj[0].bootstrap with an object that contains 'vats' and
    // 'argv'.
    console.log(`=> queueing bootstrap()`);
    kernel.callBootstrap('_bootstrap', JSON.stringify(argv));
  }

  return controller;
}
