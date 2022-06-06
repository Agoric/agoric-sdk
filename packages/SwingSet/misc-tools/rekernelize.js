#!/usr/bin/env node

import '@endo/init/pre-bundle-source.js';
import 'lmdb';
import '@endo/init';

import fs from 'fs';
import path from 'path';
import process from 'process';

import bundleSource from '@endo/bundle-source';
import { openSwingStore } from '@agoric/swing-store';

function fail(message) {
  console.error(message);
  process.exit(1);
}

function dirContains(dirpath, suffix) {
  try {
    const files = fs.readdirSync(dirpath);
    for (const file of files) {
      if (file.endsWith(suffix)) {
        return true;
      }
    }
    return false;
  } catch (e) {
    return false;
  }
}

async function main() {
  const argv = process.argv.slice(2);

  let dbDir = '.';
  if (argv.length > 1) {
    fail('usage: rekernelize [DBDIR_OR_FILE]');
  } else if (argv[0]) {
    dbDir = argv[0];
  }

  let kernelStateDBDir;
  const dbSuffix = '.mdb';
  if (dbDir.endsWith(dbSuffix)) {
    kernelStateDBDir = path.dirname(dbDir);
  } else if (dirContains(dbDir, dbSuffix)) {
    kernelStateDBDir = dbDir;
  } else {
    kernelStateDBDir = path.join(dbDir, 'swingset-kernel-state');
    if (!dirContains(kernelStateDBDir, dbSuffix)) {
      kernelStateDBDir = null;
    }
  }
  if (!kernelStateDBDir) {
    fail(`can't find a database at ${dbDir}`);
  }

  const swingStore = openSwingStore(kernelStateDBDir);
  const kvStore = swingStore.kvStore;
  assert(kvStore.get('initialized'), 'kernel store not initialized');

  const kernelBundle = await bundleSource(
    new URL('../src/kernel/kernel.js', import.meta.url).pathname,
  );

  kvStore.set('kernelBundle', JSON.stringify(kernelBundle));
  await swingStore.commit();
  await swingStore.close();
}

main().then(
  () => 0,
  e => console.error(`${e}`, e),
);
