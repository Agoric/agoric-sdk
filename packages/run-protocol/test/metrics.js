// @ts-check
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { diff } from 'deep-object-diff';

/**
 * @param {import('ava').ExecutionContext} t
 * @param {Subscription<object>} subscription
 */
export const subscriptionTracker = async (t, subscription) => {
  const metrics = makeNotifierFromAsyncIterable(subscription);
  let notif;
  const assertInitial = async expectedValue => {
    notif = await metrics.getUpdateSince();
    t.deepEqual(notif.value, expectedValue);
  };
  /** @param {Record<string, unknown>} expectedDelta */
  const assertChange = async expectedDelta => {
    const prevNotif = notif;
    notif = await metrics.getUpdateSince(notif.updateCount);
    const actualDelta = diff(prevNotif.value, notif.value);
    t.deepEqual(actualDelta, expectedDelta, 'Unexpected delta');
  };
  const assertState = async expectedState => {
    notif = await metrics.getUpdateSince(notif.updateCount);
    t.deepEqual(notif.value, expectedState, 'Unexpected state');
  };
  return { assertChange, assertInitial, assertState };
};

/**
 * For public facets that have a `getMetrics` method.
 *
 * @param {import('ava').ExecutionContext} t
 * @param {{getMetrics?: () => Subscription<object>}} publicFacet
 */
export const metricsTracker = async (t, publicFacet) => {
  const metricsSub = await E(publicFacet).getMetrics();
  return subscriptionTracker(t, metricsSub);
};
