// @ts-check
import { test } from 'tape-promise/tape';
import { makeBlocker, registerBlocker, getBlockerFromMeta } from '../swingBlocker.js';

test('sync with immediate result', t => {
  let pollCount = 0;
  const blocker = makeBlocker(() => {
    pollCount += 1;
    return 123;
  })

  t.equals(blocker(), 123, 'blocker returns correctly');
  t.equals(pollCount, 1, 'only one poll was done');
  t.end();
});

test('sync after some polling', t => {
  const meta = { type: 'foo' };
  const blockerFactory = (_meta, poll) => makeBlocker(poll);
  registerBlocker(meta.type, blockerFactory);

  let pollCount = 0;
  const blocker =  getBlockerFromMeta(meta, () => {
    pollCount += 1;
    if (pollCount < 5) {
      // Keep polling.
      return undefined;
    }
    return 123;
  });

  t.equals(blocker(), 123, 'blocker returns correctly');
  t.equals(pollCount, 5, 'exactly five polls were done');
  t.equals(blocker(), 123, 'second blocker returns');
  t.equals(pollCount, 6, 'just one more poll was done');
  t.end();
});
