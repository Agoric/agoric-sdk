import { producePromise } from '@agoric/produce-promise';
import { E } from '@agoric/eventual-send';
import harden from '@agoric/harden';

/**
 * Adaptor from a notifierP in an async iterable.
 * The notifierP can be any object that has an eventually invokable
 * `getUpdateSince` method that behaves according to the notifier
 * spec. Typically, this will actually be a reference to a
 * possibly-remote notifier. But it is also used internally below
 * so that a notifier itself is an async iterable.
 *
 * An async iterable is an object with a `[Symbol.asyncIterator]()` method
 * that returns an async iterator. The async iterator we return here has only
 * a `next()` method, without the optional `return` and `throw` methods. The
 * omitted methods, if present, would be used by the for/await/of loop to
 * inform the iterator of early termination. But this adaptor would not do
 * anything useful in reaction to this notification.
 *
 * An async iterator's `next()` method returns a promise for an iteration
 * result. An iteration result is a record with `value` and `done` properties,
 * where the `value` property's value might be a promise for the next
 * iteration variable.
 */
export function makeAsyncIterable(notifierP) {
  return harden({
    [Symbol.asyncIterator]: () => {
      let myHandle;
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
            myIterationResultP = E(notifierP)
              .getUpdateSince(myHandle)
              .then(({ value, updateHandle, done }) => {
                myHandle = updateHandle;
                if (!done) {
                  // Once the outstanding question has been answered, stop
                  // using that answer, so any further `next()` questions
                  // cause a new `getUpdateSince` request.
                  //
                  // But only if more answers are expected. Once the notifier
                  // is `done`, that was the last answer do reuse it forever.
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
}

/**
 * Produces a pair of objects, which allow a service to produce a stream of
 * update promises. The notifier has a single method: getUpdatesSince, while the
 * updater has two methods, updateState and resolve. getUpdateSince can be
 * called repeatedly to get access to a sequence of update records.
 * Each update is a record containing { value, updateHandle, done }.
 *   value is whatever state the service wants to publish,
 *   updateHandle is an opaque object that identifies the update.
 *   done is a boolean that remains false until the stream reaches a final state
 *
 * getUpdateSince(handle) returns the record above, or a HandledPromise for it.
 * If the handle argument is omitted or differs from the current handle, the
 * current record is returned. If the handle corresponds to the current state,
 * a promise is returned. After the next state change, The promise will resolve
 * to the then-current value of the record.
 *
 * updateState(state) sets a new state and resolves the outstanding promise.
 * resolve(finalState) sets the new state, sends a final update, and freezes the
 * updater. The updater object should be closely held, as anyone with access to
 * it can provide updates.
 */
export const produceNotifier = () => {
  let currentPromiseRec = producePromise();
  let currentResponse = harden({
    value: undefined,
    updateHandle: {},
    done: false,
  });

  function getUpdateSince(updateHandle = undefined) {
    if (updateHandle === currentResponse.updateHandle) {
      return currentPromiseRec.promise;
    }
    return currentResponse;
  }

  function updateState(state) {
    if (currentResponse.done) {
      throw new Error('Cannot update state after resolve.');
    }
    currentResponse = harden({ value: state, updateHandle: {}, done: false });
    currentPromiseRec.resolve(currentResponse);
    currentPromiseRec = producePromise();
  }

  function resolve(finalState) {
    if (currentResponse.done) {
      throw new Error('Cannot resolve again.');
    }

    currentResponse = harden({
      value: finalState,
      updateHandle: undefined,
      done: true,
    });
    currentPromiseRec.resolve(currentResponse);
  }

  // notifier facet is separate so it can be handed out loosely while updater
  // is tightly held
  const notifier = harden({
    getUpdateSince,
    ...makeAsyncIterable(harden({ getUpdateSince })),
  });
  const updater = harden({ updateState, resolve });
  return harden({ notifier, updater });
};
