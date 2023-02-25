#! /usr/bin/env node
import '@endo/init';
import path from 'path';
import { promises as fsp } from 'fs';
import crypto from 'crypto';

import bundleSource from '@endo/bundle-source';
import { bundlePaths, entryPaths } from '../src/paths.js';

/** @param {Uint8Array} bytes */
const computeSha256 = bytes => {
  const hash = crypto.createHash('sha256');
  hash.update(bytes);
  return hash.digest().toString('hex');
};

const make = async (name, entrypath, spec) => {
  await fsp.mkdir(path.dirname(spec), { recursive: true });
  const format = 'nestedEvaluate';
  const bundle = await bundleSource(entrypath, { format });
  const bundleString = JSON.stringify(bundle);
  const sha256 = computeSha256(bundleString);
  await fsp.writeFile(spec, bundleString);
  return { length: bundleString.length, sha256, spec };
};

const run = async () => {
  const ld = await make('lockdown', entryPaths.lockdown, bundlePaths.lockdown);
  console.log(`wrote ${ld.spec}: ${ld.length} bytes`);
  console.log(`lockdown.bundle SHA256: ${ld.sha256}`);
  const lockdownHashFile = `${ld.spec}.sha256.js`;
  const template = `export const lockdownBundleSHA256 = 'HASH';\n`;
  await fsp.writeFile(lockdownHashFile, template.replace('HASH', ld.sha256));

  await make(
    'lockdown-debug',
    entryPaths.lockdownDebug,
    bundlePaths.lockdownDebug,
  );
};

run().catch(err => console.log(err));
