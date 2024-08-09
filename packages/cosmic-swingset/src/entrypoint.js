#! /usr/bin/env node
// @jessie-check

import '@endo/init/unsafe-fast.js';

import os from 'os';
import path from 'path';
import process from 'process';

import './anylogger-agoric.js';
import anylogger from 'anylogger';
import agccP from './agcc-shim.js';
import main from './chain-main.js';

const log = anylogger('ag-chain-cosmos');

Promise.resolve(agccP)
  .then(agcc =>
    main(process.argv[1], process.argv.slice(2), {
      path,
      homedir: os.homedir(),
      env: process.env,
      agcc,
    }),
  )
  .then(
    _res => 0,
    rej => {
      log.error(`error running ag-chain-cosmos:`, rej);
      process.exit(1);
    },
  );
