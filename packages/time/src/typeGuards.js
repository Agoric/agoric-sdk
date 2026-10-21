import { M } from '@endo/patterns';

/**
 * @import {CastedPattern} from '@endo/patterns';
 * @import {TimestampRecord, TimestampValue, RelativeTimeValue, RelativeTimeRecord} from './types.js';
 */

export const TimerBrandShape = M.remotable('TimerBrand');

/** @type {CastedPattern<bigint>} */
export const TimestampValueShape = M.nat();

/** @type {CastedPattern<bigint>} */
export const RelativeTimeValueShape = M.nat(); // Should we allow negatives?

/** @type {CastedPattern<TimestampRecord>} */
export const TimestampRecordShape = {
  timerBrand: TimerBrandShape,
  absValue: TimestampValueShape,
};
harden(TimestampRecordShape);

/** @type {CastedPattern<RelativeTimeRecord>} */
export const RelativeTimeRecordShape = {
  timerBrand: TimerBrandShape,
  relValue: RelativeTimeValueShape,
};
harden(RelativeTimeRecordShape);

/** @type {CastedPattern<TimestampRecord | TimestampValue>} */
export const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);

/** @type {CastedPattern<RelativeTimeRecord | RelativeTimeValue>} */
export const RelativeTimeShape = M.or(
  RelativeTimeRecordShape,
  RelativeTimeValueShape,
);

export const TimerServiceShape = M.remotable('TimerService');
