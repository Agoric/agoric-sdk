// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { HandledPromise, E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import './types';

/**
 * @template T
 * @param {MulticastInternals} startP
 * @returns {MulticastIterable<T>}
 */
const makeMulticastIterable = startP => {
  return harden({
    // eslint-disable-next-line no-use-before-define
    [Symbol.asyncIterator]: () => makeMulticastIterator(startP),
    /**
     *
     */
    getSharableInternals: () => startP,
  });
};
harden(makeMulticastIterable);
export { makeMulticastIterable };

/**
 * @template T
 * @param {MulticastInternals} tailP
 * @returns {MulticastIterator<T>}
 */
const makeMulticastIterator = tailP => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return harden({
    snapshot: () => makeMulticastIterable(tailP),
    [Symbol.asyncIterator]: () => makeMulticastIterator(tailP),
    next: () => {
      const resultP = E.G(tailP).head;
      tailP = E.G(tailP).tail;
      return resultP;
    },
  });
};

/**
 * `makeMulticastIterableKit()` makes an entanged `{updater, multicastIterable}`
 * pair which purposely resembles `makeNotifierKit` making an entangled
 * `{updater, notifier}` pair.
 *
 * Both `updater`s have the same API with the same meaning --- to push a
 * sequence of non-final values, terminated with either a final successful
 * completion value or failure reason. In both cases, the other side of the
 * pair---the `multicastIterable` or `notifier`---implements the JavaScript
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
 * `multicastIterator` returned here provides lossless access to the entire
 * stream of non-final values. (Both losslessly report termination.)
 *
 * Of the `{updater, multicastIterable}` pair returned by `makeIterableKit()`,
 * this initial `multicastIterable` represents the stream starting with the
 * first update to the `updater`. Each multicast iterable makes any number of
 * multicast iterators, each of which advance independently starting at that
 * iterable's starting point. These multicast iterators also have a
 * `snapshot()` method which will create a new multicast iterable capturing the
 * iterator's current position as the new iterable's starting point.
 *
 * As is conventional, the multicast iterator is also an multicast iterable that
 * produces an multicast iterator. In this case, it produces a new multicast
 * iterator that advances independently starting from the current position.
 *
 * The internal representation ensure that elements that are no longer
 * observable are unreachable and can be gc'ed.
 *
 * @template T
 * @returns {MulticastIteratorRecord<T>}
 */
const makeMulticastIteratableKit = () => {
  let rear;
  const multicastIterable = makeMulticastIterable(
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
  return harden({ updater, multicastIterable });
};
harden(makeMulticastIteratableKit);
export { makeMulticastIteratableKit };
