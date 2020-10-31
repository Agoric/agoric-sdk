// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { HandledPromise, E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import './types';

const makeAsyncIterable = startP => {
  return harden({
    // eslint-disable-next-line no-use-before-define
    [Symbol.asyncIterator]: () => makeAsyncIterator(startP),
    /**
     * 
     */
    getSharableInternals: () => startP,
  });
};
harden(makeAsyncIterable);
export { makeAsyncIterable };

// To understand the implementation, start with
// https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
const makeAsyncIterator = tailP => {
  return harden({
    snapshot: () => makeAsyncIterable(tailP),
    [Symbol.asyncIterator]: () => makeAsyncIterator(tailP),
    next: () => {
      const resultP = E.G(tailP).head;
      tailP = E.G(tailP).tail;
      return resultP;
    },
  });
};

/**
 * `makeIterableKit()` makes an entanged `{updater, asyncIterable}` pair
 * which purposely resembles `makeNotifier` making an entangled
 * `{updater, notifier}` pair.
 *
 * Both `updater`s have the same API with the same meaning --- to push a
 * sequence of non-final values, terminated with either a final successful
 * completion value or failure reason. In both cases, the other side of the
 * pair---the `asyncIterable` or `notifier`---implements the JavaScript
 * standard async iterator API, and so may be read using a JavaScript
 * `for-await-of` loop.
 *
 * In both cases, all the non-final values read will be non-final values pushed
 * into their `updater` and in the same order. Both will terminate according to
 * the termination signal pushed into their `updater`. Both support efficient
 * distributed multicast operation.
 *
 * However, they serve different purposes and admit different optimizations.
 * The `notifier` is lossy on non-final values, under the assumption that the
 * consumers are only ever interested in the most recent value. The
 * `asyncIterator` returned here provides lossless access to the entire stream
 * of non-final values. (Both losslessly report termination.)
 *
 * Of the `{updater, asyncIterable}` pair returned by `makeIterableKit()`,
 * this initial `asyncIteratable` represents the stream starting with the first
 * update to the `updater`. Each iterable makes any number of async iterators
 * each of which advance independently starting at that iterable's starting
 * point. These async iterators also have a `snapshot()` method which will
 * create a new async iterable capturing the iterator's current position as
 * the new iterable's starting point.
 *
 * As is conventional, the async iterator is also an async iterable that
 * produces an async iterator. In this case, it produces a new async iterator
 * that advances independently starting from the current position.
 *
 * The internal representation ensure that elements that are no longer
 * observable are unreachable and can be gc'ed.
 */
const makeAsyncIteratableKit = () => {
  let rear;
  const asyncIteratable = makeAsyncIterable(
    new HandledPromise(r => (rear = r)),
  );

  const updater = harden({
    updateState: value => {
      if (rear === undefined) {
        throw new Error('Cannot update state after termination.');
      }
      const { promise: nextTailE, resolve: nextRear } = makePromiseKit();
      rear(harden({ head: { value, done: false }, tail: nextTailE }));
      rear = nextRear;
    },
    finish: finalValue => {
      if (rear === undefined) {
        throw new Error('Cannot finish after termination.');
      }
      const readComplaint = HandledPromise.reject(
        new Error('cannot read past end of iteration'),
      );
      rear({ head: { value: finalValue, done: true }, tail: readComplaint });
      rear = undefined;
    },
    fail: reason => {
      if (rear === undefined) {
        throw new Error('Cannot fail after termination.');
      }
      rear(HandledPromise.reject(reason));
      rear = undefined;
    },
  });
  return harden({ updater, asyncIteratable });
};
harden(makeAsyncIteratableKit);
export { makeAsyncIteratableKit };
