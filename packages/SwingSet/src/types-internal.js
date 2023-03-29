export {};

/**
 * The internal data that controls which worker we use (and how we use
 * it) is stored in a WorkerOptions record, which comes in "local" and
 * "xsnap" flavors.
 *
 * @typedef { { type: 'local' } } LocalWorkerOptions
 * @typedef { { type: 'xsnap' } } XSnapWorkerOptions
 * @typedef { { type: 'xsnap', bundleIDs: BundleID[] } } TODOXSnapWorkerOptions
 *  bundleIDs indicate the SES lockdown and supervisor/liveslots bundles to
 *  evaluate into a new xsnap worker
 * @typedef { LocalWorkerOptions | XSnapWorkerOptions } WorkerOptions
 *
 * @typedef { string } VatID
 * @typedef { string } MeterID
 * @typedef { { meterID?: MeterID } } OptMeterID
 * @typedef { import('./types-external.js').BaseVatOptions } BaseVatOptions
 * @typedef { import('./types-external.js').OptManagerType } OptManagerType
 * @typedef { { workerOptions: WorkerOptions } } OptWorkerOptions
 * @typedef { import('./types-external.js').OptEnableDisavow } OptEnableDisavow
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryObject } VatDeliveryObject
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryResult } VatDeliveryResult
 *
 * // used by vatKeeper.setSourceAndOptions(source, RecordedVatOptions)
 *
 * @typedef { BaseVatOptions & OptMeterID & OptManagerType } InternalDynamicVatOptions
 * @typedef { BaseVatOptions & OptMeterID & OptWorkerOptions & OptEnableDisavow } RecordedVatOptions
 *
 * @typedef {{
 *   enablePipelining: boolean,
 *   workerOptions: WorkerOptions,
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
