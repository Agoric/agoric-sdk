import { E } from '@endo/far';
import { TimeMath } from '@agoric/time';

/**
 * @import {RelativeTimeRecord, TimerBrand, TimerService} from '@agoric/time';
 * @import {MsgTransfer} from '@agoric/cosmic-proto/ibc/applications/transfer/v1/tx.js';
 */

export const SECONDS_PER_MINUTE = 60n;
export const NANOSECONDS_PER_SECOND = 1_000_000_000n;

/**
 * @param {TimerService} timer
 * @param {TimerBrand} timerBrand
 */
export function makeTimestampHelper(timer, timerBrand) {
  return harden({
    /**
     * Takes the current time from ChainTimerService and adds a relative
     * time to determine a timeout timestamp in nanoseconds.
     * Useful for {@link MsgTransfer.timeoutTimestamp}.
     * @param {RelativeTimeRecord} [relativeTime] defaults to 5 minutes
     * @returns {Promise<bigint>} Timeout timestamp in absolute nanoseconds since unix epoch
     */
    async getTimeoutTimestampNS(relativeTime) {
      const currentTime = await E(timer).getCurrentTimestamp();
      const timeout =
        relativeTime ||
        TimeMath.coerceRelativeTimeRecord(SECONDS_PER_MINUTE * 5n, timerBrand);
      return (
        TimeMath.addAbsRel(currentTime, timeout).absValue *
        NANOSECONDS_PER_SECOND
      );
    },
  });
}

/** @typedef {Awaited<ReturnType<typeof makeTimestampHelper>>} TimestampHelper */

/**
 * Convert a Date from a Cosmos message, which has millisecond precision,
 * to a BigInt for number of seconds since epoch, for use in a timer.
 *
 * @param {Date} date
 * @returns {bigint}
 */
export const dateInSeconds = date => BigInt(Math.floor(date.getTime() / 1000));
