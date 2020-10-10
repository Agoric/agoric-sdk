/* eslint-disable no-await-in-loop */
import '@agoric/install-ses';
import test from 'ava';
import * as babelCore from '@babel/core';
import fs from 'fs';

import { makeExternalStoreTransformer } from '../src/external/transform';

test('external store transform', async t => {
  const externalStoreTransform = makeExternalStoreTransformer(babelCore);

  const base = `${__dirname}/../testdata`;
  const tests = await fs.promises.readdir(base);
  for (const testDir of tests) {
    const src = await fs.promises.readFile(
      `${base}/${testDir}/source.js`,
      'utf8',
    );
    const transformed = externalStoreTransform(src.trimRight());
    t.snapshot(transformed, { id: testDir });
  }
});
