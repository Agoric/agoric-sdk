import { M } from '@agoric/store';

export const TimerBrandSchema = M.remotable();
export const TimestampValueSchema = M.nat();
export const RelativeTimeValueSchema = M.nat(); // Should we allow negatives?

export const TimestampRecordSchema = harden({
  timerBrand: TimerBrandSchema,
  absValue: TimestampValueSchema,
});

export const RelativeTimeRecordSchema = harden({
  timerBrand: TimerBrandSchema,
  relValue: RelativeTimeValueSchema,
});

export const TimestampSchema = M.or(
  TimestampRecordSchema,
  TimestampValueSchema,
);
export const RelativeTimeSchema = M.or(
  RelativeTimeRecordSchema,
  RelativeTimeValueSchema,
);
