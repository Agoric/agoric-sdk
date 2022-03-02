import './types.js';

export {};

/* This file defines types that part of the external API of swingset. That
 * includes standard services which user-provided vat code might interact
 * with, like VatAdminService. */

/**
 *
 * @typedef { string } BundleID
 * @typedef {*} BundleCap
 * @typedef { { moduleFormat: 'endoZipBase64', endoZipBase64: string } } EndoZipBase64Bundle
 *
 * @typedef { unknown } Meter
 *
 * E(vatAdminService).createVat(bundle, options: DynamicVatOptions)
 *
 * @typedef { { description?: string,
 *              meter?: Meter,
 *              managerType?: ManagerType,
 *              vatParameters?: {*},
 *              enableSetup?: boolean,
 *              enablePipelining?: boolean
 *              enableVatstore?: boolean,
 *              virtualObjectCacheSize?: number,
 *              useTranscript?: boolean,
 *              reapInterval? : number | 'never',
 *            }} DynamicVatOptionsWithoutMeter
 * @typedef { { meter?: Meter } } HasMeter
 * @typedef { DynamicVatOptionsWithoutMeter & HasMeter } DynamicVatOptions
 *
 * config.vats[name].creationOptions: StaticVatOptions
 *
 * @typedef { { enableDisavow?: boolean } } HasEnableDisavow
 * @typedef { DynamicVatOptions & HasEnableDisavow } StaticVatOptions
 */
