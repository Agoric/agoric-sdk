// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { HandledPromise, E } from '@agoric/eventual-send';
import { makePromiseKit } from '@agoric/promise-kit';

import './types';

/**
 * @template T
 * @param {MulticastInternals} startP
 * @returns {Multicaster<T>}
 */
const makeMulticaster = startP => {
  return harden({
    // eslint-disable-next-line no-use-before-define
    [Symbol.asyncIterator]: () => makeMulticastIterator(startP),
    /**
     *
     */
    getSharableInternals: () => startP,
  });
};
harden(makeMulticaster);
export { makeMulticaster };

/**
 * @template T
 * @param {MulticastInternals} tailP
 * @returns {MulticastIterator<T>}
 */
const makeMulticastIterator = tailP => {
  // To understand the implementation, start with
  // https://web.archive.org/web/20160404122250/http://wiki.ecmascript.org/doku.php?id=strawman:concurrency#infinite_queue
  return harden({
    snapshot: () => makeMulticaster(tailP),
    [Symbol.asyncIterator]: () => makeMulticastIterator(tailP),
    next: () => {
      const resultP = E.G(tailP).head;
      tailP = E.G(tailP).tail;
      return resultP;
    },
  });
};

/**
 * `makeMulticasterKit()` makes an entanged `{updater, multicaster}`
 * pair which purposely resembles `makeNotifierKit` making an entangled
 * `{updater, notifier}` pair.
 *
 * Both `updater`s have the same API with the same meaning --- to push a
 * sequence of non-final values, terminated with either a final successful
 * completion value or failure reason. In both cases, the other side of the
 * pair---the `multicaster` or `notifier`---implements the JavaScript
 * standard async iteratable API, and so may be read using a JavaScript
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
 * Of the `{updater, multicaster}` pair returned by `makeMulticasterKit()`,
 * this initial `multicaster` represents the stream starting with the
 * first update to the `updater`. Each multicaster makes any number of
 * multicast iterators, each of which advance independently starting at that
 * iterable's starting point. These multicast iterators also have a
 * `snapshot()` method which will create a new multicaster capturing the
 * iterator's current position as the new iterable's starting point.
 *
 * As is conventional, the iterator is itself also an iterable.
 * Here this means the multicast iterator is also a multicaster
 * (a kind of iterable) that produces a multicast iterator. In this case,
 * it produces a new multicast iterator that advances independently starting
 * from the current position.
 *
 * The internal representation ensures that elements that are no longer
 * observable are unreachable and can be gc'ed.
 *
 * @template T
 * @returns {MulticasterRecord<T>}
 */
const makeMulticasterKit = () => {
  let rear;
  const multicaster = makeMulticaster(new HandledPromise(r => (rear = r)));

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
  return harden({ updater, multicaster });
};
harden(makeMulticasterKit);
export { makeMulticasterKit };
