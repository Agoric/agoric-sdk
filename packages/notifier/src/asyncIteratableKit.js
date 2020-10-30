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
     * To manually create a local representative of a
     * this kind of remote async interable, do
     * ```js
     * localIterable = makeAsyncIterable(E(remoteIterable).getEventualList());
     * ```
     * The resulting localIterable also support such remote use, and
     * will return access to the same representation.
     */
    getEventualList: () => startP,
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
 * This makes a pair of an `updater` and an initial `asyncIteratable`. The
 * `updater` API is the same as the Notifier's `updater`. In both cases,  calls
 * to the `updater` produce a stream of non-final values terminated with
 * either a final success value or a final failure reason. The purpose of the
 * notifier is to be lossy over the non-final values. The purpose of the
 * asyncIterableKit is to consume such streams losslessly.
 *
 * The initial `asyncIteratable` represents the stream starting with the first
 * update to the `updater`. It makes async iterators each of which advance
 * independently starting at that starting point. An async iterator has a
 * `snapshot()` method which will create a new async iterable capturing the
 * iterator's current position as its starting point.
 *
 * As is conventional, the async iterator is also an async iterable that
 * produces an async iterator. In this case, it is a new async iterator that
 * advances independently starting from the current position.
 *
 * The internal representation ensure that eements that are no longer
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
