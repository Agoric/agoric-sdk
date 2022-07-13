// @ts-check

export {
  makePublishKit,
  subscribeEach,
  subscribeLatest,
} from './publish-kit.js';
export {
  makeNotifier,
  makeNotifierKit,
  makeNotifierFromAsyncIterable,
  makeNotifierFromSubscriber,
} from './notifier.js';
export { makeSubscription, makeSubscriptionKit } from './subscriber.js';
export {
  observeNotifier,
  observeIterator,
  observeIteration,
  // deprecated. Consider not reexporting
  updateFromIterable,
  updateFromNotifier,
  // Consider deprecating or not reexporting
  makeAsyncIterableFromNotifier,
} from './asyncIterableAdaptor.js';
export * from './storesub.js';
