// @ts-check
import { makeNotifierFromAsyncIterable } from '@agoric/notifier';
import { E } from '@endo/eventual-send';
import { detailedDiff, diff } from 'deep-object-diff';

const { details: X, quote: q } = assert;
const size = o => Object.entries(o).length;

/**
 *
 * @param {{getMetrics: () => Subscription<object>}} publicFacet
 * @returns
 */
export const metricsTracker = async publicFacet => {
  const metricsSub = await E(publicFacet).getMetrics();
  const metrics = makeNotifierFromAsyncIterable(metricsSub);
  let notif;
  const assertInitial = async expectedValue => {
    notif = await metrics.getUpdateSince();
    const difference = diff(notif.value, expectedValue);
    assert(
      Object.entries(difference).length === 0,
      `Unexpected metric initial value: ${q(notif.value)}`,
    );
  };
  /**
   *
   * @param {Record<string, unknown>} expectedDelta
   */
  const assertChange = async expectedDelta => {
    const prevNotif = notif;
    notif = await metrics.getUpdateSince(notif.updateCount);
    const actualDelta = diff(prevNotif.value, notif.value);
    const deltaDiff = detailedDiff(actualDelta, expectedDelta);
    const diffCount =
      // @ts-expect-error bad types
      size(deltaDiff.added) + size(deltaDiff.deleted) + size(deltaDiff.updated);
    assert(
      diffCount === 0,
      X`Unexpected metric delta: ${actualDelta}; ${deltaDiff}`,
    );
  };
  return { assertChange, assertInitial };
};
