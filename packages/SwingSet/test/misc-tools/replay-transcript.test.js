// @ts-nocheck
import test from 'ava';
import tmp from 'tmp';

import {
  optionsDefault,
  run,
} from '../../misc-tools/replay-transcript-new.js';

const swingStoreDbName = new URL('replay-transcript-fixture.sqlite', import.meta.url).pathname;

/**
 * @param {string} [prefix]
 * @returns {Promise<[string, () => void]>}
 */
const tmpDir = prefix =>
  new Promise((resolve, reject) => {
    tmp.dir({ unsafeCleanup: true, prefix }, (err, name, removeCallback) => {
      if (err) {
        reject(err);
      } else {
        resolve([name, removeCallback]);
      }
    });
  });

const bfile = name => new URL(name, import.meta.url).pathname;

test.before(async t => {

});

test('replay-from-run', async t => {
  const [testDir, cleanup] = await tmpDir('replay-from-run');
  t.teardown(cleanup);

  const config = {
    ...optionsDefault,
    swingStoreDb: swingStoreDbName,
    snapSaveDir: testDir,
    startPos: 0,
    vatID: 'v55',
  };
  try {
    await run(config);
    t.pass();
  }
  catch (e) {
    t.fail(`replay-from-run failed: ${e}`);
  }
});
