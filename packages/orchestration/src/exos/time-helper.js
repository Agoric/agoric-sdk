import { RelativeTimeRecordShape, TimeMath } from '@agoric/time';
import { VowShape } from '@agoric/vow';
import { E, Far } from '@endo/far';
import { M } from '@endo/patterns';

/**
 * @import {Remote} from '@agoric/internal';*
 * @import {RelativeTimeRecord, TimerBrand, TimerService, TimestampRecord} from '@agoric/time';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 */

export const SECONDS_PER_MINUTE = 60n;
export const NANOSECONDS_PER_SECOND = 1_000_000_000n;

/**
 * @param {Zone} zone
 * @param {{ timerService: Remote<TimerService>; vowTools: VowTools }} powers
 */
export const makeTimeHelper = (
  zone,
  { timerService, vowTools: { watch, allVows } },
) => {
  const timeHelper = zone.exoClass(
    'Time Helper',
    M.interface('TimeHelperI', {
      getTimeoutTimestampNS: M.call()
        .optional(RelativeTimeRecordShape)
        .returns(VowShape),
      getBrand: M.call().returns(VowShape),
    }),
    () =>
      /** @type {{ brandCache: TimerBrand | undefined }} */ ({
        brandCache: undefined,
      }),
    {
      /** @returns {Vow<TimerBrand>} */
      getBrand() {
        // XXX this is a common use case that should have a helper like `provideSingleton`
        if (this.state.brandCache) return watch(this.state.brandCache);
        return watch(
          E(timerService).getTimerBrand(),
          Far('BrandWatcher', {
            /** @param {TimerBrand} timerBrand */
            onFulfilled: timerBrand => {
              this.state.brandCache = timerBrand;
              return timerBrand;
            },
          }),
        );
      },
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
          allVows([
            E(timerService).getCurrentTimestamp(),
            this.self.getBrand(),
          ]),
          Far('TimestampWatcher', {
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
          }),
        );
      },
    },
  );
  return timeHelper();
};
harden(makeTimeHelper);

/** @typedef {ReturnType<typeof makeTimeHelper>} TimeHelper */
