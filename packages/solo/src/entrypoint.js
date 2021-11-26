#! /usr/bin/env node

// import node-lmdb early to work around SES incompatibility
import 'node-lmdb';

// Needed for legacy plugin support (dapp-oracle, for one).
import 'esm';

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';

// we need to enable Math.random as a workaround for 'brace-expansion' module
// (dep chain: temp->glob->minimatch->brace-expansion)
import '@agoric/install-ses';

import process from 'process';
import path from 'path';

// Configure logs.
import '@agoric/cosmic-swingset/src/anylogger-agoric.js';
import solo from './main.js';

const baseprog = path.basename(process.argv[1]);
solo(baseprog, process.argv.slice(2)).then(
  res => process.exit(res || 0),
  reason => {
    console.error(`error running ag-solo:`, reason);
    process.exit(1);
  },
);
