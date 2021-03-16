#! /usr/bin/env node
/* global module require process */

const esmRequire = require('esm')(module);

// import node-lmdb early to work around SES incompatibility
require('node-lmdb');

const agcc = require('@agoric/cosmos');

// we need to enable Math.random as a workaround for 'brace-expansion' module
// (dep chain: temp->glob->minimatch->brace-expansion)
esmRequire('@agoric/install-metering-and-ses');

if (!process.env.DEBUG) {
  // By default, disable debugging.
  process.env.DEBUG = '';
}

const path = require('path');
const os = require('os');

esmRequire('./anylogger-agoric');
const anylogger = require('anylogger');

const log = anylogger('ag-chain-cosmos');

const main = esmRequire('./chain-main.js').default;

main(process.argv[1], process.argv.splice(2), {
  path,
  homedir: os.homedir(),
  env: process.env,
  agcc,
}).then(
  _res => 0,
  rej => {
    log.error(`error running ag-chain-cosmos:`, rej);
    process.exit(1);
  },
);
