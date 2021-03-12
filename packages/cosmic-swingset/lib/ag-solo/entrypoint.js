#! /usr/bin/env node
/* global module require */

const esmRequire = require('esm')(module);

// import node-lmdb early to work around SES incompatibility
require('node-lmdb');

// we need to enable Math.random as a workaround for 'brace-expansion' module
// (dep chain: temp->glob->minimatch->brace-expansion)
esmRequire('@agoric/install-metering-and-ses');

const process = require('process');

// Configure logs.
esmRequire('../anylogger-agoric.js');
const solo = esmRequire('./main.js').default;

solo(process.argv[1], process.argv.splice(2)).then(
  _res => 0,
  reason => {
    console.log(`error running ag-solo:`, reason);
    console.error(`\
Maybe the chain has bumped and you need to rerun ag-setup-solo?`);
    process.exit(1);
  },
);
