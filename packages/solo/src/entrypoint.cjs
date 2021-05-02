#! /usr/bin/env node
/* global module require */

const esmRequire = require('esm')(module);

// import node-lmdb early to work around SES incompatibility
require('node-lmdb');

// we need to enable Math.random as a workaround for 'brace-expansion' module
// (dep chain: temp->glob->minimatch->brace-expansion)
esmRequire('@agoric/install-metering-and-ses');

const process = require('process');
const path = require('path');

// Configure logs.
esmRequire('@agoric/cosmic-swingset/src/anylogger-agoric.js');
const solo = esmRequire('./main.js').default;

const baseprog = path.basename(process.argv[1]);
solo(baseprog, process.argv.slice(2)).then(
  res => process.exit(res || 0),
  reason => {
    console.log(`error running ag-solo:`, reason);
    console.error(`\
Maybe the chain has bumped and you need to rerun ag-setup-solo?`);
    process.exit(1);
  },
);
