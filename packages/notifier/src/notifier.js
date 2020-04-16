import { producePromise } from '@agoric/produce-promise';
import harden from '@agoric/harden';

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
    if (!currentResponse.updateHandle) {
      throw new Error('Cannot update state after resolve.');
    }

    currentResponse = harden({ value: state, updateHandle: {}, done: false });
    currentPromiseRec.resolve(currentResponse);
    currentPromiseRec = producePromise();
  }

  function resolve(finalState) {
    if (!currentResponse.updateHandle) {
      throw new Error('Cannot resolve again.');
    }

    currentResponse = harden({
      value: finalState,
      updateHandle: undefined,
      done: true,
    });
    currentPromiseRec.resolve(currentResponse);
  }

  // notifier facet is separate so it can be handed out loosely while updater is
  // tightly held
  const notifier = harden({ getUpdateSince });
  const updater = harden({ updateState, resolve });
  return harden({ notifier, updater });
};
