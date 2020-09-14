/**
 * @template T
 * @typedef {import('@agoric/promise-kit').ERef<T>} ERef
 */

/**
 * @template T
 * @typedef {import('@agoric/promise-kit').PromiseRecord<T>} PromiseRecord
 */

/**
 * @typedef {number | undefined} UpdateCount a value used to mark the position
 * in the update stream. For the last state, the updateCount is undefined.
 */

/**
 * @template T
 * @typedef {Object} UpdateRecord<T>
 * @property {T} value is whatever state the service wants to publish
 * @property {UpdateCount} updateCount is a value that identifies the update
 */

/**
 * @template T
 * @callback GetUpdateSince<T> Can be called repeatedly to get a sequence of
 * update records
 * @param {UpdateCount} [updateCount] return update record as of an update
 * count. If the `updateCount` argument is omitted or differs from the current
 * update count, return the current record.
 * Otherwise, after the next state change, the promise will resolve to the
 * then-current value of the record.
 * @returns {Promise<UpdateRecord<T>>} resolves to the corresponding
 * update
 */

/**
 * @template T
 * @typedef {Object} BaseNotifier<T> an object that can be used to get the current
 * state or updates
 * @property {GetUpdateSince<T>} getUpdateSince return update record as of an
 * update count.
 */

/**
 * @template T
 * @typedef {BaseNotifier<T> & AsyncIterable<T>} Notifier<T> an object that can
 * be used to get the current state or updates
 */

/**
 * @template T
 * @typedef {Object} Updater<T> an object that should be closely held, as
 * anyone with access to
 * it can provide updates
 * @property {(state: T) => void} updateState sets the new state, and resolves
 * the outstanding promise to send an update
 * @property {(finalState: T) => void} finish sets the final state, sends a
 * final update, and freezes the
 * updater
 * @property {(reason: any) => void} fail the stream becomes erroneously
 * terminated, allegedly for the stated reason, which is normally an
 * instanceof `Error`.
 */

/**
 * @template T
 * @typedef {Object} NotifierRecord<T> the produced notifier/updater pair
 * @property {Notifier<T>} notifier the (widely-held) notifier consumer
 * @property {Updater<T>} updater the (closely-held) notifier producer
 */
