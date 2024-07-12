import { M } from '@endo/patterns';

/**
 * @import {TypedPattern} from '@agoric/internal';
 * @import {TimestampRecord, TimestampValue, RelativeTimeValue, RelativeTimeRecord} from './types.js';
 */

export const TimerBrandShape = M.remotable('TimerBrand');
/** @type {TypedPattern<bigint>} */
export const TimestampValueShape = M.nat();
/** @type {TypedPattern<bigint>} */
export const RelativeTimeValueShape = M.nat(); // Should we allow negatives?

/** @type {TypedPattern<TimestampRecord>} */
export const TimestampRecordShape = harden({
  timerBrand: TimerBrandShape,
  absValue: TimestampValueShape,
});

/** @type {TypedPattern<RelativeTimeRecord>} */
export const RelativeTimeRecordShape = harden({
  timerBrand: TimerBrandShape,
  relValue: RelativeTimeValueShape,
});

/** @type {TypedPattern<TimestampRecord | TimestampValue>} */
export const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);
/** @type {TypedPattern<RelativeTimeRecord | RelativeTimeValue>} */
export const RelativeTimeShape = M.or(
  RelativeTimeRecordShape,
  RelativeTimeValueShape,
);

export const TimerServiceShape = M.remotable('TimerService');
