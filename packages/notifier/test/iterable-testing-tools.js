// @ts-check
import '@agoric/install-ses';
import { E } from '@agoric/eventual-send';
import { observeIteration } from '../src/index';

const obj = harden({});
const unresP = new Promise(_ => {});
const rejP = Promise.reject(new Error('foo'));
rejP.catch(_ => {}); // Suppress Node UnhandledPromiseRejectionWarning

/**
 * @typedef {*} Passable
 * A value that can be passed between vats.
 * TODO This type should be exported by `@agoric/marshal` and imported here.
 * TODO For these tools to be used for distributed operation, we need a less
 * precise comparison than `t.is` when testing that these values have arrived.
 */

/**
 * The non-final test values to be produced and tested for.
 *
 * @type {Passable[]}
 */
const payloads = harden([1, -0, undefined, NaN, obj, unresP, rejP, null]);

/**
 * The value to be used and tested for as the completion value for a successful
 * finish.
 *
 * @type {Passable}
 */
const refResult = harden({});

/**
 * The value to be used and tested for as the reason for an unsuccessful
 * failure.
 */
const refReason = new Error('bar');

/**
 * Returns an AsyncIterable that enumerates the successive `payload` values
 * above in order. It then terminates either by successfully finishing or by
 * failing according to the `fails` parameter. If it finishes successfully,
 * `refResult` is the completion. If it fails, `refReason` is reported as the
 * reason for failure.
 *
 * @param {boolean} fails Does the returned async iterable finish successfully
 * or fail?
 * @returns {AsyncIterable<Passable>}
 */
const makeTestIterable = fails => {
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

export const finiteStream = makeTestIterable(false);
export const explodingStream = makeTestIterable(true);

export const testEnding = (t, p, fails) => {
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

const skip = (i, value, lossy) => {
  if (!lossy) {
    return i;
  }
  while (i < payloads.length && !Object.is(value, payloads[i])) {
    i += 1;
  }
  return i;
};

export const testManualConsumer = (t, iterable, lossy = false) => {
  const iterator = iterable[Symbol.asyncIterator]();
  const testLoop = i => {
    return iterator.next().then(
      ({ value, done }) => {
        i = skip(i, value, lossy);
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

export const testAutoConsumer = async (t, iterable, lossy = false) => {
  let i = 0;
  try {
    for await (const value of iterable) {
      i = skip(i, value, lossy);
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

export const makeTestUpdater = (t, lossy, fails) => {
  let i = 0;
  return harden({
    updateState(newState) {
      i = skip(i, newState, lossy);
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

// See the Paula example code in the README
export const paula = iterationObserver => {
  // Paula the publisher says
  iterationObserver.updateState('a');
  iterationObserver.updateState('b');
  iterationObserver.finish('done');
};

// See the Alice example code in the README
export const alice = async asyncIterable => {
  const log = [];

  try {
    for await (const val of asyncIterable) {
      log.push(['non-final', val]);
    }
    log.push(['finished']);
  } catch (reason) {
    log.push(['failed', reason]);
  }
  return log;
};

// See the Bob example code in the README
export const bob = async asyncIterableP => {
  const log = [];
  const observer = harden({
    updateState: val => log.push(['non-final', val]),
    finish: completion => log.push(['finished', completion]),
    fail: reason => log.push(['failed', reason]),
  });
  await observeIteration(asyncIterableP, observer);
  return log;
};
