import test from '@endo/ses-ava/prepare-endo.js';
import { sleep } from '../tools/sleep.js';

test('sleep without tripping AVA timeout', async t => {
  const stirred: string[] = [];
  t.timeout(500);
  const sleepTime = 4_000;
  await sleep(sleepTime, {
    log: t.log,
    stirEveryMs: 300,
    stir: description => {
      stirred.push(description);
      t.pass(description);
    },
  });
  const stirs = new Array(13);
  for (let i = 0; i < stirs.length; i += 1) {
    stirs[i] = `stir #${i + 1}`;
  }
  const expected = [`sleeping for ${sleepTime}ms...`, ...stirs];
  t.deepEqual(stirred, expected);
});
