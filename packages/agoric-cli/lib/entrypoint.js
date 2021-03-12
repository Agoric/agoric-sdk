/* global process */
import '@agoric/install-ses';

import path from 'path';
import WebSocket from 'ws';
import { spawn } from 'child_process';
import rawFs from 'fs';
import os from 'os';

// Configure logs.
import './anylogger-agoric';
import anylogger from 'anylogger';

import main from './main';

const fs = rawFs.promises;
const log = anylogger('agoric');
const progname = path.basename(process.argv[1]);

const stdout = str => process.stdout.write(str);
const makeWebSocket = (...args) => new WebSocket(...args);

const rawArgs = process.argv.slice(2);
main(progname, rawArgs, {
  anylogger,
  stdout,
  makeWebSocket,
  fs,
  os,
  process,
  spawn,
}).then(
  res => res === undefined || process.exit(res),
  rej => {
    log.error(rej);
    process.exit(2);
  },
);
