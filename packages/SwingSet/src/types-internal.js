export {};

/**
 * The host provides (external) KernelOptions as part of the
 * SwingSetConfig record it passes to initializeSwingset(). This
 * internal type represents the modified form passed to
 * initializeKernel() and kernelKeeper.createStartingKernelState .
 *
 * @typedef {object} InternalKernelOptions
 * @property {ManagerType} [defaultManagerType]
 * @property {ReapDirtThreshold} [defaultReapDirtThreshold]
 * @property {boolean} [relaxDurabilityRules]
 * @property {number} [snapshotInitial]
 * @property {number} [snapshotInterval]
 *
 *
 * The internal data that controls which worker we use (and how we use it) is
 * stored in a WorkerOptions record, which comes in "local", "node-subprocess",
 * and "xsnap" flavors.
 *
 * @typedef { { type: 'local' } } LocalWorkerOptions
 * @typedef { { type: 'xsnap', bundleIDs: BundleID[] } } XSnapWorkerOptions
 * @typedef { { type: 'node-subprocess', nodeOptions?: string[] } } NodeSubprocessWorkerOptions
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
 * @property { ReapDirtThreshold } reapDirtThreshold
 * @property { boolean } critical
 * @property { MeterID } [meterID] // property must be present, but can be undefined
 * @property { WorkerOptions } workerOptions
 * @property { boolean } enableDisavow
 *
 * @typedef ChangeVatOptions
 * @property {number} [reapInterval]
 */

/**
 * Reap/BringOutYourDead/BOYD Scheduling
 *
 * We trigger a BringOutYourDead delivery (which "reaps" all dead
 * objects from the vat) after a certain threshold of "dirt" has
 * accumulated. This type is used to define the thresholds for three
 * counters: 'deliveries', 'gcKrefs', and 'computrons'. If a property
 * is a number, we trigger BOYD when the counter for that property
 * exceeds the threshold value. If a property is the string 'never' or
 * missing we do not use that counter to trigger BOYD.
 *
 * Each vat has a .reapDirtThreshold in their vNN.options record,
 * which overrides the kernel-wide settings in
 * 'kernel.defaultReapDirtThreshold'
 *
 * @typedef {object} ReapDirtThreshold
 * @property {number | 'never'} [deliveries]
 * @property {number | 'never'} [gcKrefs]
 * @property {number | 'never'} [computrons]
 * @property {boolean} [never]
 */

/**
 * Each counter in Dirt matches a threshold in
 * ReapDirtThreshold. Missing values are treated as zero, so vats
 * start with {} and accumulate dirt as deliveries are made, until a
 * BOYD clears them.
 *
 * @typedef {object} Dirt
 * @property {number} [deliveries]
 * @property {number} [gcKrefs]
 * @property {number} [computrons]
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
 * @typedef { { type: 'changeVatOptions', vatID: VatID, options: ChangeVatOptions } } RunQueueEventChangeVatOptions
 * @typedef { { type: 'startVat', vatID: VatID, vatParameters: SwingSetCapData } } RunQueueEventStartVat
 * @typedef { { type: 'dropExports', vatID: VatID, krefs: string[] } } RunQueueEventDropExports
 * @typedef { { type: 'retireExports', vatID: VatID, krefs: string[] } } RunQueueEventRetireExports
 * @typedef { { type: 'retireImports', vatID: VatID, krefs: string[] } } RunQueueEventRetireImports
 * @typedef { { type: 'negated-gc-action', vatID?: VatID } } RunQueueEventNegatedGCAction
 * @typedef { { type: 'bringOutYourDead', vatID: VatID } } RunQueueEventBringOutYourDead
 * @import {CleanupBudget} from './types-external.js';
 * @typedef { { type: 'cleanup-terminated-vat', vatID: VatID,
 *              budget: CleanupBudget } } RunQueueEventCleanupTerminatedVat
 * @typedef { RunQueueEventNotify | RunQueueEventSend | RunQueueEventCreateVat |
 *            RunQueueEventUpgradeVat | RunQueueEventChangeVatOptions | RunQueueEventStartVat |
 *            RunQueueEventDropExports | RunQueueEventRetireExports | RunQueueEventRetireImports |
 *            RunQueueEventNegatedGCAction | RunQueueEventBringOutYourDead | RunQueueEventCleanupTerminatedVat
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
