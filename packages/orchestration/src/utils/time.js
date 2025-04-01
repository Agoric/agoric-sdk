import { E } from '@endo/far';
import { TimeMath } from '@agoric/time';

/**
 * @import {TimerService} from '@agoric/time';
 * @import {Remote} from '@agoric/internal';
 * @import {EReturn} from '@endo/far';
 * @import {MsgTransfer} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
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
     * Takes the current time from ChainTimerService and adds a relative time
     * (`secondsInFuture`) to determine a timeout timestamp in nanoseconds.
     * Useful for {@link MsgTransfer.timeoutTimestamp}.
     *
     * @param {bigint} [secondsInFuture] defaults to 300n (5 minutes)
     * @returns {Promise<bigint>} Timeout timestamp in absolute nanoseconds
     *   since unix epoch
     */
    async getTimeoutTimestampNS(secondsInFuture = SECONDS_PER_MINUTE * 5n) {
      const currentTime = await E(timer).getCurrentTimestamp();
      const timeout = TimeMath.coerceRelativeTimeRecord(
        secondsInFuture,
        currentTime.timerBrand,
      );
      return (
        TimeMath.addAbsRel(currentTime, timeout).absValue *
        NANOSECONDS_PER_SECOND
      );
    },
  });
}

/** @typedef {EReturn<typeof makeTimestampHelper>} TimestampHelper */
