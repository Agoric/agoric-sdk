import { E } from '@endo/far';
import { TimeMath } from '@agoric/time';

/**
 * @import {RelativeTimeRecord, TimerBrand, TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 */

export const SECONDS_PER_MINUTE = 60n;
export const MILLISECONDS_PER_SECOND = 1000n;
export const NANOSECONDS_PER_MILLISECOND = 1_000_000n;
export const NANOSECONDS_PER_SECOND = 1_000_000_000n;

/**
 * XXX should this be durable? resumable?
 *
 * @param {Remote<TimerService>} timer
 */
export function makeTimestampHelper(timer) {
  return harden({
    /**
     * XXX do this need to be resumable / use Vows?
     *
     * Takes the current time from ChainTimerService and adds a relative time to
     * determine a timeout timestamp in nanoseconds. Useful for
     * {@link MsgTransfer.timeoutTimestamp}.
     *
     * @param {RelativeTimeRecord} [relativeTime] defaults to 5 minutes
     * @returns {Promise<bigint>} Timeout timestamp in absolute nanoseconds
     *   since unix epoch
     */
    async getTimeoutTimestampNS(relativeTime) {
      const currentTime = await E(timer).getCurrentTimestamp();
      const timeout =
        relativeTime ||
        TimeMath.coerceRelativeTimeRecord(
          SECONDS_PER_MINUTE * 5n,
          currentTime.timerBrand,
        );
      return (
        TimeMath.addAbsRel(currentTime, timeout).absValue *
        NANOSECONDS_PER_SECOND
      );
    },
  });
}

/** @typedef {Awaited<ReturnType<typeof makeTimestampHelper>>} TimestampHelper */
