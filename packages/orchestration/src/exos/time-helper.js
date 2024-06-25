import { BrandShape } from '@agoric/ertp';
import {
  RelativeTimeRecordShape,
  TimeMath,
  TimestampRecordShape,
} from '@agoric/time';
import { pickFacet } from '@agoric/vat-data';
import { VowShape } from '@agoric/vow';
import { E } from '@endo/far';
import { M } from '@endo/patterns';

/**
 * @import {Remote} from '@agoric/internal';*
 * @import {RelativeTimeRecord, TimerBrand, TimerService, TimestampRecord} from '@agoric/time';
 * @import {Vow, VowTools} from '@agoric/vow';
 * @import {Zone} from '@agoric/zone';
 */

export const SECONDS_PER_MINUTE = 60n;
export const NANOSECONDS_PER_SECOND = 1_000_000_000n;

/** @typedef {{ timerService: Remote<TimerService>; vowTools: VowTools }} TimeHelperPowers */

/**
 * @param {Zone} zone
 * @param {TimeHelperPowers} powers
 */
const prepareTimeHelperKit = (
  zone,
  { timerService, vowTools: { watch, allVows } },
) =>
  zone.exoClassKit(
    'Time Helper',
    {
      getBrandWatcher: M.interface('GetBrandWatcherI', {
        onFulfilled: M.call(BrandShape)
          .optional(M.arrayOf(M.undefined())) // does not need watcherContext
          .returns(BrandShape),
      }),
      getTimestampWatcher: M.interface('GetBrandWatcherI', {
        onFulfilled: M.call([TimestampRecordShape, BrandShape])
          .optional({
            relativeTime: M.or(RelativeTimeRecordShape, M.undefined()),
          })
          .returns(M.bigint()),
      }),
      public: M.interface('TimeHelperI', {
        getTimeoutTimestampNS: M.call()
          .optional(RelativeTimeRecordShape)
          .returns(VowShape),
        getBrand: M.call().returns(VowShape),
      }),
    },
    () =>
      /** @type {{ brandCache: TimerBrand | undefined }} */ ({
        brandCache: undefined,
      }),
    {
      getBrandWatcher: {
        /** @param {TimerBrand} timerBrand */
        onFulfilled(timerBrand) {
          this.state.brandCache = timerBrand;
          return timerBrand;
        },
      },
      getTimestampWatcher: {
        /**
         * @param {[TimestampRecord, TimerBrand]} results
         * @param {{ relativeTime: RelativeTimeRecord }} ctx
         */
        onFulfilled([currentTime, timerBrand], { relativeTime }) {
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
      public: {
        /** @returns {Vow<TimerBrand>} */
        getBrand() {
          // XXX this is a common use case that should have a helper like `provideSingleton`
          if (this.state.brandCache) return watch(this.state.brandCache);
          return watch(
            E(timerService).getTimerBrand(),
            this.facets.getBrandWatcher,
          );
        },
        /**
         * Takes the current time from ChainTimerService and adds a relative
         * time to determine a timeout timestamp in nanoseconds. Useful for
         * {@link MsgTransfer.timeoutTimestamp}.
         *
         * @param {RelativeTimeRecord} [relativeTime] defaults to 5 minutes
         * @returns {Vow<bigint>} Timeout timestamp in absolute nanoseconds
         *   since unix epoch
         */
        getTimeoutTimestampNS(relativeTime) {
          return watch(
            allVows([
              E(timerService).getCurrentTimestamp(),
              this.facets.public.getBrand(),
            ]),
            this.facets.getTimestampWatcher,
            { relativeTime },
          );
        },
      },
    },
  );
harden(prepareTimeHelperKit);

/**
 * @param {Zone} zone
 * @param {TimeHelperPowers} powers
 */
export const prepareTimeHelper = (zone, powers) => {
  const makeTimeHelperKit = prepareTimeHelperKit(zone, powers);
  const makeTimeHelper = pickFacet(makeTimeHelperKit, 'public');
  const timeHelper = makeTimeHelper();
  return harden(timeHelper);
};
harden(prepareTimeHelper);

/** @typedef {ReturnType<typeof prepareTimeHelper>} TimeHelper */
