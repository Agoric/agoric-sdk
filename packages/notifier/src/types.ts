/* eslint-disable no-use-before-define */
import type {
  StoredFacet,
  Unserializer,
  VStorageKey,
} from '@agoric/internal/src/lib-chainStorage.js';

/**
 * An AsyncIterator that can be forked at a given position
 * into multiple independent ForkableAsyncIterators starting from that position.
 */
export type ForkableAsyncIterator<
  T,
  TReturn = any,
  TNext = undefined,
> = AsyncIterator<T, TReturn, TNext> & {
  fork(): ForkableAsyncIterator<T, TReturn, TNext>;
};
export type AsyncIterableOnly<T, TReturn = any, TNext = undefined> = {
  [Symbol.asyncIterator](): AsyncIterableIterator<T, TReturn, TNext>;
};
export type ForkableAsyncIterableIterator<
  T,
  TReturn = any,
  TNext = undefined,
> = {
  [Symbol.asyncIterator](): ForkableAsyncIterableIterator<T, TReturn, TNext>;
  fork(): ForkableAsyncIterableIterator<T, TReturn, TNext>;
} & ForkableAsyncIterator<T, TReturn, TNext>;
/**
 * An AsyncIterable that produces ForkableAsyncIterators.
 */
export type ForkableAsyncIterable<T, TReturn = any, TNext = undefined> = {
  [Symbol.asyncIterator]: () => ForkableAsyncIterator<T, TReturn, TNext>;
};
/**
 * A valid sequence of calls to the methods of an `IterationObserver`
 * represents an iteration. A valid sequence consists of any number of calls
 * to `updateState` with the successive non-final values, followed by a
 * final call to either `finish` with a successful `completion` value
 * or `fail` with the alleged `reason` for failure. After at most one
 * terminating calls, no further calls to these methods are valid and must be
 * rejected.
 */
export type IterationObserver<T> = {
  updateState: (nonFinalValue: T) => void;
  finish: (completion: T) => void;
  fail: (reason: unknown) => void;
};
/**
 * Will be shared between machines, so it must be safe to expose. But software
 * outside the current package should consider it opaque, not depending on its
 * internal structure.
 */
export type PublicationRecord<T> = {
  head: IteratorResult<T>;
  /**
   * starts at 1 for the first result
   * and advances by 1 for each subsequent result
   */
  publishCount: bigint;
  tail: Promise<PublicationRecord<T>>;
};
export type EachTopic<T> = {
  /**
   * Returns a promise for a "current" PublicationRecord (referencing its
   * immediate successor via a `tail` promise) that is later than the
   * provided publishCount.
   * Used to make forward-lossless ("each") iterators.
   */
  subscribeAfter: (publishCount?: bigint) => Promise<PublicationRecord<T>>;
};
/**
 * An EachTopic with default asyncIterable behaviour.
 *
 * NOTE: the publication records and iterators returned by this object are
 * ephemeral and will be severed during upgrade.  A caller should use
 * `subscribeEach` to wrap this topic in a local iterable which automatically
 * attempts to reconnect upon being severed.
 */
export type IterableEachTopic<T> = ForkableAsyncIterable<T, T> & EachTopic<T>;
/**
 * A LatestTopic with default asyncIterable behaviour.
 *
 * NOTE: the iterators returned by this object are ephemeral and will be severed
 * during upgrade.  A caller should use `subscribeLatest` to wrap this topic in
 * a local iterable which automatically attempts to reconnect upon being
 * severed.
 */
export type IterableLatestTopic<T> = AsyncIterableOnly<T, T> & LatestTopic<T>;
export type LatestTopic<T> = {
  /**
   * Returns a promise for an update record as of an update count.
   * If the `updateCount` argument is omitted or differs from the current update count,
   * the promise promptly resolves to the current record.
   * Otherwise, after the next state change, the promise resolves to the resulting record.
   * This is an attenuated form of `subscribeAfter` whose return value stands alone and
   * does not allow consumers to pin a chain of historical PublicationRecords.
   * Used to make lossy ("latest") iterators.
   * NOTE: Use of `number` as an `updateCount` is deprecated.
   */
  getUpdateSince: (updateCount?: bigint | number) => Promise<UpdateRecord<T>>;
};
/**
 * This type is deprecated but is still
 * used externally.
 */
export type BaseNotifier<T> = LatestTopic<T>;
/**
 * A stream of results that allows consumers to configure
 * forward-lossless "each" iteration with `subscribeEach` and
 * lossy "latest" iteration with `subscribeLatest`.
 */
export type Subscriber<T> = LatestTopic<T> & EachTopic<T>;
/**
 * A valid sequence of calls to the methods of an `IterationObserver`
 * represents an iteration. A valid sequence consists of any number of calls
 * to `publish` with the successive non-final values, followed by a
 * final call to either `finish` with a successful `completion` value
 * or `fail` with the alleged `reason` for failure. After at most one
 * terminating calls, no further calls to these methods are valid and must be
 * rejected.
 */
export type Publisher<T> = {
  publish: (nonFinalValue: T) => void;
  finish: (completion: T) => void;
  fail: (reason: any) => void;
};
export type PublishObserver<T> = Partial<Publisher<T>>;
export type PublishKit<T> = {
  publisher: Publisher<T>;
  subscriber: Subscriber<T>;
};
export type StoredPublishKit<T> = {
  publisher: Publisher<T>;
  subscriber: StoredSubscriber<T>;
};
/**
 * Durability configures constraints on non-terminal values that can be
 * published to a durable publish kit (terminal values sent to finish or fail
 * must always be durable).
 * - 'mandatory' means that each value must be durable, so it can be restored
 *   on upgrade.
 * - 'opportunistic' means that a durable value is persisted for post-upgrade
 *   restoration, but a non-durable value is still accepted (and will result in
 *   valueless restoration).
 * - 'ignored' means that a value is not persisted for restoration even if it
 *   is durable.
 *
 * 'mandatory' is the only currently-supported value, and others must not be
 * enabled without test coverage.
 */
export type DurablePublishKitValueDurability =
  | 'mandatory'
  | 'opportunistic'
  | 'ignored';
export type DurablePublishKitState = {
  valueDurability: DurablePublishKitValueDurability;
  publishCount: bigint;
  status: 'live' | 'finished' | 'failed';
  /**
   * hasValue indicates the presence of value. It starts off false,
   * and can be reset to false when a durable publish kit is restored and
   * the previous value was not durable, or non-terminal and valueDurablity is 'ignored'.
   */
  hasValue: boolean;
  /**
   * value holds either a non-terminal value from `publish` or a terminal value
   * from `finish` or `fail`, depending upon the value in status.
   */
  value: any;
};
export type UpdateRecord<T> = {
  /**
   * is whatever state the service wants to publish
   */
  value: T;
  /**
   * is a value that identifies the update.  For
   * the last update, it is `undefined`.
   */
  updateCount?: bigint | undefined;
};
/**
 * Will be shared between machines,
 * so it must be safe to expose. But other software should avoid depending on
 * its internal structure.
 */
export type NotifierInternals<T> = BaseNotifier<T>;
/**
 * an object that can be used to get the current state or updates
 */
export type Notifier<T> = import('@endo/marshal').RemotableObject &
  NotifierInternals<T> &
  ForkableAsyncIterable<T, T> &
  SharableNotifier<T>;
export type SharableNotifier<T> = {
  /**
   * Used to replicate the multicast values at other sites. To manually create a
   * local representative of a Notification, do
   * ```js
   * localIterable =
   *   makeNotifier(E(remoteIterable).getSharableNotifierInternals());
   * ```
   * The resulting `localIterable` also supports such remote use, and
   * will return access to the same representation.
   */
  getSharableNotifierInternals: () => Promise<NotifierInternals<T>>;
};
/**
 * the produced notifier/updater pair
 */
export type NotifierRecord<T> = {
  /**
   * the (closely-held) notifier producer
   */
  updater: import('@endo/marshal').RemotableObject & IterationObserver<T>;
  /**
   * the (widely-held) notifier consumer
   */
  notifier: Notifier<T>;
};
/**
 * A form of AsyncIterable supporting distributed and multicast usage.
 */
export type Subscription<T> = IterableEachTopic<T> &
  EachTopic<T> &
  SharableSubscription<T>;
export type SharableSubscription<T> = {
  /**
   * Used to replicate the multicast values at other sites. To manually create a
   * local representative of a Subscription, do
   * ```js
   * localIterable =
   *   makeSubscription(E(remoteIterable).getSharableSubscriptionInternals());
   * ```
   * The resulting `localIterable` also supports such remote use, and
   * will return access to the same representation.
   */
  getSharableSubscriptionInternals: () => Promise<EachTopic<T>>;
};
export type SubscriptionRecord<T> = {
  publication: IterationObserver<T>;
  subscription: Subscription<T>;
};
export type StoredSubscription<T> = Subscription<T> & {
  getStoreKey: () => Promise<
    VStorageKey & {
      subscription: Subscription<T>;
    }
  >;
  getUnserializer: () => Unserializer;
};
export type StoredSubscriber<T> = Subscriber<T> & StoredFacet;
