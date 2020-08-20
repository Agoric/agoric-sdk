// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { E } from '@agoric/eventual-send';

import './types';

/**
 * Adaptor from a notifierP to an async iterable.
 * The notifierP can be any object that has an eventually invokable
 * `getUpdateSince` method that behaves according to the notifier
 * spec. This can be a notifier, a promise for a local or remote
 * notfier, or a presence of a remote notifier.
 *
 * It is also used internally by notifier.js so that a notifier itself is an
 * async iterable.
 *
 * An async iterable is an object with a `[Symbol.asyncIterator]()` method
 * that returns an async iterator. The async iterator we return here has only
 * a `next()` method, without the optional `return` and `throw` methods. The
 * omitted methods, if present, would be used by the for/await/of loop to
 * inform the iterator of early termination. But this adaptor would not do
 * anything useful in reaction to this notification.
 *
 * An async iterator's `next()` method returns a promise for an iteration
 * result. An iteration result is a record with `value` and `done` properties.
 *
 * The purpose of building on the notifier protocol is to have a lossy
 * adaptor, where intermediate results can be missed in favor of more recent
 * results which are therefore less stale. See
 * https://github.com/Agoric/documentation/blob/master/main/distributed-programming.md#notifiers
 *
 * @template T
 * @param {ERef<BaseNotifier<T>>} notifierP
 * @returns {AsyncIterable<T>}
 */
export const makeAsyncIterableFromNotifier = notifierP => {
  return harden({
    [Symbol.asyncIterator]: () => {
      /** @type {UpdateCount} */
      let localUpdateCount;
      /** @type {Promise<{value: T, done: boolean}> | undefined} */
      let myIterationResultP;
      return harden({
        next: () => {
          if (!myIterationResultP) {
            // In this adaptor, once `next()` is called and returns an
            // unresolved promise, `myIterationResultP`, and until
            // `myIterationResultP` is fulfilled with an
            // iteration result, further `next()` calls will return the same
            // `myIterationResultP` promise again without asking the notifier
            // for more updates. If there's already an unanswered ask in the
            // air, all further asks should just reuse the result of that one.
            //
            // This reuse behavior is only needed for code that uses the async
            // iterator protocol explicitly. When this async iterator is
            // consumed by a for/await/of loop, `next()` will only be called
            // after the promise for the previous iteration result has
            // fulfilled. If it fulfills with `done: true`, the for/await/of
            // loop will never call `next()` again.
            //
            // See
            // https://2ality.com/2016/10/asynchronous-iteration.html#queuing-next()-invocations
            // for an explicit use that sends `next()` without waiting.
            myIterationResultP = E(notifierP)
              .getUpdateSince(localUpdateCount)
              .then(({ value, updateCount }) => {
                localUpdateCount = updateCount;
                const done = localUpdateCount === undefined;
                if (!done) {
                  // Once the outstanding question has been answered, stop
                  // using that answer, so any further `next()` questions
                  // cause a new `getUpdateSince` request.
                  //
                  // But only if more answers are expected. Once the notifier
                  // is `done`, that was the last answer so reuse it forever.
                  myIterationResultP = undefined;
                }
                return harden({ value, done });
              });
          }
          return myIterationResultP;
        },
      });
    },
  });
};

/**
 * This reads from `asyncIteratable` updating `updater` with each successive
 * value. The `updater` the same API as the `updater` of a notifier kit,
 * but can simply be an observer to react to these updates. As an observer,
 * the `updater` may only be interested in certain occurrences (`updateState`,
 * `finish`, `fail`), so for convenience, `updateFromIterable` feature
 * tests for those methods before calling them.
 *
 * @template T
 * @param {Partial<Updater<T>>} updater
 * @param {AsyncIterable<T>} asyncIterable
 * @returns {Promise<undefined>}
 */
// See https://github.com/Agoric/agoric-sdk/issues/1345 for why
// `updateFromIterable` currently needs a local `asyncIterable` rather than
// a possibly remote `asyncIterableP`.
export const updateFromIterable = (updater, asyncIterable) => {
  const iterator = asyncIterable[Symbol.asyncIterator]();
  return new Promise(ack => {
    const recur = () => {
      E.when(
        iterator.next(),
        ({ value, done }) => {
          if (done) {
            updater.finish && updater.finish(value);
            ack();
          } else {
            updater.updateState && updater.updateState(value);
            recur();
          }
        },
        reason => {
          updater.fail && updater.fail(reason);
          ack();
        },
      );
    };
    recur();
  });
};

/**
 * As updates come in from the possibly remote `notifierP`, update
 * the local `updater`. Since the updates come from a notifier, they
 * are lossy, i.e., once a more recent state can be reported, less recent
 * states are assumed irrelevant and dropped.
 *
 * @template T
 * @param {Partial<Updater<T>>} updater
 * @param {ERef<Notifier<T>>} notifierP
 * @returns {Promise<undefined>}
 */
export const updateFromNotifier = (updater, notifierP) =>
  updateFromIterable(updater, makeAsyncIterableFromNotifier(notifierP));
