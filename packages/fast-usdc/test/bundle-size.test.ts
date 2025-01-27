import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import { makeNodeBundleCache } from '@endo/bundle-source/cache.js';
import { Buffer } from 'buffer';
import { createRequire } from 'module';
import { promisify } from 'util';
import { gzip } from 'zlib';

const nodeRequire = createRequire(import.meta.url);

const MB = 1024 * 1024;

const bundleName = 'fast-usdc';
const entryModule = nodeRequire.resolve('../src/fast-usdc.contract.js');
const optSmall = { elideComments: true } as const;

const compressText = async (fileContents: string) => {
  const buffer = Buffer.from(fileContents, 'utf-8');
  const compressed = await promisify(gzip)(buffer);
  return compressed;
};

test('fast-usdc.contract.js bundle meets 1MB request limit', async t => {
  const bundleCache = await makeNodeBundleCache('bundles', {}, s => import(s));

  const bundle = await bundleCache.load(
    entryModule,
    'fast-usdc',
    undefined,
    optSmall,
  );
  const uncompressed = JSON.stringify(bundle);
  const compressed = await compressText(uncompressed);

  t.assert(compressed);
  const sizeInMb = compressed.length / MB;
  t.log({
    bundleName,
    compressedSize: `${sizeInMb.toFixed(3)} MB`,
    originallySize: `${(JSON.stringify(bundle).length / MB).toFixed(3)} MB`,
  });
  // JSON RPC hex encoding doubles the size
  t.assert(sizeInMb * 2 < 1, 'Compressed bundle is less than 0.5MB');
});
