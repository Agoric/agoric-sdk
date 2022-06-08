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
  /** @returns {UpdateRecord<*>} */
  const getLastNotif = () => notif;

  const assertInitial = async expectedValue => {
    notif = await metrics.getUpdateSince();
    t.log('assertInitial notif', notif);
    t.deepEqual(notif.value, expectedValue);
  };
  /** @param {Record<string, unknown>} expectedDelta */
  const assertChange = async expectedDelta => {
    const prevNotif = notif;
    notif = await metrics.getUpdateSince(notif.updateCount);
    t.log('assertChange notif', notif);
    const actualDelta = diff(prevNotif.value, notif.value);
    t.deepEqual(actualDelta, expectedDelta, 'Unexpected delta');
  };
  const assertState = async expectedState => {
    notif = await metrics.getUpdateSince(notif.updateCount);
    t.deepEqual(notif.value, expectedState, 'Unexpected state');
  };
  return { assertChange, assertInitial, assertState, getLastNotif };
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
 * @param {import('ava').ExecutionContext} t
 * @param {import('../src/vaultFactory/vaultManager').CollateralManager} publicFacet
 */
export const vaultManagerMetricsTracker = async (t, publicFacet) => {
  let totalDebtEver = 0n;
  const m = await metricsTracker(t, publicFacet);

  /** @returns {bigint} Proceeds - overage + shortfall */
  const liquidatedYet = () => {
    // XXX re-use the state until subscriptions are lossy https://github.com/Agoric/agoric-sdk/issues/5413
    const { value: v } = m.getLastNotif();
    const [p, o, s] = [
      v.totalProceedsReceived,
      v.totalOverageReceived,
      v.totalShortfallReceived,
    ].map(a => a.value);
    console.log('liquidatedYet', { p, o, s });
    return p - o + s;
  };

  /** @param {bigint} delta */
  const addDebt = delta => {
    totalDebtEver += delta;
    const liquidated = liquidatedYet();
    t.true(
      liquidated < totalDebtEver,
      `Liquidated ${liquidated} must be less than total debt ever ${totalDebtEver}`,
    );
  };

  const assertFullyLiquidated = () => {
    const liquidated = liquidatedYet();
    t.true(
      totalDebtEver - liquidated <= 1,
      `Liquidated ${liquidated} must approx equal total debt ever ${totalDebtEver}`,
    );
    const { value: lastValue } = m.getLastNotif();
    t.like(lastValue.totalDebt, { value: 0n });
  };
  return harden({
    ...m,
    addDebt,
    assertFullyLiquidated,
  });
};
