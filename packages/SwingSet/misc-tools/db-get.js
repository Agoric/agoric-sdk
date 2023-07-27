#!/usr/bin/env node
// @ts-nocheck
import '@endo/init';
import process from 'process';
import { openSwingStore } from '@agoric/swing-store';

const log = console.log;

const out = process.stdout;
function p(str) {
  out.write(str);
  out.write('\n');
}

function usage() {
  log(`
Command line:
  db-get-key.js [FLAGS] STATEDIR KEY

FLAGS may be:
  --raw   - just output the value(s) without adornment or key info
  --range - output values for all keys starting with \`\${KEY}.\`
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

function run() {
  const argv = process.argv.slice(2);

  let raw = false;
  let range = false;
  while (argv[0] && argv[0].startsWith('-')) {
    const flag = argv.shift();
    switch (flag) {
      case '--raw':
        raw = true;
        break;
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

  const { kvStore } = openSwingStore(stateDBDir).kernelStorage;

  function pkv(k) {
    const value = kvStore.get(k);
    if (raw) {
      p(value);
    } else {
      p(`${k} :: ${value}`);
    }
  }

  if (range) {
    for (const k of kvStore.getKeys(`${key}.`, `${key}/`)) {
      pkv(k);
    }
  } else {
    pkv(key);
  }
}

run();
