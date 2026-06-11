#! /usr/bin/env node
/* eslint-env node */
import '@endo/init';

import { exec, spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import inquirer from 'inquirer';
import temp from 'temp';

import * as files from './files.js';
import deploy from './main.js';
import { running } from './run.js';
import { setup } from './setup.js';

process.on('SIGINT', () => process.exit(-1));
deploy(process.argv[1], process.argv.splice(2), {
  env: process.env,
  rd: files.reading(fs, path),
  wr: files.writing(fs, path, temp),
  setup: setup({ resolve: path.resolve, env: process.env, setInterval }),
  running: running(process, { exec, spawn }),
  inquirer,
  fetch,
}).then(
  res => process.exit(res || 0),
  rej => {
    console.error(`error running ag-setup-cosmos:`, rej);
    process.exit(1);
  },
);
