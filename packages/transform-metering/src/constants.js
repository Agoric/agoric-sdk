// These are the meter members of the meterId.
export * from '@agoric/tame-metering/src/constants.js';
export const METER_COMBINED = '*';

export const DEFAULT_METER_ID = '$h\u200d_meter';
export const DEFAULT_SET_METER_ID = '$h\u200d_meter_set';
export const DEFAULT_REGEXP_ID_PREFIX = '$h\u200d_re_';

// Default metering values.  These can easily be overridden in meter.js.
// true means to use the combined meter.
// undefined means not to meter.
export const DEFAULT_COMBINED_METER = 1e7;
export const DEFAULT_ALLOCATE_METER = true;
export const DEFAULT_COMPUTE_METER = true;
export const DEFAULT_STACK_METER = 8000;
