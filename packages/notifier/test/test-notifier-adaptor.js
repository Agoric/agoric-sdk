// @ts-check
import '@agoric/install-ses';
import { E } from '@agoric/eventual-send';
import test from 'tape-promise/tape';
import {
  makeAsyncIterableFromNotifier,
  makeNotifierFromAsyncIterable,
  updateFromIterable,
  updateFromNotifier,
} from '../src/index';

const obj = harden({});
const unresP = new Promise(_ => {});
const rejP = Promise.reject(new Error('foo'));
rejP.catch(_ => {}); // Suppress Node UnhandledPromiseRejectionWarning
const payloads = harden([1, -0, undefined, NaN, obj, unresP, rejP, null]);

const refReason = new Error('bar');
const refResult = harden({});

const makeIterable = fails => {
  return harden({
    [Symbol.asyncIterator]() {
      let i = 0;
      return harden({
        next() {
          if (i < payloads.length) {
            const value = payloads[i];
            i += 1;
            return Promise.resolve(harden({ value, done: false }));
          }
          if (fails) {
            return Promise.reject(refReason);
          }
          return Promise.resolve(harden({ value: refResult, done: true }));
        },
      });
    },
  });
};

const finiteStream = makeIterable(false);
const explodingStream = makeIterable(true);

const testEnding = (t, p, fails) => {
  return E.when(
    p,
    result => {
      t.equal(fails, false);
      t.equal(result, refResult);
      return t.end();
    },
    reason => {
      t.equal(fails, true);
      t.equal(reason, refReason);
      return t.end();
    },
  );
};

const skip = (i, value, lossy) => {
  if (!lossy) {
    return i;
  }
  while (i < payloads.length && !Object.is(value, payloads[i])) {
    i += 1;
  }
  return i;
};

const testManualConsumer = (t, iterable, lossy) => {
  const iterator = iterable[Symbol.asyncIterator]();
  const testLoop = i => {
    return iterator.next().then(
      ({ value, done }) => {
        if (done) {
          t.equal(i, payloads.length);
          return value;
        }
        i = skip(i, value, lossy);
        t.assert(i < payloads.length);
        // Need precise equality
        t.assert(Object.is(value, payloads[i]));
        return testLoop(i + 1);
      },
      reason => {
        t.equal(i, payloads.length);
        throw reason;
      },
    );
  };
  return testLoop(0);
};

const testAutoConsumer = async (t, iterable, lossy) => {
  let i = 0;
  try {
    for await (const value of iterable) {
      i = skip(i, value, lossy);
      t.assert(i < payloads.length);
      // Need precise equality
      t.assert(Object.is(value, payloads[i]));
      i += 1;
    }
  } finally {
    t.equal(i, payloads.length);
  }
  // The for-await-of loop cannot observe the final value of the iterator
  // so this consumer cannot test what that was. Just return what testEnding
  // expects.
  return refResult;
};

const makeTestUpdater = (t, lossy, fails) => {
  let i = 0;
  return harden({
    updateState(newState) {
      i = skip(i, newState, lossy);
      t.assert(i < payloads.length);
      // Need precise equality
      t.assert(Object.is(newState, payloads[i]));
      i += 1;
    },
    finish(finalState) {
      t.equal(fails, false);
      t.equal(finalState, refResult);
      return t.end();
    },
    fail(reason) {
      t.equal(fails, true);
      t.equal(reason, refReason);
      return t.end();
    },
  });
};

test('async iterator - manual finishes', async t => {
  const p = testManualConsumer(t, finiteStream, false);
  return testEnding(t, p, false);
});

test('async iterator - manual fails', async t => {
  const p = testManualConsumer(t, explodingStream, false);
  return testEnding(t, p, true);
});

test('async iterator - for await finishes', async t => {
  const p = testAutoConsumer(t, finiteStream, false);
  return testEnding(t, p, false);
});

test('async iterator - for await fails', async t => {
  const p = testAutoConsumer(t, explodingStream, false);
  return testEnding(t, p, true);
});

test('notifier adaptor - manual finishes', async t => {
  const n = makeNotifierFromAsyncIterable(finiteStream);
  const finiteUpdates = makeAsyncIterableFromNotifier(n);
  const p = testManualConsumer(t, finiteUpdates, true);
  return testEnding(t, p, false);
});

test('notifier adaptor - manual fails', async t => {
  const n = makeNotifierFromAsyncIterable(explodingStream);
  const explodingUpdates = makeAsyncIterableFromNotifier(n);
  const p = testManualConsumer(t, explodingUpdates, true);
  return testEnding(t, p, true);
});

test('notifier adaptor - for await finishes', async t => {
  const n = makeNotifierFromAsyncIterable(finiteStream);
  const finiteUpdates = makeAsyncIterableFromNotifier(n);
  const p = testAutoConsumer(t, finiteUpdates, true);
  return testEnding(t, p, false);
});

test('notifier adaptor - for await fails', async t => {
  const n = makeNotifierFromAsyncIterable(explodingStream);
  const explodingUpdates = makeAsyncIterableFromNotifier(n);
  const p = testAutoConsumer(t, explodingUpdates, true);
  return testEnding(t, p, true);
});

test('notifier adaptor - update from iterator finishes', t => {
  const u = makeTestUpdater(t, false, false);
  return updateFromIterable(u, finiteStream);
});

test('notifier adaptor - update from iterator fails', t => {
  const u = makeTestUpdater(t, false, true);
  return updateFromIterable(u, explodingStream);
});

test('notifier adaptor - update from notifier finishes', t => {
  const u = makeTestUpdater(t, true, false);
  const n = makeNotifierFromAsyncIterable(finiteStream);
  return updateFromNotifier(u, n);
});

test('notifier adaptor - update from notifier fails', t => {
  const u = makeTestUpdater(t, true, true);
  const n = makeNotifierFromAsyncIterable(explodingStream);
  return updateFromNotifier(u, n);
});
