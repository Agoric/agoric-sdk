/* eslint-disable no-await-in-loop */
import test from 'tape-promise/tape';
import * as babelCore from '@babel/core';
import fs from 'fs';

import { makeMeteringTransformer } from '../src/index';
import * as c from '../src/constants';

test('meter transform', async t => {
  try {
    let getMeter;
    const meteringTransform = makeMeteringTransformer(babelCore, {
      overrideMeterId: '$m',
      overrideRegExpIdPrefix: '$re_',
    });
    const rewrite = (source, testName) => {
      let cMeter;
      getMeter = () => ({
        [c.METER_COMPUTE]: units => (cMeter = units),
      });

      const ss = meteringTransform.rewrite({
        src: source,
        endowments: { getMeter },
        sourceType: 'script',
      });

      t.equals(cMeter, source.length, `compute meter updated ${testName}`);
      return ss.src;
    };

    t.throws(
      () => rewrite(`$m.l()`, 'blacklisted meterId'),
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
      const rewritten = await fs.promises
        .readFile(`${base}/${testDir}/rewrite.js`, 'utf8')
        .then(s => s.replace(/(\r\n|\r)/g, '\n'))
        .catch(_ => undefined);
      const transformed = rewrite(src.trimRight(), testDir);
      if (rewritten === undefined) {
        console.log(transformed);
      }
      t.equals(transformed, rewritten.trimRight(), `rewrite ${testDir}`);
    }
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
