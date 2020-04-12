// @ts-check
import { test } from 'tape-promise/tape';
import {
  RETRY_POLL,
  makeBlocker,
  registerBlocker,
  getBlockerWithPoll,
} from '../swingBlocker.js';

test('sync with immediate result', t => {
  let pollCount = 0;
  const blocker = makeBlocker(n => {
    pollCount += 1;
    return 123 + n;
  });

  t.equals(blocker(1), 124, 'blocker returns correctly');
  t.equals(pollCount, 1, 'only one poll was done');
  t.end();
});

test('sync after some polling', async t => {
  try {
    /**
     * @type {import('../swingBlocker.js').BlockerSpec}
     */
    const fooSpec = { type: 'foo', scope: 'Stack' };
    const blockerFactory = (spec, poll) => {
      t.deepEquals(spec, fooSpec, `expected spec`);
      return makeBlocker(poll);
    };
    registerBlocker(fooSpec, blockerFactory);

    // Ensure we can only be used with Stack scope.
    t.throws(
      () => getBlockerWithPoll(fooSpec, n => n, 'Kernel'),
      RangeError,
      'Kernel min scope is denied',
    );
    t.assert(
      getBlockerWithPoll(fooSpec, n => n, 'Inline'),
      'Inline min scope is allowed',
    );

    let pollCount = 0;
    const blocker = getBlockerWithPoll(fooSpec, n => {
      pollCount += 1;
      if (pollCount < 5) {
        // Keep polling.
        return RETRY_POLL;
      }
      return 123 + n;
    });

    let doneBlocking = false;
    const pr = Promise.resolve().then(_ => {
      t.assert(doneBlocking, 'Promise only resolves after blocking');
    });
    t.equals(blocker(3), 126, 'blocker returns correctly');
    t.equals(pollCount, 5, 'exactly five polls were done');
    t.equals(blocker(2), 125, 'second blocker returns');
    t.equals(pollCount, 6, 'just one more poll was done');
    doneBlocking = true;
    await pr;
  } catch (e) {
    t.isNot(e, e, 'unexpected exception');
  } finally {
    t.end();
  }
});
