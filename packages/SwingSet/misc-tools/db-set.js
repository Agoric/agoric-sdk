#!/usr/bin/env node
// @ts-nocheck
import '@endo/init';
import process from 'process';
import { openSwingStore } from '@agoric/swing-store';

const log = console.log;

function usage() {
  log(`
Command line:
  db-set-key.js STATEDIR KEY VALUE
`);
}

function fail(message, printUsage) {
  if (message) {
    log(message);
  }
  if (printUsage) {
    usage();
  }
  process.exit(1);
}

async function run() {
  const argv = process.argv.slice(2);

  if (argv.length !== 3) {
    fail('wrong number of args', true);
  }
  const stateDBDir = argv.shift();
  const key = argv.shift();
  const value = argv.shift();

  const { kernelStorage, hostStorage } = openSwingStore(stateDBDir);

  kernelStorage.kvStore.set(key, value);
  await hostStorage.commit();
}

process.exitCode = 1;
run().then(
  () => {
    process.exitCode = 0;
  },
  err => {
    console.error('Failed with', err);
    process.exit(process.exitCode || 1);
  },
);
