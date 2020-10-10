/* eslint-disable no-await-in-loop */
import test from 'ava';
import * as babelCore from '@babel/core';
import fs from 'fs';

import { makeExternalStoreTransformer } from '../src/external/transform';

test('meter transform', async t => {
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
    const rewritten = await fs.promises
      .readFile(`${base}/${testDir}/rewrite.js`, 'utf8')
      // Fix golden files in case they have DOS or MacOS line endings.
      .then(s => s.replace(/(\r\n|\r)/g, '\n'))
      .catch(_ => undefined);
    const transformed = rewrite(src.trimRight(), testDir);
    if (rewritten === undefined) {
      console.log(transformed);
    }
    t.is(transformed, rewritten.trimRight(), `rewrite ${testDir}`);
  }
});
