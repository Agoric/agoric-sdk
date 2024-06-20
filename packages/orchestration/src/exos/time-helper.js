import { RelativeTimeRecordShape, TimeMath } from '@agoric/time';
import { VowShape } from '@agoric/vow';
import { watch, allVows } from '@agoric/vow/vat.js';
import { makeHeapZone } from '@agoric/zone';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

/**
 * @import {Remote} from '@agoric/internal';*
 * @import {RelativeTimeRecord, TimerBrand, TimerService, TimestampRecord} from '@agoric/time';
 * @import {Vow} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 */

export const SECONDS_PER_MINUTE = 60n;
export const NANOSECONDS_PER_SECOND = 1_000_000_000n;

/**
 * @param {Remote<TimerService>} timerService
 * @param {Zone} [zone]
 */

export const makeTimeHelper = (timerService, zone = makeHeapZone()) => {
  /** @type {TimerBrand | undefined} */
  let brandCache;
  const getBrand = () => {
    if (brandCache) return brandCache;
    return watch(E(timerService).getTimerBrand(), {
      onFulfilled: timerBrand => {
        brandCache = timerBrand;
        return timerBrand;
      },
    });
  };

  return zone.exo(
    'Time Helper',
    M.interface('TimeHelperI', {
      getTimeoutTimestampNS: M.call()
        .optional(RelativeTimeRecordShape)
        .returns(VowShape),
    }),
    {
      /**
       * Takes the current time from ChainTimerService and adds a relative time
       * to determine a timeout timestamp in nanoseconds. Useful for
       * {@link MsgTransfer.timeoutTimestamp}.
       *
       * @param {RelativeTimeRecord} [relativeTime] defaults to 5 minutes
       * @returns {Vow<bigint>} Timeout timestamp in absolute nanoseconds since
       *   unix epoch
       */
      getTimeoutTimestampNS(relativeTime) {
        return watch(
          allVows([E(timerService).getCurrentTimestamp(), getBrand()]),
          {
            /** @param {[TimestampRecord, TimerBrand]} results */
            onFulfilled([currentTime, timerBrand]) {
              const timeout =
                relativeTime ||
                TimeMath.coerceRelativeTimeRecord(
                  SECONDS_PER_MINUTE * 5n,
                  timerBrand,
                );
              return (
                TimeMath.addAbsRel(currentTime, timeout).absValue *
                NANOSECONDS_PER_SECOND
              );
            },
          },
        );
      },
    },
  );
};

/** @typedef {Awaited<ReturnType<typeof makeTimeHelper>>} TimeHelper */
