/** @file the `helpers` module is exported to test its API */

import '@endo/init/debug.js';

import test from 'ava';

import { getSDKBinaries } from '../src/helpers.js';

test('getSDKBinaries', t => {
  const binaries = getSDKBinaries();
  t.log(binaries);
  t.is(typeof binaries.agSolo, 'string');
  t.is(typeof binaries.agSoloBuild, 'object');
  t.is(typeof binaries.cosmosChain, 'string');
  t.is(typeof binaries.cosmosChainBuild, 'object');
  t.is(typeof binaries.cosmosClientBuild, 'object');
  t.is(typeof binaries.cosmosHelper, 'string');
});
