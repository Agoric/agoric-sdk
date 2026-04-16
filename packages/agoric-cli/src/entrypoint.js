#!/usr/bin/env node
/* eslint-env node */

import '@endo/init/legacy.js';

import path from 'node:path';
import WebSocket from 'ws';
import { spawn } from 'node:child_process';
import rawFs from 'node:fs';
import os from 'node:os';

// Configure logs.
import './anylogger-agoric.js';
import anylogger from '@agoric/internal/vendor/anylogger.js';

import main from './main.js';

const fs = rawFs.promises;
const log = anylogger('agoric');
const progname = path.basename(process.argv[1]);

const stdout = str => process.stdout.write(str);
/** @type {(...args: ConstructorParameters<typeof WebSocket>) => WebSocket} */
const makeWebSocket = (...args) => new WebSocket(...args);

const rawArgs = process.argv.slice(2);
main(progname, rawArgs, {
  anylogger,
  stdout,
  makeWebSocket,
  fs,
  now: Date.now,
  os,
  process,
  spawn,
}).then(
  res => {
    if (Number.isSafeInteger(res)) {
      process.exitCode = res;
    }
  },
  rej => {
    log.error(rej);
    if (!process.exitCode) {
      process.exitCode = 2;
    }
  },
);
