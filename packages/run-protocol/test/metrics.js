// @ts-check
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { diff } from 'deep-object-diff';

/**
 *
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
  /**
   *
   * @param {Record<string, unknown>} expectedDelta
   */
  const assertChange = async expectedDelta => {
    const prevNotif = notif;
    notif = await metrics.getUpdateSince(notif.updateCount);
    const actualDelta = diff(prevNotif.value, notif.value);
    t.deepEqual(actualDelta, expectedDelta, 'Unexpected delta');
  };
  return { assertChange, assertInitial };
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

/**
 * For vaultManager
 *
 * @param {import('ava').ExecutionContext} t
 * @param {{getMetrics?: () => Subscription<import('../src/vaultFactory/vaultManager').MetricsNotification>}} publicFacet
 */
export const totalDebtTracker = (t, publicFacet) => {
  let totalDebtEver = 0n;
  /** @param {bigint} delta */
  const add = delta => {
    totalDebtEver += delta;
  };
  const assertFullLiquidation = async () => {
    const metricsSub = await E(publicFacet).getMetrics();
    const metrics = makeNotifierFromAsyncIterable(metricsSub);
    // FIXME can't work until prefix-lossy subscriptions or https://github.com/Agoric/agoric-sdk/issues/5413
    const { value: v } = await metrics.getUpdateSince();
    const [p, o, s] = [
      v.totalProceedsReceived,
      v.totalOverageReceived,
      v.totalShortfallReceived,
    ].map(a => a.value);
    t.is(
      totalDebtEver,
      p - o + s,
      `Proceeds - overage + shortfall must equal total debt: ${totalDebtEver} != ${p} - ${o} + ${s}`,
    );
  };
  return harden({ assertFullLiquidation, add });
};
