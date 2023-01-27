/**
 * @callback makeLiveSlots
 */

/**
 * The MeterControl object gives liveslots a mechanism to disable metering for certain GC-sensitive
 * regions of code. Only the XS worker can actually do metering, but we track the enabled/disabled
 * status on all workers, so that the assertions can be exercised more thoroughly (via non-XS unit
 * tests). MeterControl.isMeteringDisabled()===false does not mean metering is happening, it just
 * means that MeterControl isn't disabling it.
 *
 * @typedef {object} MeterControl
 * @property {() => boolean} isMeteringDisabled Ask whether metering is currently disabled.
 * @property {*} assertIsMetered
 * @property {*} assertNotMetered
 * @property {*} runWithoutMetering Run a callback outside metering
 * @property {*} runWithoutMeteringAsync Run an async callback outside metering
 * @property {*} unmetered Wrap a callback with runWithoutMetering
 */

/**
 * @typedef {{
 *   virtualObjectCacheSize?: number, // Maximum number of entries in the virtual object state cache
 *   enableDisavow?: boolean,
 *   relaxDurabilityRules?: boolean,
 * }} LiveSlotsOptions
 *
 * @typedef {import('@endo/marshal').CapData<string>} SwingSetCapData
 *
 * * @typedef {{
 *                methargs: SwingSetCapData, // of [method, args]
 *                result: string | undefined | null,
 *             }} Message
 * @typedef { [tag: 'message', target: string, msg: Message]} VatDeliveryMessage
 * @typedef { [vpid: string, isReject: boolean, data: SwingSetCapData ] } VatOneResolution
 * @typedef { [tag: 'notify', resolutions: VatOneResolution[] ]} VatDeliveryNotify
 * @typedef { [tag: 'dropExports', vrefs: string[] ]} VatDeliveryDropExports
 * @typedef { [tag: 'retireExports', vrefs: string[] ]} VatDeliveryRetireExports
 * @typedef { [tag: 'retireImports', vrefs: string[] ]} VatDeliveryRetireImports
 * @typedef { [tag: 'changeVatOptions', options: Record<string, unknown> ]} VatDeliveryChangeVatOptions
 * @typedef { [tag: 'startVat', vatParameters: SwingSetCapData ]} VatDeliveryStartVat
 * @typedef { [tag: 'stopVat', disconnectObject: SwingSetCapData ]} VatDeliveryStopVat
 * @typedef { [tag: 'bringOutYourDead' ]} VatDeliveryBringOutYourDead
 * @typedef { VatDeliveryMessage | VatDeliveryNotify | VatDeliveryDropExports
 *            | VatDeliveryRetireExports | VatDeliveryRetireImports | VatDeliveryChangeVatOptions
 *            | VatDeliveryStartVat | VatDeliveryStopVat | VatDeliveryBringOutYourDead
 *          } VatDeliveryObject
 */

// Ensure this is a module.
export {};
