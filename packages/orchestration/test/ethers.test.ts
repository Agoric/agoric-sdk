import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';

import bundleSource from '@endo/bundle-source';
import { importBundle } from '@endo/import-bundle';
import { toHex } from '@cosmjs/encoding';

import { createRequire } from 'node:module';

const nodeRequire = createRequire(import.meta.url);

test('use ethers in a compartment', async t => {
  const startFilename = nodeRequire.resolve('./ethers-usage.js');
  const bundle = await bundleSource(startFilename);
  t.truthy(bundle);
  const ns = await importBundle(bundle, { endowments: { console: console } });
  t.log('exports', Object.keys(ns));
  const { getContractInvocationPayload, testData } = ns;
  const actual = getContractInvocationPayload(testData);
  t.log(toHex(actual));
  t.is(toHex(actual).length, 448);
});
