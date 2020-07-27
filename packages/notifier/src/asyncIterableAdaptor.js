import { E } from '@agoric/eventual-send';
import harden from '@agoric/harden';
// eslint-disable-next-line import/no-cycle
import { makeNotifierKit } from './notifier';

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
 */
export const makeAsyncIterableFromNotifier = notifierP => {
  return harden({
    [Symbol.asyncIterator]: () => {
      let localUpdateCount;
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
            // air, all further asks should just use the result of that one.
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
 * This reads from `iteratorP` updating `updater` with each successive value.
 * `iteratorP` can be a sync or async iterator, or a promise for a local or
 * remote iterator, or a presence of a remote iterator. When `iteratorP` is
 * done, `updater` is resoved, so that the corresponding notifier is
 * also done.
 *
 * The `updater` must be local and is called synchronously, so this adapter
 * must be co-located with the updater.
 */
export const updateFromIterator = (updater, iteratorP) => {
  E(iteratorP)
    .next()
    .then(
      ({ value, done }) => {
        if (done) {
          E.when(value, finalState => updater.finish(finalState));
        } else {
          E.when(value, state => updater.updateState(state));
          updateFromIterator(updater, iteratorP);
        }
      },
      reason => updater.reject(reason),
    );
};

/**
 * Adaptor from async iterable to notifier.
 */
export const makeNotifierFromAsyncIterable = asyncIterable => {
  const iterator = asyncIterable[Symbol.asyncIterator]();
  const { notifier, updater } = makeNotifierKit();
  updateFromIterator(updater, iterator);
  return notifier;
};
