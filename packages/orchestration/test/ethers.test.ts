import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import bundleSource from '@endo/bundle-source';
import { importBundle } from '@endo/import-bundle';

import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

test('use ethers in a compartment', async t => {
  const startFilename = nodeRequire.resolve('./ethers-usage.js');
  const bundle = await bundleSource(startFilename);
  t.truthy(bundle);
  const ns = importBundle(bundle, { endowments: { console: console } });
  t.log(Object.keys(ns));
});
