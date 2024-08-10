/* global setImmediate setTimeout */
import { test } from '../tools/prepare-test-env-ava.js';

test('Promise queue should be higher priority than IO/timer queue', async t => {
  const log = [];
  setImmediate(() => log.push(1));
  setImmediate(() => {
    log.push(2);
    void Promise.resolve().then(() => log.push(4));
    log.push(3);
  });
  setImmediate(() => log.push(5));
  setImmediate(() => log.push(6));

  let r;
  const p = new Promise(r0 => (r = r0));
  setTimeout(() => r(), 0.1 * 1000);
  await p;

  t.deepEqual(log, [1, 2, 3, 4, 5, 6]);
});
