import fs from 'fs';
import path from 'path';
import { rollup } from 'rollup';
import harden from '@agoric/harden';
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
  const r = s.makeRequire({'@agoric/harden': true});
  const kernelSource = getKernelSource();
  console.log('building kernel');
  const buildKernel = s.evaluate(kernelSource, { require: r })();
  const kernelEndowments = {endow: 'not'};
  const kernel = buildKernel(kernelEndowments);


  const controller = harden({
    run() {
      console.log('controller running');
    },
  });

  return controller;
}
