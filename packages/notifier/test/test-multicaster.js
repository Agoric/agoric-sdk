// @ts-check
import '@agoric/install-ses';
import { E } from '@agoric/eventual-send';
import test from 'ava';
import { updateFromIterable } from '../src/index';

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
      t.is(fails, false);
      t.is(result, refResult);
    },
    reason => {
      t.is(fails, true);
      t.is(reason, refReason);
    },
  );
};

const testManualConsumer = (t, iterable) => {
  const iterator = iterable[Symbol.asyncIterator]();
  const testLoop = i => {
    return iterator.next().then(
      ({ value, done }) => {
        if (done) {
          t.is(i, payloads.length);
          return value;
        }
        t.truthy(i < payloads.length);
        // Need precise equality
        t.truthy(Object.is(value, payloads[i]));
        return testLoop(i + 1);
      },
      reason => {
        t.truthy(i <= payloads.length);
        throw reason;
      },
    );
  };
  return testLoop(0);
};

const testAutoConsumer = async (t, iterable) => {
  let i = 0;
  try {
    for await (const value of iterable) {
      t.truthy(i < payloads.length);
      // Need precise equality
      t.truthy(Object.is(value, payloads[i]));
      i += 1;
    }
  } finally {
    t.truthy(i <= payloads.length);
  }
  // The for-await-of loop cannot observe the final value of the iterator
  // so this consumer cannot test what that was. Just return what testEnding
  // expects.
  return refResult;
};

const makeTestUpdater = (t, fails) => {
  let i = 0;
  return harden({
    updateState(newState) {
      t.truthy(i < payloads.length);
      // Need precise equality
      t.truthy(Object.is(newState, payloads[i]));
      i += 1;
    },
    finish(finalState) {
      t.is(fails, false);
      t.is(finalState, refResult);
    },
    fail(reason) {
      t.is(fails, true);
      t.is(reason, refReason);
    },
  });
};

test('async iterator - manual finishes', async t => {
  const p = testManualConsumer(t, finiteStream);
  return testEnding(t, p, false);
});

test('async iterator - manual fails', async t => {
  const p = testManualConsumer(t, explodingStream);
  return testEnding(t, p, true);
});

test('async iterator - for await finishes', async t => {
  const p = testAutoConsumer(t, finiteStream);
  return testEnding(t, p, false);
});

test('async iterator - for await fails', async t => {
  const p = testAutoConsumer(t, explodingStream);
  return testEnding(t, p, true);
});

test('multicaster adaptor - update from iterator finishes', t => {
  const u = makeTestUpdater(t, false);
  return updateFromIterable(u, finiteStream);
});
