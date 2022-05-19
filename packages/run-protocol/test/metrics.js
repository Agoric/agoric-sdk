// @ts-check
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { diff } from 'deep-object-diff';

/**
 *
 * @param {import('ava').ExecutionContext} t
 * @param {{getMetrics: () => Subscription<object>}} publicFacet
 */
export const metricsTracker = async (t, publicFacet) => {
  const metricsSub = await E(publicFacet).getMetrics();
  const metrics = makeNotifierFromAsyncIterable(metricsSub);
  let notif;
  const assertInitial = async expectedValue => {
    notif = await metrics.getUpdateSince();
    t.deepEqual(notif.value, expectedValue);
  };
  /**
   *
   * @param {Record<string, unknown>} expectedDelta
   */
  const assertChange = async expectedDelta => {
    const prevNotif = notif;
    notif = await metrics.getUpdateSince(notif.updateCount);
    const actualDelta = diff(prevNotif.value, notif.value);
    t.deepEqual(actualDelta, expectedDelta, 'Unexpected metric delta');
  };
  return { assertChange, assertInitial };
};
