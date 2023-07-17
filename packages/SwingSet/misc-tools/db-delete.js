#!/usr/bin/env node
// @ts-nocheck
import '@endo/init';
import process from 'process';
import { openSwingStore } from '@agoric/swing-store';

const log = console.log;

function usage() {
  log(`
Command line:
  db-delete-key.js [FLAGS] STATEDIR KEY

FLAGS may be:
  --range - delete all keys starting with \`\${KEY}.\`
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

  let range = false;
  while (argv[0] && argv[0].startsWith('-')) {
    const flag = argv.shift();
    switch (flag) {
      case '--range':
        range = true;
        break;
      default:
        fail(`invalid flag ${flag}`, true);
        break;
    }
  }
  if (argv.length !== 2) {
    fail('wrong number of args', true);
  }
  const stateDBDir = argv.shift();
  const key = argv.shift();

  const { kernelStorage, hostStorage } = openSwingStore(stateDBDir);
  const { kvStore } = kernelStorage;
  const { commit } = hostStorage;

  if (range) {
    for (const k of kvStore.getKeys(`${key}.`, `${key}/`)) {
      kvStore.delete(k);
    }
  } else {
    kvStore.delete(key);
  }
  await commit();
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
