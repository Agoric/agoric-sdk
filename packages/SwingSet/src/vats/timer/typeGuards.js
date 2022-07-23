import { M } from '@agoric/store';

export const TimerBrandShape = M.remotable();
export const TimestampShape = M.nat();
export const RelativeTimeShape = M.nat(); // Should we allow negatives?

export const AbsoluteTimeShape = harden({
  timerBrand: TimerBrandShape,
  absoluteTimeValue: TimestampShape,
});

export const DurationShape = harden({
  timerBrand: TimerBrandShape,
  relativeTimeValue: RelativeTimeShape,
});

export const AbsoluteTimeishShape = M.or(AbsoluteTimeShape, TimestampShape);
export const DurationishShape = M.or(DurationShape, RelativeTimeShape);
