// @ts-check

/**
 * @template T
 * @typedef {import('@endo/promise-kit').ERef<T>} ERef
 */

/**
 * @template T
 * @typedef {import('@endo/promise-kit').PromiseRecord<T>} PromiseRecord
 */

/**
 * @template T
 * @typedef {{
 *   [Symbol.asyncIterator]: () => AsyncIterator<T, T>
 * }} ConsistentAsyncIterable
 * An AsyncIterable that returns the same type as it yields.
 */

/**
 * @template T
 * @typedef {object} IterationObserver<T>
 * A valid sequence of calls to the methods of an `IterationObserver`
 * represents an iteration. A valid sequence consists of any number of calls
 * to `updateState` with the successive non-final values, followed by a
 * final call to either `finish` with a successful `completion` value
 * or `fail` with the alleged `reason` for failure. After at most one
 * terminating calls, no further calls to these methods are valid and must be
 * rejected.
 * @property {(nonFinalValue: T) => void} updateState
 * @property {(completion: T) => void} finish
 * @property {(reason: any) => void} fail
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {number | undefined} UpdateCount a value used to mark the position
 * in the update stream. For the last state, the updateCount is undefined.
 */

/**
 * @template T
 * @typedef {object} UpdateRecord<T>
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
 * @typedef {object} BaseNotifier<T> an object that can be used to get the
 * current state or updates
 * @property {GetUpdateSince<T>} getUpdateSince return update record as of an
 * update count.
 */

/**
 * @template T
 * @typedef {BaseNotifier<T>} NotifierInternals Will be shared between machines,
 * so it must be safe to expose. But other software should avoid depending on
 * its internal structure.
 */

/**
 * @template T
 * @typedef {BaseNotifier<T> &
 *   ConsistentAsyncIterable<T> &
 *   SharableNotifier<T>
 * } Notifier<T> an object that can be used to get the current state or updates
 */

/**
 * @template T
 * @typedef {object} SharableNotifier
 * @property {() => ERef<NotifierInternals<T>>} getSharableNotifierInternals
 * Used to replicate the multicast values at other sites. To manually create a
 * local representative of a Notification, do
 * ```js
 * localIterable =
 *   makeNotifier(E(remoteIterable).getSharableNotifierInternals());
 * ```
 * The resulting `localIterable` also supports such remote use, and
 * will return access to the same representation.
 */

/**
 * @template T
 * @typedef {object} NotifierRecord<T> the produced notifier/updater pair
 * @property {IterationObserver<T>} updater the (closely-held) notifier producer
 * @property {Notifier<T>} notifier the (widely-held) notifier consumer
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @template T
 * @typedef {{}} BaseSubscription<T>
 */

/**
 * @template T
 * @typedef {object} SubscriptionInternals
 * Will be shared between machines, so it must be safe to expose. But other
 * software should avoid depending on its internal structure.
 * @property {ERef<IteratorResult<T, T>>} head internal only
 * @property {Promise<SubscriptionInternals<T>>} tail internal onli
 */

/**
 * @template T
 * @typedef {BaseSubscription<T> &
 *   ConsistentAsyncIterable<T> &
 *   SharableSubscription<T>} Subscription<T>
 * A form of AsyncIterable supporting distributed and multicast usage.
 */

/**
 * @template T
 * @typedef {object} SharableSubscription
 * @property {() => ERef<SubscriptionInternals<T>>} getSharableSubscriptionInternals
 * Used to replicate the multicast values at other sites. To manually create a
 * local representative of a Subscription, do
 * ```js
 * localIterable =
 *   makeSubscription(E(remoteIterable).getSharableSubscriptionInternals());
 * ```
 * The resulting `localIterable` also supports such remote use, and
 * will return access to the same representation.
 */

/**
 * @template T
 * @typedef {AsyncIterator<T, T> & ConsistentAsyncIterable<T>} SubscriptionIterator<T>
 * an AsyncIterator supporting distributed and multicast usage.
 *
 * @property {() => Subscription<T>} subscribe
 * Get a new subscription whose starting position is this iterator's current
 * position.
 */

/**
 * @template T
 * @typedef {object} SubscriptionRecord<T>
 * @property {IterationObserver<T>} publication
 * @property {Subscription<T>} subscription
 */
