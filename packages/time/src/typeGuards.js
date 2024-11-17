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
export const TimestampRecordShape = {
  timerBrand: TimerBrandShape,
  absValue: TimestampValueShape,
};
harden(TimestampRecordShape);

/** @type {TypedPattern<RelativeTimeRecord>} */
export const RelativeTimeRecordShape = {
  timerBrand: TimerBrandShape,
  relValue: RelativeTimeValueShape,
};
harden(RelativeTimeRecordShape);

/** @type {TypedPattern<TimestampRecord | TimestampValue>} */
export const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);

/** @type {TypedPattern<RelativeTimeRecord | RelativeTimeValue>} */
export const RelativeTimeShape = M.or(
  RelativeTimeRecordShape,
  RelativeTimeValueShape,
);

export const TimerServiceShape = M.remotable('TimerService');
