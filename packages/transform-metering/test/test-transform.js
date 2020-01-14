/* eslint-disable no-await-in-loop */
import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import fs from 'fs';

import { makeMeteringTransformer } from '../src/index';

test('meter transform', async t => {
  try {
    const { meterId, meteringTransform } = makeMeteringTransformer(
      babelCore,
      undefined,
      '$m',
    );
    const rewrite = source =>
      meteringTransform.rewrite({
        source,
        endowments: {},
        sourceType: 'script',
      }).source;
    t.throws(
      () => rewrite(`${meterId}.l()`),
      SyntaxError,
      'meterId cannot appear in source',
    );

    const base = `${__dirname}/../testdata`;
    const tests = await fs.promises.readdir(base);
    for (const testDir of tests) {
      const src = await fs.promises.readFile(
        `${base}/${testDir}/source.js`,
        'utf8',
      );
      const rewritten = await fs.promises.readFile(
        `${base}/${testDir}/rewrite.js`,
        'utf8',
      );
      t.equals(
        rewrite(src.trimRight()),
        rewritten.trimRight(),
        `rewrite ${testDir}`,
      );
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
