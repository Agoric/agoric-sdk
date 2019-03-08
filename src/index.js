// import fs from 'fs';
// import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import kernelSourceFunc from './bundles/kernel';
import buildKernelNonSES from './kernel/index';
import bundleSource from './build-source-bundle';

export async function loadBasedir(_basedir) {
  const vatSources = {};
  const wiringSource = '';
  return harden({ vatSources, wiringSource });
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
  console.log('building kernel');
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

export async function buildVatController(_config, withSES = true) {
  console.log('in main');
  const { kernel, s, r } = withSES ? buildSESKernel() : buildNonSESKernel();
  console.log('kernel', kernel);

  async function addVat(vatID, sourceindex) {
    let dispatch;
    if (withSES) {
      // TODO: if the 'require' we provide here supplies a non-pure module,
      // that could open a communication channel between otherwise isolated
      // Vats. For now that's just harden and Nat, but others might get added
      // in the future, so pay attention to what we allow in. We could build
      // a new makeRequire for each Vat, but 1: performance and 2: the same
      // comms problem exists between otherwise-isolated code within a single
      // Vat so it doesn't really help anyways
      // const r = s.makeRequire({ '@agoric/harden': true, '@agoric/nat': Nat });
      let source = await bundleSource(`${sourceindex}`); // TODO use path lib
      source = `(${source})`;
      dispatch = s.evaluate(source, { require: r });
    } else {
      // eslint-disable-next-line global-require,import/no-dynamic-require
      dispatch = require(`${sourceindex}`).default;
    }
    kernel.addVat(vatID, dispatch);
  }

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    async addVat(vatID, sourceDir) {
      await addVat(vatID, sourceDir);
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

  return controller;
}
