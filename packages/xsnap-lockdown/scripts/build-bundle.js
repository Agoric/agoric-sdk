#! /usr/bin/env node
import '@endo/init';
import path from 'path';
import { promises as fsp } from 'fs';
import crypto from 'crypto';
import process from 'process';

import bundleSource from '@endo/bundle-source';
import { bundlePaths, entryPaths, hashPaths } from '../src/paths.js';

/** @param {Uint8Array | string} bytes */
const computeSha256 = bytes => {
  const hash = crypto.createHash('sha256');
  hash.update(bytes);
  return hash.digest().toString('hex');
};

const make = async name => {
  const spec = bundlePaths[name];
  const entryPath = entryPaths[name];
  const hashPath = hashPaths[name];
  await fsp.mkdir(path.dirname(spec), { recursive: true });
  const bundle = await bundleSource(entryPath, { format: 'nestedEvaluate' });
  const bundleString = JSON.stringify(bundle);
  const sha256 = computeSha256(bundleString);
  await fsp.writeFile(spec, bundleString);
  await fsp.writeFile(hashPath, `${sha256}\n`);
  return { length: bundleString.length, sha256, where: spec };
};

const run = async () => {
  const ld = await make('lockdown');
  console.log(`wrote ${ld.where}: ${ld.length} bytes`);
  console.log(`lockdown.bundle SHA256: ${ld.sha256}`);
  await make('lockdownDebug');
};

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
