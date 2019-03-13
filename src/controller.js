import fs from 'fs';
import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import bundleSource from './build-source-bundle';

export function loadBasedir(basedir) {
  console.log(`loading config from basedir ${basedir}`);
  const vatSources = new Map();
  const subs = fs.readdirSync(basedir, { withFileTypes: true });
  subs.forEach(dirent => {
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
  return harden({ vatSources, bootstrapIndexJS });
}

function getKernelSource() {
  return `(${kernelSourceFunc})`;
}

function buildSESKernel() {
  const s = SES.makeSESRootRealm({
    consoleMode: 'allow',
    errorStackMode: 'allow',
  });
  const r = s.makeRequire({ '@agoric/harden': true, '@agoric/nat': Nat });
  const kernelSource = getKernelSource();
  // console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = { endow: 'not' };
  const kernel = buildKernel(kernelEndowments);
  return { kernel, s, r };
}

function buildNonSESKernel() {
  const kernelEndowments = { endow: 'not' };
  const kernel = buildKernelNonSES(kernelEndowments);
  return { kernel };
}

export async function buildVatController(config, withSES = true) {
  // console.log('in main');
  const { kernel, s, r } = withSES ? buildSESKernel() : buildNonSESKernel();
  // console.log('kernel', kernel);

  async function addVat(vatID, sourceIndex) {
    if (sourceIndex[0] !== '.' && sourceIndex[0] !== '/') {
      throw Error(
        'sourceIndex must be relative (./foo) or absolute (/foo) not bare (foo)',
      );
    }
    // we load the sourceIndex (and everything it imports), and expect to get
    // two symbols from each Vat: 'start' and 'dispatch'. The code in
    // bootstrap.js gets a 'controller' object which can invoke start()
    // (which is expected to initialize some state and export some facetIDs)
    let code;
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
      code = s.evaluate(source, { require: r })();
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      code = require(`${sourceIndex}`);
    }
    kernel.addVat(vatID, code.start, code.dispatch);
  }

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    async addVat(vatID, sourceIndex) {
      console.log(`adding vat '${vatID}' from ${sourceIndex}`);
      await addVat(vatID, sourceIndex);
    },

    connect(fromVatID, importID, toVatID, exportID) {
      kernel.connect(fromVatID, importID, toVatID, exportID);
    },

    log(str) {
      kernel.log(str);
    },

    dump() {
      return JSON.parse(JSON.stringify(kernel.dump()));
    },

    run() {
      kernel.run();
    },

    step() {
      kernel.step();
    },

    queue(vatID, facetID, method, argsString) {
      kernel.queue(vatID, facetID, method, argsString, []);
    },
  });

  if (config.vatSources) {
    for (const vatID of config.vatSources.keys()) {
      // eslint-disable-next-line no-await-in-loop
      await controller.addVat(vatID, config.vatSources.get(vatID));
    }
  }

  if (config.bootstrapIndexJS) {
    let bootstrap;
    if (withSES) {
      let source = await bundleSource(`${config.bootstrapIndexJS}`);
      source = `(${source})`;
      bootstrap = s.evaluate(source, { require: r })();
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      bootstrap = require(`${config.bootstrapIndexJS}`).default;
    }
    bootstrap(kernel);
  }

  return controller;
}
