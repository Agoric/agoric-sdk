import './types.js';
import './types-exported.js';

export {};

/**
 * @typedef { string } VatID
 * @typedef { string } MeterID
 * @typedef { { meterID?: MeterID } } HasMeterID
 * @typedef { import('./types-exported.js').DynamicVatOptionsWithoutMeter } DynamicVatOptionsWithoutMeter
 *
 * // used by vatKeeper.setSourceAndOptions(source, RecordedVatOptions)
 *
 * @typedef { DynamicVatOptionsWithoutMeter & HasMeterID } InternalDynamicVatOptions
 * @typedef { StaticVatOptions | { InternalDynamicVatOptions & HasMeterID } } RecordedVatOptions
 *
 */
