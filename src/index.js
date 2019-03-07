// import fs from 'fs';
// import path from 'path';
// import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import kernelSourceFunc from './bundles/kernel';

export async function loadBasedir(_basedir) {
  const vatSources = {};
  const wiringSource = '';
  return harden({ vatSources, wiringSource });
}

function getKernelSource() {
  return `(${kernelSourceFunc})`;
}

export async function buildVatController(_config) {
  console.log('in main');
  const s = SES.makeSESRootRealm({
    consoleMode: 'allow',
    // errorStackMode: 'allow',
  });
  const r = s.makeRequire({ '@agoric/harden': true, '@agoric/nat': Nat });
  const kernelSource = getKernelSource();
  console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = { endow: 'not' };
  const kernel = buildKernel(kernelEndowments);
  console.log('kernel', kernel);

  // the kernel won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    addVat(vatID, dispatchSource) {
      // TODO: if the 'require' we provide here supplies a non-pure module,
      // that could open a communication channel between otherwise isolated
      // Vats. For now that's just harden and Nat, but others might get added
      // in the future, so pay attention to what we allow in.
      const dispatch = s.evaluate(dispatchSource, { require: r });
      kernel.addVat(vatID, dispatch);
    },
    dumpSlots() {
      return JSON.parse(JSON.stringify(kernel.dumpSlots()));
    },

    run() {
      kernel.run();
    },

    step() {
      kernel.step();
    },

    queue(vatID, facetID, argsString) {
      kernel.queue(vatID, facetID, argsString);
    },
  });

  return controller;
}
