// @ts-check

/**
 * @template T
 * @typedef {import('@endo/far').ERef<T>} ERef
 */

/**
 * @template T
 * @typedef {import('@endo/promise-kit').PromiseKit<T>} PromiseKit
 */

/**
 * Deprecated. Use PromiseKit instead.
 *
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
 * @template T
 * @typedef {object} PublicationRecord
 * @property {IteratorResult<T>} head
 * @property {bigint} publishCount
 * @property {PublicationList<T>} tail
 */

/**
 * @template T
 * @typedef {ERef<PublicationRecord<T>>} PublicationList
 * Will be shared between machines, so it must be safe to expose. But other
 * software should consider it opaque, not depending on its internal structure.
 */

/**
 * @template T
 * @typedef {object} Subscriber
 * @property {(publishCount?: bigint) => PublicationList<T>} subscribeAfter
 * Internally used to get the "current" SharableSubscriptionInternals
 * in order to make a subscription iterator that starts there.
 * The answer is "current" in that it was accurate at some moment between
 * when you asked and when you got the answer.
 */

/**
 * @template T
 * @typedef {object} Publisher
 * A valid sequence of calls to the methods of an `IterationObserver`
 * represents an iteration. A valid sequence consists of any number of calls
 * to `publish` with the successive non-final values, followed by a
 * final call to either `finish` with a successful `completion` value
 * or `fail` with the alleged `reason` for failure. After at most one
 * terminating calls, no further calls to these methods are valid and must be
 * rejected.
 * @property {(nonFinalValue: T) => void} publish
 * @property {(completion: T) => void} finish
 * @property {(reason: any) => void} fail
 */

/**
 * @template T
 * @typedef {Partial<Publisher<T>>} PublishObserver
 */

/**
 * @template T
 * @typedef {object} PublishKit<T>
 * @property {Publisher<T>} publisher
 * @property {Subscriber<T>} subscriber
 */

/**
 * @template T
 * @typedef {object} StoredPublishKit<T>
 * @property {Publisher<T>} publisher
 * @property {StoredSubscriber<T>} subscriber
 */

// /////////////////////////////////////////////////////////////////////////////

/**
 * @typedef {object} DurablePublishKitOptions
 * @property {'mandatory' | 'opportunistic' | 'ignored'} [valueDurability]
 */

// /////////////////////////////////////////////////////////////////////////////

// TODO: Narrow to exclude number.
/**
 * @typedef {number | bigint | undefined} UpdateCount a value used to mark the position
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
 * @typedef {ConsistentAsyncIterable<T> &
 *   SharableSubscription<T>} Subscription<T>
 * A form of AsyncIterable supporting distributed and multicast usage.
 */

/**
 * @template T
 * @typedef {object} SharableSubscription
 * @property {() => ERef<PublicationRecord<T>>} getSharableSubscriptionInternals
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

// /////////////////////////////////////////////////////////////////////////////

/** @typedef {ReturnType<typeof import('@endo/marshal').makeMarshal>} Marshaller */
/** @typedef {Pick<Marshaller, 'unserialize'>} Unserializer */

/**
 * Defined by vstorageStoreKey in vstorage.go
 *
 * @typedef VStorageKey
 * @property {string} storeName
 * @property {string} storeSubkey
 * @property {string} dataPrefixBytes
 */

/**
 * This represents a node in an IAVL tree.
 *
 * The active implementation is x/vstorage, an Agoric extension of the Cosmos SDK.
 *
 * Vstorage is a hierarchical externally-reachable storage structure that
 * identifies children by restricted ASCII name and is associated with arbitrary
 * string-valued data for each node, defaulting to the empty string.
 *
 * @typedef {object} StorageNode
 * @property {(data: string) => void} setValue publishes some data
 * @property {() => ERef<VStorageKey>} getStoreKey get the
 * externally-reachable store key for this storage item
 * @property {(subPath: string, options?: {sequence?: boolean}) => StorageNode} makeChildNode
 */

/**
 * @typedef {object} StoredFacet
 * @property {StorageNode['getStoreKey']} getStoreKey get the externally-reachable store key
 * @property {() => Unserializer} getUnserializer get the unserializer for the stored data
 */

/**
 * @deprecated
 * @template T
 * @typedef {Subscription<T> & StoredFacet} StoredSubscription
 */

/**
 * @template T
 * @typedef {Subscriber<T> & StoredFacet} StoredSubscriber
 */
