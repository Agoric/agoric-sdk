#!/usr/bin/env -S node -r esm

/* global require */

import 'node-lmdb';
import '@agoric/babel-standalone';
import '@agoric/install-ses';

import path from 'path';
import process from 'process';

import bundleSource from '@agoric/bundle-source';
import { openLMDBSwingStore } from '@agoric/swing-store-lmdb';

async function main() {
  const argv = process.argv.slice(2);

  let dbDir = '.';
  if (argv.length > 1) {
    console.error('usage: rekernelize [DBDIR]');
    process.exit(1);
  } else if (argv[0]) {
    dbDir = argv[0];
  }

  const kernelStateDBDir = path.join(dbDir, 'swingset-kernel-state');
  const swingStore = openLMDBSwingStore(kernelStateDBDir);
  const kvStore = swingStore.kvStore;
  assert(kvStore.get('initialized'), 'kernel store not initialized');

  const kernelBundle = await bundleSource(
    require.resolve('../src/kernel/kernel.js'),
  );

  kvStore.set('kernelBundle', JSON.stringify(kernelBundle));
  swingStore.commit();
  swingStore.close();
}

main().then(
  () => 0,
  e => console.error(`${e}`, e),
);
