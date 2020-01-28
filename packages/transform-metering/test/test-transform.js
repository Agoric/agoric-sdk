/* eslint-disable no-await-in-loop */
import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import fs from 'fs';

import { makeMeteringTransformer } from '../src/index';
import * as c from '../src/constants';

test('meter transform', async t => {
  try {
    const { meterId, meteringTransform } = makeMeteringTransformer(
      babelCore,
      undefined,
      '$m',
      '$re_',
    );
    const rewrite = (source, testName) => {
      let cMeter;
      const ss = meteringTransform.rewrite({
        source,
        endowments: {
          [meterId]: {
            [c.METER_COMPUTE]: units => cMeter = units,
          },
        },
        sourceType: 'script',
      });
      t.equals(cMeter, ss.source.length, `compute meter updated ${testName}`);
      return ss.source;
    };

    t.throws(
      () => rewrite(`${meterId}.l()`, 'blacklisted meterId'),
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
        rewrite(src.trimRight(), testDir),
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
