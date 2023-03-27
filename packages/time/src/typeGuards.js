import { M } from '@agoric/store';

export const TimerBrandShape = M.remotable('TimerBrand');
export const TimestampValueShape = M.nat();
export const RelativeTimeValueShape = M.nat(); // Should we allow negatives?

export const TimestampRecordShape = harden({
  timerBrand: TimerBrandShape,
  absValue: TimestampValueShape,
});

export const RelativeTimeRecordShape = harden({
  timerBrand: TimerBrandShape,
  relValue: RelativeTimeValueShape,
});

export const TimestampShape = M.or(TimestampRecordShape, TimestampValueShape);
export const RelativeTimeShape = M.or(
  RelativeTimeRecordShape,
  RelativeTimeValueShape,
);

export const TimerServiceShape = M.remotable('TimerService');
