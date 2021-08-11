#! /usr/bin/env node

// import node-lmdb early to work around SES incompatibility
import 'node-lmdb';

import agcc from '@agoric/cosmos';

// TODO Remove babel-standalone preinitialization
// https://github.com/endojs/endo/issues/768
import '@agoric/babel-standalone';

// we need to enable Math.random as a workaround for 'brace-expansion' module
// (dep chain: temp->glob->minimatch->brace-expansion)
import '@agoric/install-ses';

import os from 'os';
import path from 'path';
import process from 'process';

import './anylogger-agoric.js';
import anylogger from 'anylogger';
import main from './chain-main.js';

const log = anylogger('ag-chain-cosmos');

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
