/* eslint-disable no-await-in-loop */
import test from 'ava';
import fs from 'fs';
import path from 'path';

import { makeMeteringTransformer } from '../src/index.js';
import * as c from '../src/constants.js';

const filename = new URL(import.meta.url).pathname;
const dirname = path.dirname(filename);

test('meter transform', async t => {
  let getMeter;
  const meteringTransform = makeMeteringTransformer(undefined, {
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

    t.is(cMeter, source.length, `compute meter updated ${testName}`);
    return ss.src;
  };

  t.throws(
    () => rewrite(`$m.l()`, 'blacklisted meterId'),
    { instanceOf: SyntaxError },
    'meterId cannot appear in source',
  );

  const base = `${dirname}/../testdata`;
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
