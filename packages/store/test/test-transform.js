/* eslint-disable no-await-in-loop */
import '@agoric/install-ses';
import test from 'ava';
import * as babelCore from '@babel/core';
import fs from 'fs';

import { makeExternalStoreTransformer } from '../src/index';

test('external store transform', async t => {
  const externalStoreTransform = makeExternalStoreTransformer(babelCore);
  const rewrite = source => {
    const ss = externalStoreTransform.rewrite({
      src: source,
      sourceType: 'script',
    });
    return ss.src;
  };

  const base = `${__dirname}/../testdata`;
  const tests = await fs.promises.readdir(base);
  for (const testDir of tests) {
    const src = await fs.promises.readFile(
      `${base}/${testDir}/source.js`,
      'utf8',
    );
    const transformed = rewrite(src.trimRight(), testDir);
    t.snapshot(transformed, { id: testDir });
  }
});
