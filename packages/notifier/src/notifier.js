// @ts-check
// eslint-disable-next-line spaced-comment
/// <reference types="ses"/>

import { producePromise } from '@agoric/produce-promise';

/**
 * @typedef {Object} UpdateHandle a value used to mark the position in the update stream
 */

/**
 * @template T the type of the state value
 * @typedef {Object} UpdateRecord<T>
 * @property {T} value is whatever state the service wants to publish
 * @property {UpdateHandle} updateHandle is a value that identifies the update
 * @property {boolean} done false until the updater publishes a final state
 */

/**
 * @template T the type of the notifier state
 * @callback GetUpdateSince<T> Can be called repeatedly to get a sequence of update records
 * @param {UpdateHandle} [updateHandle] return update record as of a handle
 * If the handle argument is omitted or differs from the current handle, return the current record.
 * Otherwise, after the next state change, the promise will resolve to the then-current value of the record.
 * @returns {Promise<UpdateRecord<T>>} resolves to the corresponding update
 */

/**
 * @template T the type of the notifier state
 * @typedef {Object} Notifier<T> an object that can be used to get the current state or updates
 * @property {GetUpdateSince<T>} getUpdateSince return update record as of a handle
 * @property {() => UpdateRecord<T>} getCurrentUpdate return the current update record
 */

/**
 * @template T the type of the notifier state
 * @typedef {Object} Updater<T> an object that should be closely held, as anyone with access to
 * it can provide updates
 * @property {(state: T) => void} updateState sets the new state, and resolves the outstanding promise to send an update
 * @property {(finalState: T) => void} resolve sets the final state, sends a final update, and freezes the
 * updater
 */

/**
 * @template T the type of the notifier state
 * @typedef {Object} NotifierRecord<T> the produced notifier/updater pair
 * @property {Notifier<T>} notifier the (widely-held) notifier consumer
 * @property {Updater<T>} updater the (closely-held) notifier producer
 */

/**
 * Produces a pair of objects, which allow a service to produce a stream of
 * update promises.
 *
 * @template T the type of the notifier state
 * @param {T} [initialState] the first state to be returned
 * @returns {NotifierRecord<T>} the notifier and updater
 */
export const produceNotifier = (initialState = undefined) => {
  let currentPromiseRec = producePromise();
  let currentResponse = harden({
    value: initialState,
    updateHandle: {},
    done: false,
  });

  function getCurrentUpdate() {
    return currentResponse;
  }

  function getUpdateSince(updateHandle = undefined) {
    if (updateHandle === currentResponse.updateHandle) {
      return currentPromiseRec.promise;
    }
    return Promise.resolve(currentResponse);
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
  const notifier = harden({ getUpdateSince, getCurrentUpdate });
  const updater = harden({ updateState, resolve });
  return harden({ notifier, updater });
};
