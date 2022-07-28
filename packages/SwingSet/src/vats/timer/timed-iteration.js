// @ts-check

import { E } from '@endo/eventual-send';
import { Far } from '@endo/marshal';
import { TimeMath } from './timeMath.js';

// TODO There's nothing SwingSet specific in this file. It should probably
// live in @agoric/notifier. But we'd also need to move the
// type definitions of `Timestamp` and `RelativeTime` there.
// We should also somehow extend the abstraction so the iterator
// can be terminated, i.e., finished or failed.

/**
 * @param {(delay: RelativeTime) => Promise<Timestamp>} delayFn
 * @param {() => Timestamp} getCurrentTime
 * @param {Timestamp} baseTime
 * @param {RelativeTime} interval
 * @returns {AsyncIterator<Timestamp>}
 */
export const makeTimedIterator = (
  delayFn,
  getCurrentTime,
  baseTime,
  interval,
) => {
  // The latest stamp we have produced a notifier update for.
  let latestNotifiedStamp = baseTime;

  const iterator = Far('Timed async iterator', {
    next: async () => {
      // Whenever we have an observer for a new state, we need to handle two
      // different cases:
      // 1. If there would have been a prior wakeup since the last
      //    notification, report it immediately.
      // 2. Otherwise, set a wakeup when the next one would be scheduled.

      const now = getCurrentTime();

      // Calculate where we are relative to our base time.
      const currentOffset = TimeMath.clampedSubtractAbsAbs(now, baseTime);
      const intervalRemaining = TimeMath.subtractRelRel(
        interval,
        TimeMath.modRelRel(currentOffset, interval),
      );

      // Find the previous wakeup relative to our last one.
      const nextWakeup = TimeMath.addAbsRel(
        TimeMath.addAbsRel(baseTime, currentOffset),
        intervalRemaining,
      );
      const priorWakeup = TimeMath.subtractAbsRel(nextWakeup, interval);

      if (priorWakeup > latestNotifiedStamp) {
        // At least one interval has passed since the prior one we notified
        // for, so we can do an immediate update.
        latestNotifiedStamp = priorWakeup;
        return harden({ done: false, value: priorWakeup });
      } else {
        // The last notification we know about is in the future, so notify
        // later because the client is waiting on a promise.
        latestNotifiedStamp = nextWakeup;
        return E.when(
          delayFn(TimeMath.subtractAbsAbs(nextWakeup, now)),
          wakeTime => harden({ done: false, value: wakeTime }),
        );
      }
    },
  });
  return iterator;
};

/**
 * @param {(delay: RelativeTime) => Promise<Timestamp>} delayFn
 * @param {() => Timestamp} getCurrentTime
 * @param {Timestamp} baseTime
 * @param {RelativeTime} interval
 * @returns {AsyncIterable<Timestamp>}
 */
export const makeTimedIterable = (
  delayFn,
  getCurrentTime,
  baseTime,
  interval,
) => {
  const iterable = Far('Timed async iterable', {
    [Symbol.asyncIterator]: () =>
      makeTimedIterator(delayFn, getCurrentTime, baseTime, interval),
  });
  return iterable;
};
