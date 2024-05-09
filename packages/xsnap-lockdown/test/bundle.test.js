import test from 'ava';
import fs from 'fs';
import crypto from 'crypto';

import {
  getLockdownBundle,
  getLockdownBundleSHA256,
  getDebugLockdownBundle,
} from '../src/index.js';
import { bundlePaths } from '../src/paths.js';

test('getLockdownBundle', async t => {
  const bundle = await getLockdownBundle();
  t.is(typeof bundle, 'object');
  t.is(bundle.moduleFormat, 'nestedEvaluate');
  t.is(typeof bundle.source, 'string');
});

test('debug bundle', async t => {
  const bundle = await getDebugLockdownBundle();
  t.is(typeof bundle, 'object');
  t.is(bundle.moduleFormat, 'nestedEvaluate');
  t.is(typeof bundle.source, 'string');
});

/** @param {string} string */
const encode = string => new TextEncoder().encode(string);

/** @param {Uint8Array} bytes */
const sha256 = bytes => {
  const hash = crypto.createHash('sha256');
  hash.update(bytes);
  return hash.digest().toString('hex');
};

test('bundle hash', async t => {
  // the bundle string on disk is ready to hash
  const lockdownBundleSpec = bundlePaths.lockdown;
  const bundleString = fs.readFileSync(lockdownBundleSpec, {
    encoding: 'utf-8',
  });
  const publishedHash = await getLockdownBundleSHA256();
  t.is(sha256(encode(bundleString)), publishedHash);

  // The bundle object can be JSON-stringified and then hashed. This
  // serialization should be deterministic (JSON.stringify uses
  // property insertion order, but so did the JSON.parse done by
  // getLockdownBundle)

  const bundle = await getLockdownBundle();
  const bundleString2 = JSON.stringify(bundle);
  t.is(sha256(encode(bundleString2)), publishedHash);
});
