import {
  makeNotifierFromAsyncIterable,
  makeNotifierFromSubscriber,
  subscribeEach,
} from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { diff } from 'deep-object-diff';

import { makeTracer } from '@agoric/internal';

// While t.log has the advantage of omitting by default when tests pass,
// when debugging it's most valuable to have the messages in sequence with app
// code logging which doesn't have access to t.log.
const trace = makeTracer('TestMetrics', false);

/**
 * @template {object} N
 * @param {AsyncIterable<N, N>
 *   | import('@agoric/zoe/src/contractSupport/topics.js').PublicTopic<N>} mixed
 */
const asNotifier = mixed => {
  if ('subscriber' in mixed) {
    return makeNotifierFromSubscriber(mixed.subscriber);
  }
  return makeNotifierFromAsyncIterable(mixed);
};

/**
 * @template {object} N
 * @param {import('ava').ExecutionContext} t
 * @param {AsyncIterable<N, N>
 *   | import('@agoric/zoe/src/contractSupport/topics.js').PublicTopic<N>} subscription
 */
export const subscriptionTracker = async (t, subscription) => {
  const metrics = asNotifier(subscription);
  /** @type {UpdateRecord<N>} */
  let notif;
  const getLastNotif = () => notif;

  /** @param {Record<keyof N, N[keyof N]>} expectedValue */
  const assertInitial = async expectedValue => {
    notif = await metrics.getUpdateSince();
    trace('assertInitial notif', notif);
    t.deepEqual(notif.value, expectedValue);
  };
  const assertChange = async expectedChanges => {
    const prevNotif = notif;
    notif = await metrics.getUpdateSince(notif.updateCount);
    trace('assertChange notif', notif);
    // @ts-expect-error diff() overly constrains
    const actualChanges = diff(prevNotif.value, notif.value);
    t.deepEqual(actualChanges, expectedChanges, 'Unexpected changes');
  };
  const assertLike = async expectedState => {
    notif = await metrics.getUpdateSince(notif?.updateCount);
    t.like(notif.value, expectedState, 'Unexpected state');
  };
  const assertState = async expectedState => {
    notif = await metrics.getUpdateSince(notif?.updateCount);
    t.deepEqual(notif.value, expectedState, 'Unexpected state');
  };
  const assertNoUpdate = async () => {
    const sameUpdate = await metrics.getUpdateSince();
    t.is(sameUpdate.updateCount, notif.updateCount);
  };
  return {
    assertChange,
    assertInitial,
    assertLike,
    assertState,
    getLastNotif,
    assertNoUpdate,
  };
};

/**
 * For public facets that have a `metrics` topic
 *
 * @template {object} N
 * @param {import('ava').ExecutionContext} t
 * @param {ERef<{
 *   getPublicTopics?: () => { metrics: { subscriber: Subscriber<N> } };
 * }>} publicFacet
 */
export const metricsTracker = async (t, publicFacet) => {
  const publicTopics = await E(publicFacet).getPublicTopics();
  return subscriptionTracker(t, subscribeEach(publicTopics.metrics.subscriber));
};

/**
 * @param {import('ava').ExecutionContext} t
 * @param {import('../src/vaultFactory/vaultManager.js').CollateralManager} publicFacet
 */
export const vaultManagerMetricsTracker = async (t, publicFacet) => {
  let totalDebtEver = 0n;
  /**
   * @type {Awaited<
   *   ReturnType<
   *     typeof subscriptionTracker<
   *       import('../src/vaultFactory/vaultManager.js').MetricsNotification
   *     >
   *   >
   * >}
   */
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
    trace('liquidatedYet', { p, o, s });
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
    const notif = m.getLastNotif();
    t.is(notif.value.totalDebt.value, 0n);
  };
  return harden({
    ...m,
    addDebt,
    assertFullyLiquidated,
  });
};
export const reserveInitialState = emptyRun => ({
  allocations: {},
  shortfallBalance: emptyRun,
  totalFeeBurned: emptyRun,
  totalFeeMinted: emptyRun,
});
