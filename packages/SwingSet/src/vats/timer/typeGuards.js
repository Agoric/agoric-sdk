import { M } from '@agoric/store';

export const TimerBrandShape = M.remotable();
export const TimestampValueShape = M.nat();
export const RelativeTimeValueShape = M.nat(); // Should we allow negatives?

export const TimestampRecordShape = harden({
  timerBrand: TimerBrandShape,
  absoluteTimeValue: TimestampValueShape,
});

export const RelativeTimeRecordShape = harden({
  timerBrand: TimerBrandShape,
  relativeTimeValue: RelativeTimeValueShape,
});

export const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);
export const RelativeTimeShape = M.or(
  RelativeTimeRecordShape,
  RelativeTimeValueShape,
);
