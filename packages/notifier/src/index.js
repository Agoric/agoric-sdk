// @ts-check

export {
  makeNotifier,
  makeNotifierKit,
  makeNotifierFromAsyncIterable,
} from './notifier.js';
export {
  DEFAULT_SUBSCRIPTION_HISTORY_LIMIT,
  makeSubscription,
  makeSubscriptionKit,
} from './subscriber.js';
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
