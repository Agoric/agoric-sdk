// @ts-check

export {
  makeNotifier,
  makeNotifierKit,
  makeNotifierFromAsyncIterable,
} from './notifier.js';
export { shadowSubscription, makeSubscriptionKit } from './subscriber.js';
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
