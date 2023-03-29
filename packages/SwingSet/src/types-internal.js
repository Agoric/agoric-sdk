export {};

/**
 * @typedef { string } VatID
 * @typedef { string } MeterID
 * @typedef { { meterID?: MeterID } } OptMeterID
 * @typedef { import('./types-external.js').BaseVatOptions } BaseVatOptions
 * @typedef { import('./types-external.js').OptManagerType } OptManagerType
 * @typedef { import('./types-external.js').OptEnableDisavow } OptEnableDisavow
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryObject } VatDeliveryObject
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryResult } VatDeliveryResult
 *
 * // used by vatKeeper.setSourceAndOptions(source, RecordedVatOptions)
 *
 * @typedef { BaseVatOptions & OptMeterID & OptManagerType } InternalDynamicVatOptions
 * @typedef { BaseVatOptions & OptMeterID & OptManagerType & OptEnableDisavow } RecordedVatOptions
 *
 * @typedef {{
 *   enablePipelining: boolean,
 *   managerType: ManagerType,
 *   metered: boolean,
 *   critical: boolean,
 *   enableDisavow: boolean,
 *   useTranscript: boolean,
 *   virtualObjectCacheSize: number,
 *   name: string,
 *   compareSyscalls?: (originalSyscall: {}, newSyscall: {}) => Error | undefined,
 *   sourcedConsole: Pick<Console, 'debug' | 'log' | 'info' | 'warn' | 'error'>,
 *   enableSetup: boolean,
 *   setup?: unknown,
 *   bundle?: Bundle,
 * }} ManagerOptions
 *
 * @typedef { { deliver: (delivery: VatDeliveryObject) => Promise<VatDeliveryResult>,
 *              replayTranscript: (startPos: number | undefined) => Promise<number?>,
 *              makeSnapshot?: (endPos: number, ss: SnapStore) => Promise<SnapshotResult>,
 *              shutdown: () => Promise<void>,
 *            } } VatManager
 * @typedef { { createFromBundle: (vatID: string,
 *                                 bundle: Bundle,
 *                                 managerOptions: ManagerOptions,
 *                                 liveSlotsOptions: import('@agoric/swingset-liveslots').LiveSlotsOptions,
 *                                 vatSyscallHandler: unknown) => Promise<VatManager>,
 *            } } VatManagerFactory
 *
 * @typedef {(problem: unknown, err?: Error) => void } KernelPanic
 */
