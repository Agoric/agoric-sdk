#! /usr/bin/env node
// @jessie-check

import '@endo/init/pre.js';

import agcc from '@agoric/cosmos';

import '@endo/init/unsafe-fast.js';

import os from 'os';
import path from 'path';
import process from 'process';

import './anylogger-agoric.js';
import anylogger from 'anylogger';
import main from './chain-main.js';

const log = anylogger('ag-chain-cosmos');

process.exitCode = 98;
main(process.argv[1], process.argv.splice(2), {
  path,
  homedir: os.homedir(),
  env: process.env,
  agcc,
}).then(
  res => {
    process.exitCode = typeof res === 'number' ? res : 0;
  },
  rej => {
    log.error(`error running ag-chain-cosmos:`, rej);
    process.exit();
  },
);
