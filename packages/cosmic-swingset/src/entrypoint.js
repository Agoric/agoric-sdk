#! /usr/bin/env node

import '@endo/init/unsafe-fast.js';

import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import fs from 'node:fs';
import { Worker } from 'node:worker_threads';

import './anylogger-agoric.js';
import anylogger from '@agoric/internal/vendor/anylogger.js';
import { loadAgcc } from './agcc-shim.js';
import { makeAgcc } from './agcc-agvm.js';
import main from './chain-main.js';

const log = anylogger('ag-chain-cosmos');

loadAgcc(
  {
    AGVM_INPUT_FD: process.env.AGVM_INPUT_FD,
    AGVM_OUTPUT_FD: process.env.AGVM_OUTPUT_FD,
  },
  {
    loadNative: () => import('@agoric/cosmos').then(ns => ns.default),
    makeExternal: (inputFd, outputFd) =>
      makeAgcc(inputFd, outputFd, {
        write: (fd, text) => {
          fs.writeSync(fd, text);
        },
        makeInputWorker: () =>
          new Worker(new URL('./agd-input-worker.js', import.meta.url)),
        onFinish: () => process.exit(0),
        onError: error => {
          log.error('RPC service stopped', error);
          process.exit(1);
        },
      }),
  },
)
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
