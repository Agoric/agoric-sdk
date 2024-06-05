/** @file Ambient exports until https://github.com/Agoric/agoric-sdk/issues/6512 */
/** @see {@link /docs/typescript.md} */
/* eslint-disable -- doesn't understand .d.ts */
import {
  EachTopic as _EachTopic,
  IterableEachTopic as _IterableEachTopic,
  IterationObserver as _IterationObserver,
  LatestTopic as _LatestTopic,
  Notifier as _Notifier,
  NotifierRecord as _NotifierRecord,
  PublicationRecord as _PublicationRecord,
  Publisher as _Publisher,
  PublishKit as _PublishKit,
  StoredPublishKit as _StoredPublishKit,
  StoredSubscriber as _StoredSubscriber,
  StoredSubscription as _StoredSubscription,
  Subscriber as _Subscriber,
  Subscription as _Subscription,
  SubscriptionRecord as _SubscriptionRecord,
  UpdateRecord as _UpdateRecord,
} from './src/types.js';

declare global {
  // @ts-ignore TS2666: Exports and export assignments are not permitted in module augmentations.
  export {
    _EachTopic as EachTopic,
    _IterableEachTopic as IterableEachTopic,
    _IterationObserver as IterationObserver,
    _LatestTopic as LatestTopic,
    _Notifier as Notifier,
    _NotifierRecord as NotifierRecord,
    _PublicationRecord as PublicationRecord,
    _Publisher as Publisher,
    _PublishKit as PublishKit,
    _StoredPublishKit as StoredPublishKit,
    _StoredSubscriber as StoredSubscriber,
    _StoredSubscription as StoredSubscription,
    _Subscriber as Subscriber,
    _Subscription as Subscription,
    _SubscriptionRecord as SubscriptionRecord,
    _UpdateRecord as UpdateRecord,
  };
}
