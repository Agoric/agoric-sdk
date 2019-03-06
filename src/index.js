import fs from 'fs';
import path from 'path';
import { rollup } from 'rollup';
import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import SES from 'ses';

import kernelSourceFunc from './bundles/kernel';

export async function loadBasedir(basedir) {
  const vatSources = {};
  const wiringSource = '';
  return harden({ vatSources, wiringSource });
}

function getKernelSource() {
  return `(${kernelSourceFunc})`;
}

export async function buildVatController(config) {
  console.log("in main");
  const s = SES.makeSESRootRealm({consoleMode: 'allow',
                                  //errorStackMode: 'allow',
                                 });
  const r = s.makeRequire({'@agoric/harden': true,
                           '@agoric/nat': Nat,
                          });
  const kernelSource = getKernelSource();
  console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = {endow: 'not'};
  const kernelController = buildKernel(kernelEndowments);
  console.log('kernelController', kernelController);

  // the kernelController won't leak our objects into the Vats, we must do
  // the same in this wrapper
  const controller = harden({
    dumpSlots() {
      return JSON.parse(JSON.stringify(kernelController.dumpSlots()));
    },

    run() {
      kernelController.run();
    },

    step() {
      kernelController.step();
    },

    queue(vatID, facetID, argsString) {
      kernelController.queue(vatID, facetID, argsString);
    },
  });

  return controller;
}
