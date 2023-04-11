export {};

/**
 * The internal data that controls which worker we use (and how we use
 * it) is stored in a WorkerOptions record, which comes in "local" and
 * "xsnap" flavors.
 *
 * @typedef { { type: 'local' } } LocalWorkerOptions
 * @typedef { { type: 'xsnap', bundleIDs: BundleID[] } } XSnapWorkerOptions
 * @typedef { { type: 'node-subprocess' } } NodeSubprocessWorkerOptions
 *  bundleIDs indicate the SES lockdown and supervisor/liveslots bundles to
 *  evaluate into a new xsnap worker
 * @typedef { LocalWorkerOptions | XSnapWorkerOptions | NodeSubprocessWorkerOptions } WorkerOptions
 *
 * @typedef { string } VatID
 * @typedef { string } MeterID
 * @typedef { { meterID?: MeterID } } OptMeterID
 * @typedef { import('./types-external.js').BaseVatOptions } BaseVatOptions
 * @typedef { import('./types-external.js').OptManagerType } OptManagerType
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryObject } VatDeliveryObject
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryResult } VatDeliveryResult
 * @typedef { import('@agoric/swingset-liveslots').VatSyscallObject } VatSyscallObject
 * @typedef { import('@agoric/swingset-liveslots').VatSyscallResult } VatSyscallResult
 * @typedef { import('@agoric/swingset-liveslots').VatSyscallHandler } VatSyscallHandler
 *
 * // used by vatKeeper.setSourceAndOptions(source, RecordedVatOptions)
 *
 * @typedef { BaseVatOptions & OptMeterID & OptManagerType } InternalDynamicVatOptions
 *
 * RecordedVatOptions is fully-specified, no optional fields
 *
 * @typedef RecordedVatOptions
 * @property { string } name
 * @property { * } vatParameters
 * @property { boolean } enableSetup
 * @property { boolean } enablePipelining
 * @property { boolean } useTranscript
 * @property { number | 'never' } reapInterval
 * @property { boolean } critical
 * @property { MeterID } [meterID] // property must be present, but can be undefined
 * @property { WorkerOptions } workerOptions
 * @property { boolean } enableDisavow
 */

/**
 * @typedef {{
 *   enablePipelining: boolean,
 *   workerOptions: WorkerOptions,
 *   metered: boolean,
 *   critical: boolean,
 *   enableDisavow: boolean,
 *   useTranscript: boolean,
 *   name: string,
 *   sourcedConsole: Pick<Console, 'debug' | 'log' | 'info' | 'warn' | 'error'>,
 *   enableSetup: boolean,
 *   setup?: unknown,
 *   retainSyscall?: boolean
 *   bundle?: Bundle,
 * }} ManagerOptions
 *
 * @typedef {(snapPos: number, ss: SnapStore, restartWorker?: boolean) => Promise<SnapshotResult>} MakeSnapshot
 *
 * @typedef { { deliver: (delivery: VatDeliveryObject, vatSyscallHandler: VatSyscallHandler)
 *                       => Promise<VatDeliveryResult>,
 *              makeSnapshot?: undefined | MakeSnapshot,
 *              shutdown: () => Promise<void>,
 *            } } VatManager
 * @typedef { { createFromBundle: (vatID: string,
 *                                 bundle: Bundle,
 *                                 managerOptions: ManagerOptions,
 *                                 liveSlotsOptions: import('@agoric/swingset-liveslots').LiveSlotsOptions,
 *                                ) => Promise<VatManager>
 *            } } VatManagerFactory
 *
 * @typedef {(problem: unknown, err?: Error) => void } KernelPanic
 */

/**
 * @typedef { { type: 'notify', vatID: VatID, kpid: string } } RunQueueEventNotify
 * @typedef { { type: 'send', target: string, msg: Message }} RunQueueEventSend
 * @typedef { { type: 'create-vat', vatID: VatID,
 *              source: { bundle: Bundle } | { bundleID: BundleID },
 *              vatParameters: SwingSetCapData,
 *              dynamicOptions: InternalDynamicVatOptions }
 *          } RunQueueEventCreateVat
 * @typedef { { type: 'upgrade-vat', vatID: VatID, upgradeID: string,
 *              bundleID: BundleID, vatParameters: SwingSetCapData,
 *              upgradeMessage: string } } RunQueueEventUpgradeVat
 * @typedef { { type: 'changeVatOptions', vatID: VatID, options: Record<string, unknown> } } RunQueueEventChangeVatOptions
 * @typedef { { type: 'startVat', vatID: VatID, vatParameters: SwingSetCapData } } RunQueueEventStartVat
 * @typedef { { type: 'dropExports', vatID: VatID, krefs: string[] } } RunQueueEventDropExports
 * @typedef { { type: 'retireExports', vatID: VatID, krefs: string[] } } RunQueueEventRetireExports
 * @typedef { { type: 'retireImports', vatID: VatID, krefs: string[] } } RunQueueEventRetireImports
 * @typedef { { type: 'negated-gc-action', vatID?: VatID } } RunQueueEventNegatedGCAction
 * @typedef { { type: 'bringOutYourDead', vatID: VatID } } RunQueueEventBringOutYourDead
 * @typedef { RunQueueEventNotify | RunQueueEventSend | RunQueueEventCreateVat |
 *            RunQueueEventUpgradeVat | RunQueueEventChangeVatOptions | RunQueueEventStartVat |
 *            RunQueueEventDropExports | RunQueueEventRetireExports | RunQueueEventRetireImports |
 *            RunQueueEventNegatedGCAction | RunQueueEventBringOutYourDead
 *          } RunQueueEvent
 */

/**
 * @typedef { { source: { bundleID?: BundleID }, workerOptions: WorkerOptions } } TranscriptDeliveryInitializeWorkerOptions
 * @typedef { [tag: 'initialize-worker', options: TranscriptDeliveryInitializeWorkerOptions] } TranscriptDeliveryInitializeWorker
 * @typedef { [tag: 'save-snapshot'] } TranscriptDeliverySaveSnapshot
 * @typedef { { snapshotID: string } } TranscriptDeliverySnapshotConfig
 * @typedef { [tag: 'load-snapshot', config: TranscriptDeliverySnapshotConfig] } TranscriptDeliveryLoadSnapshot
 * @typedef { [tag: 'shutdown-worker'] } TranscriptDeliveryShutdownWorker
 * @typedef { VatDeliveryObject
 *             | TranscriptDeliveryInitializeWorker
 *             | TranscriptDeliverySaveSnapshot
 *             | TranscriptDeliveryLoadSnapshot
 *             | TranscriptDeliveryShutdownWorker
 *          } TranscriptDelivery
 * @typedef { { s: VatSyscallObject, r: VatSyscallResult } } TranscriptSyscall
 * @typedef { { status: string, snapshotID: string } } TranscriptDeliverySaveSnapshotResults
 * @typedef { { status: string, metering?: { computrons: number } } } TranscriptDeliveryGenericResults
 * @typedef { TranscriptDeliverySaveSnapshotResults | TranscriptDeliveryGenericResults } TranscriptDeliveryResults
 * @typedef { { d: TranscriptDelivery, sc: TranscriptSyscall[], r: TranscriptDeliveryResults } } TranscriptEntry
 *
 */
