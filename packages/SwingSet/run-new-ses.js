/* global Compartment harden */
// node -r esm run-new-ses.js

import './install-ses.js';
// We are now in the "Start Compartment". Our global has all the same
// powerful things it had before, but the primordials have changed to make
// them safe to use in the arguments of API calls we make into more limited
// compartments. 'Compartment' and 'harden' are now present in our global
// scope.

import { loadBasedir, buildVatController } from './src/index';

async function run() {
  const basedir = '../swingset-runner/demo/justReply';
  const config = loadBasedir(basedir);
  const c = await buildVatController(config);
  await c.run();
}

run();
