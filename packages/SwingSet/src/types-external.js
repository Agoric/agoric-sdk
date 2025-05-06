/** @import { ERef } from '@endo/far'; */

export {};

/**
 * @import {Guarded} from '@endo/exo';
 * @import {Passable, RemotableObject} from '@endo/pass-style';
 */

/* This file defines types that part of the external API of swingset. That
 * includes standard services which user-provided vat code might interact
 * with, like VatAdminService. */

/**
 * @typedef {'getExport' | 'nestedEvaluate' | 'endoZipBase64'} BundleFormat
 */

/**
 * @typedef {import('@endo/marshal').CapData<string>} SwingSetCapData
 */

/**
 * @typedef { { moduleFormat: 'getExport', source: string, sourceMap?: string } } GetExportBundle
 * @typedef { { moduleFormat: 'nestedEvaluate', source: string, sourceMap?: string } } NestedEvaluateBundle
 * @typedef { EndoZipBase64Bundle | GetExportBundle | NestedEvaluateBundle } Bundle
 *
 * @typedef { 'local' | 'node-subprocess' | 'xsnap' | 'xs-worker' } ManagerType
 */

/**
 * @typedef {object} KernelOptions
 * @property {ManagerType} [defaultManagerType]
 * @property {number | 'never'} [defaultReapGCKrefs]
 * @property {number | 'never'} [defaultReapInterval]
 * @property {boolean} [relaxDurabilityRules]
 * @property {number} [snapshotInitial]
 * @property {number} [snapshotInterval]
 * @property {boolean} [pinBootstrapRoot]
 */

/**
 * See ../docs/static-vats.md#vatpowers
 *
 * @typedef { TerminationVatPowers } VatPowers
 *
 * @typedef { (VatPowers & MeteringVatPowers) } StaticVatPowers
 *
 * @typedef {{
 *   makeGetMeter: unknown,
 *   transformMetering: unknown,
 * }} MeteringVatPowers
 *
 * @typedef {{
 *   exitVat: (unknown) => void,
 *   exitVatWithFailure: (reason: Error) => void,
 * }} TerminationVatPowers
 */

/*
 * `['message', targetSlot, msg]`
 * msg is `{ methargs, result }`
 * `['notify', resolutions]`
 * `['dropExports', vrefs]`
 */

/**
 * @typedef { import('@agoric/swingset-liveslots').Message } Message
 *
 * @typedef { 'none' | 'ignore' | 'logAlways' | 'logFailure' | 'panic' } ResolutionPolicy
 *
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryObject } VatDeliveryObject
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryResult } VatDeliveryResult
 * @typedef { import('@agoric/swingset-liveslots').VatSyscallObject } VatSyscallObject
 * @typedef { import('@agoric/swingset-liveslots').VatSyscallResult } VatSyscallResult
 *
 * @typedef { [tag: 'message', target: string, msg: Message]} KernelDeliveryMessage
 * @typedef { [kpid: string, kp: { state: string, data: SwingSetCapData }] } KernelDeliveryOneNotify
 * @typedef { [tag: 'notify', resolutions: KernelDeliveryOneNotify[] ]} KernelDeliveryNotify
 * @typedef { [tag: 'dropExports', krefs: string[] ]} KernelDeliveryDropExports
 * @typedef { [tag: 'retireExports', krefs: string[] ]} KernelDeliveryRetireExports
 * @typedef { [tag: 'retireImports', krefs: string[] ]} KernelDeliveryRetireImports
 * @typedef { [tag: 'changeVatOptions', options: Record<string, unknown> ]} KernelDeliveryChangeVatOptions
 * @typedef { [tag: 'startVat', vatParameters: SwingSetCapData ]} KernelDeliveryStartVat
 * @typedef { [tag: 'stopVat', disconnectObject: SwingSetCapData ]} KernelDeliveryStopVat
 * @typedef { [tag: 'bringOutYourDead']} KernelDeliveryBringOutYourDead
 * @typedef { KernelDeliveryMessage | KernelDeliveryNotify | KernelDeliveryDropExports
 *            | KernelDeliveryRetireExports | KernelDeliveryRetireImports | KernelDeliveryChangeVatOptions
 *            | KernelDeliveryStartVat | KernelDeliveryStopVat | KernelDeliveryBringOutYourDead
 *          } KernelDeliveryObject
 * @typedef { [tag: 'send', target: string, msg: Message] } KernelSyscallSend
 * @typedef { [tag: 'invoke', target: string, method: string, args: SwingSetCapData]} KernelSyscallInvoke
 * @typedef { [tag: 'subscribe', vatID: string, kpid: string ]} KernelSyscallSubscribe
 * @typedef { [kpid: string, rejected: boolean, data: SwingSetCapData]} KernelOneResolution
 * @typedef { [tag: 'resolve', vatID: string, resolutions: KernelOneResolution[] ]} KernelSyscallResolve
 * @typedef { [tag: 'exit', vatID: string, isFailure: boolean, info: SwingSetCapData ]} KernelSyscallExit
 * @typedef { [tag: 'vatstoreGet', vatID: string, key: string ]} KernelSyscallVatstoreGet
 * @typedef { [tag: 'vatstoreGetNextKey', vatID: string, priorKey: string ]} KernelSyscallVatstoreGetNextKey
 * @typedef { [tag: 'vatstoreSet', vatID: string, key: string, data: string ]} KernelSyscallVatstoreSet
 * @typedef { [tag: 'vatstoreDelete', vatID: string, key: string ]} KernelSyscallVatstoreDelete
 * @typedef { [tag: 'dropImports', krefs: string[] ]} KernelSyscallDropImports
 * @typedef { [tag: 'retireImports', krefs: string[] ]} KernelSyscallRetireImports
 * @typedef { [tag: 'retireExports', krefs: string[] ]} KernelSyscallRetireExports
 * @typedef { [tag: 'abandonExports', vatID: string, krefs: string[] ]} KernelSyscallAbandonExports
 * @typedef { [tag: 'callKernelHook', hookName: string, args: SwingSetCapData]} KernelSyscallCallKernelHook
 *
 * @typedef { KernelSyscallSend | KernelSyscallInvoke | KernelSyscallSubscribe
 *    | KernelSyscallResolve | KernelSyscallExit | KernelSyscallVatstoreGet | KernelSyscallVatstoreGetNextKey
 *    | KernelSyscallVatstoreSet | KernelSyscallVatstoreDelete | KernelSyscallDropImports
 *    | KernelSyscallRetireImports | KernelSyscallRetireExports | KernelSyscallAbandonExports
 *    | KernelSyscallCallKernelHook
 * } KernelSyscallObject
 * @typedef { [tag: 'ok', data: SwingSetCapData | string | string[] | undefined[] | null ]} KernelSyscallResultOk
 * @typedef { [tag: 'error', err: string ] } KernelSyscallResultError
 * @typedef { KernelSyscallResultOk | KernelSyscallResultError } KernelSyscallResult
 *
 * @typedef {[string, string, SwingSetCapData]} DeviceInvocation
 * @property {string} 0 Kernel slot designating the device node that is the target of
 * the invocation
 * @property {string} 1 A string naming the method to be invoked
 * @property {import('@endo/marshal').CapData<unknown>} 2 A capdata object containing the arguments to the invocation
 * @typedef {[tag: 'ok', data: SwingSetCapData]} DeviceInvocationResultOk
 * @typedef {[tag: 'error', problem: string]} DeviceInvocationResultError
 * @typedef { DeviceInvocationResultOk | DeviceInvocationResultError } DeviceInvocationResult
 *
 * @typedef { { transcriptCount: number } } VatStats
 * @typedef { ReturnType<typeof import('./kernel/state/vatKeeper.js').makeVatKeeper> } VatKeeper
 * @typedef { import('./kernel/state/kernelKeeper.js').KernelKeeper } KernelKeeper
 * @typedef { Awaited<ReturnType<typeof import('@agoric/xsnap').xsnap>> } XSnap
 * @typedef { (dr: VatDeliveryResult) => void } SlogFinishDelivery
 * @typedef { (ksr: KernelSyscallResult, vsr: VatSyscallResult) => void } SlogFinishSyscall
 * @typedef { { write: ({}) => void,
 *              vatConsole: (vatID: string, origConsole: {}) => {},
 *              delivery: (vatID: string,
 *                         newCrankNum: BigInt, newDeliveryNum: BigInt,
 *                         kd: KernelDeliveryObject, vd: VatDeliveryObject,
 *                         replay?: boolean) => SlogFinishDelivery,
 *              syscall: (vatID: string,
 *                        ksc: KernelSyscallObject | undefined,
 *                        vsc: VatSyscallObject) => SlogFinishSyscall,
 *              provideVatSlogger: (vatID: string,
 *                                  dynamic?: boolean,
 *                                  description?: string,
 *                                  name?: string,
 *                                  vatSourceBundle?: unknown,
 *                                  managerType?: string,
 *                                  vatParameters?: unknown) => { vatSlog: VatSlog },
 *              terminateVat: (vatID: string, shouldReject: boolean, info: SwingSetCapData) => void,
 *             } } KernelSlog
 * @typedef {{
 *   delivery: (crankNum: bigint, deliveryNum: bigint, kd: KernelDeliveryObject, vd: VatDeliveryObject) => SlogFinishDelivery,
 * }} VatSlog
 *
 * @typedef { () => Promise<void> } WaitUntilQuiescent
 */

/**
 * @typedef {{ bundle: Bundle }} BundleRef a bundle object
 * @typedef {{ bundleName: string }} BundleName a name identifying a property in the `bundles` of a SwingSetOptions object
 * @typedef {{ bundleSpec: string }} BundleSpec a path to a bundle file
 * @typedef {{ sourceSpec: string }} SourceSpec a package specifier such as "@agoric/swingset-vat/tools/vat-puppet.js"
 *
 * @typedef {{
 *   bundleID?: BundleID,
 *   creationOptions?: StaticVatOptions,
 *   parameters?: Record<string, any>,
 * }} VatConfigOptions
 */
/**
 * @template [Fields=object]
 * @typedef {(SourceSpec | BundleSpec | BundleName | BundleRef) & Fields} SwingSetConfigProperties
 */

/**
 * @template [Fields=object]
 * @typedef {Record<string, SwingSetConfigProperties<Fields>>} SwingSetConfigDescriptor
 * Where the property name is the name of the vat.  Note that
 * the `bootstrap` property names the vat that should be used as the bootstrap vat.  Although a swingset
 * configuration can designate any vat as its bootstrap vat, `loadBasedir` will always look for a file named
 * 'bootstrap.js' and use that (note that if there is no 'bootstrap.js', there will be no bootstrap vat).
 */

/**
 * @typedef {object} SwingSetOptions
 * @property {string} [bootstrap]
 * @property {boolean} [includeDevDependencies] indicates that
 * `devDependencies` of the surrounding `package.json` should be accessible to
 * bundles.
 * @property {string} [bundleCachePath] if present, SwingSet will use a bundle cache at this path
 * @property {SwingSetConfigDescriptor<VatConfigOptions>} vats
 * @property {SwingSetConfigDescriptor} [bundles]
 * @property {BundleFormat} [bundleFormat] the bundle source / import bundle
 * format.
 * @property {any} [devices]
 */
/**
 * @typedef {KernelOptions & SwingSetOptions} SwingSetConfig a swingset config object
 */

/**
 * @typedef {SwingSetConfig & {
 *   namedBundleIDs: Record<string, BundleID>,
 *   idToBundle: Record<BundleID, Bundle>
 * }} SwingSetKernelConfig the config object passed to initializeKernel
 */

/**
 * @typedef {BundleName | BundleRef | {bundleID: BundleID}} SourceOfBundle
 */
/**
 * @typedef { import('@agoric/swing-store').KVStore } KVStore
 * @typedef { import('@agoric/swing-store').SnapStore } SnapStore
 * @typedef { import('@agoric/swing-store').SnapshotResult } SnapshotResult
 * @typedef { import('@agoric/swing-store').TranscriptStore } TranscriptStore
 * @typedef { import('@agoric/swing-store').SwingStore } SwingStore
 * @typedef { import('@agoric/swing-store').SwingStoreKernelStorage } SwingStoreKernelStorage
 * @typedef { import('@agoric/swing-store').SwingStoreHostStorage } SwingStoreHostStorage
 */

/**
 * PolicyInput is used internally within kernel.js, returned by each
 * message processor, and used to decide which of the host's runPolicy
 * methods to invoke. The 'details' portion of PolicyInput is passed
 * as an argument to those methods, so those types are
 * externally-visible.
 *
 * @typedef { { exports: number,
 *              imports: number,
 *              promises: number,
 *              kv: number,
 *              snapshots: number,
 *              transcripts: number,
 *            } } CleanupWork
 *
 * @typedef { { total: number } & CleanupWork } PolicyInputCleanupCounts
 * @typedef { { cleanups: PolicyInputCleanupCounts, computrons?: bigint } } PolicyInputCleanupDetails
 * @typedef { { computrons?: bigint } } PolicyInputDetails
 *
 * @typedef { [tag: 'none', details: PolicyInputDetails ] } PolicyInputNone
 * @typedef { [tag: 'create-vat', details: PolicyInputDetails  ]} PolicyInputCreateVat
 * @typedef { [tag: 'crank', details: PolicyInputDetails ] } PolicyInputCrankComplete
 * @typedef { [tag: 'crank-failed', details: PolicyInputDetails ]} PolicyInputCrankFailed
 * @typedef { [tag: 'cleanup', details: PolicyInputCleanupDetails] } PolicyInputCleanup
 *
 * @typedef { PolicyInputNone | PolicyInputCreateVat | PolicyInputCrankComplete |
 *            PolicyInputCrankFailed | PolicyInputCleanup } PolicyInput
 *
 * CleanupBudget is the internal record used to limit the slow
 * deletion of terminated vats. Each property limits the number of
 * deletions per 'cleanup-terminated-vat' run-queue event, for a
 * specific phase (imports, exports, snapshots, etc). It must always
 * have a 'default' property, which is used for phases that aren't
 * otherwise specified.
 *
 * @typedef { { default: number } & Partial<CleanupWork> } CleanupBudget
 *
 * PolicyOutputCleanupBudget is the return value of
 * runPolicy.allowCleanup(), and tells the kernel how much it is
 * allowed to clean up. It is either a CleanupBudget, or 'true' to
 * allow unlimited cleanup, or 'false' to forbid any cleanup.
 *
 * @typedef {CleanupBudget | true | false} PolicyOutputCleanupBudget
 *
 * PolicyOutput is the boolean returned by all the other runPolicy
 * methods, where 'true' means "keep going", and 'false' means "stop
 * now".
 *
 * @typedef {boolean} PolicyOutput
 *
 * @typedef { {
 *              allowCleanup?: () => boolean | PolicyOutputCleanupBudget,
 *              vatCreated: (details: {}) => PolicyOutput,
 *              crankComplete: (details: { computrons?: bigint }) => PolicyOutput,
 *              crankFailed: (details: {}) => PolicyOutput,
 *              emptyCrank: () => PolicyOutput,
 *              didCleanup?: (details: PolicyInputCleanupDetails) => PolicyOutput,
 *             } } RunPolicy
 */

/**
 * @typedef {object} VatWarehousePolicy
 * @property { number } [maxVatsOnline]     Limit the number of simultaneous workers
 * @property { boolean } [restartWorkerOnSnapshot]     Reload worker immediately upon snapshot creation
 */

/**
 * @typedef { import('./devices/mailbox/mailbox.js').Mailbox } Mailbox
 */
/**
 * @typedef { import('./devices/mailbox/mailbox.js').MailboxExport } MailboxExport
 */

/**
 * Vat Creation and Management
 *
 * @typedef { string } BundleID
 * @typedef { any } BundleCap
 * @typedef { { moduleFormat: 'endoZipBase64', endoZipBase64: string, endoZipBase64Sha512: string } } EndoZipBase64Bundle
 */

/**
 * The options used to define vats pass can come from two primary APIs:
 *  * config record: config.vats[name].creationOptions
 *  * E(vatAdminService).createVat(bundlecap, options)
 *
 * These two sources use StaticVatOptions and DynamicVatOptions
 * respectively (the dynamic options are more restrictive, but can include
 * a Meter object). The dynamic `createVat()` process creates a run-queue
 * event named 'create-vat', which carries a form named
 * InternalDynamicVatOptions (which can include a MeterID integer).
 *
 * For both types, when we finally create the vat, the options are
 * converted into RecordedVatOptions, which is plain data and gets stored
 * in the DB (vatKeeper.setSourceAndOptions).
 *
 * Later, when a worker is launched for this vat, vat-loader.js converts
 * the recorded options into ManagerOptions, which explains to the manager
 * how to configure and communicate with the worker.
 *
 * 'BaseVatOptions' holds the common subset of all these types. The other
 * types are then defined as amendments to this base type.
 *
 * @typedef { object } BaseVatOptions
 * @property { boolean } [enableSetup]
 *           If true, permits the vat to construct itself using the
 *           `setup()` API, which bypasses the imposition of LiveSlots but
 *           requires the vat implementation to enforce the vat invariants
 *           manually.  If false, the vat will be constructed using the
 *           `buildRootObject()` API, which uses LiveSlots to enforce the
 *           vat invariants automatically.  Defaults to false.
 * @property { boolean } [enablePipelining]
 *            If true, permits the kernel to pipeline messages to promises
 *            for which the vat is the decider directly to the vat without
 *            waiting for the promises to be resolved.  If false, such
 *            messages will be queued inside the kernel.  Defaults to
 *            false.
 * @property { boolean } [useTranscript]
 *            If true, saves a transcript of a vat's inbound deliveries and
 *            outbound syscalls so that the vat's internal state can be
 *            reconstructed via replay.  If false, no such record is kept.
 *            Defaults to true.
 * @property { ManagerType } [managerType]
 * @property { boolean } [neverReap]
 *            If true, disables automatic bringOutYourDead deliveries to a vat.
 *            Defaults to false.
 * @property { number | 'never' } [reapInterval]
 *            Trigger a bringOutYourDead after the vat has received
 *            this many deliveries. If the value is 'never',
 *            'bringOutYourDead' will not be triggered by a delivery
 *            count (but might be triggered for other reasons).
 * @property { number | 'never' } [reapGCKrefs]
 *            Trigger a bringOutYourDead when the vat has been given
 *            this many krefs in GC deliveries (dropImports,
 *            retireImports, retireExports). If the value is 'never',
 *            GC deliveries and their krefs are not treated specially.
 * @property { boolean } [critical]
 */

/**
 * @typedef { { meter?: unknown } } OptMeter
 *        If a meter is provided, the new dynamic vat is limited to a fixed
 *        amount of computation and allocation that can occur during any
 *        given crank. Peak stack frames are limited as well. In addition,
 *        the given meter's "remaining" value will be reduced by the amount
 *        of computation used by each crank. The meter will eventually
 *        underflow unless it is topped up, at which point the vat is
 *        terminated. If undefined, the vat is unmetered. Static vats
 *        cannot be metered.
 *
 * @typedef { BaseVatOptions & { name: string, vatParameters?: object } & OptMeter } DynamicVatOptions
 *
 * config.vats[name].creationOptions: StaticVatOptions
 *
 * @typedef { { enableDisavow?: boolean } } OptEnableDisavow
 * @typedef { { nodeOptions?: string[] } } OptNodeOptions
 * @typedef { BaseVatOptions & OptEnableDisavow & OptNodeOptions } StaticVatOptions
 *
 * @typedef { { vatParameters?: object, upgradeMessage?: string } } VatUpgradeOptions
 * @typedef { { incarnationNumber: number } } VatUpgradeResults
 *
 * @callback ShutdownWithFailure
 * Called to shut something down because something went wrong, where the reason
 * is supposed to be an Error that describes what went wrong. Some valid
 * implementations of `ShutdownWithFailure` will never return, either
 * because they throw or because they immediately shutdown the enclosing unit
 * of computation. However, they also might return, so the caller should
 * follow this call by their own defensive `throw reason;` if appropriate.
 *
 * @param {Error} reason
 * @returns {void}
 *
 * @typedef {object} VatAdminFacet
 * A powerful object corresponding with a vat
 * that can be used to upgrade it with new code or parameters,
 * terminate it, or be notified when it terminates.
 *
 * @property {() => Promise<any>} done
 * returns a promise that will be fulfilled or rejected when the vat is
 * terminated. If the vat terminates with a failure, the promise will be
 * rejected with the reason. If the vat terminates successfully, the
 * promise will fulfill to the completion value.
 * @property {ShutdownWithFailure} terminateWithFailure
 * Terminate the vat with a failure reason.
 * @property {(bundlecap: BundleCap, options?: VatUpgradeOptions) => Promise<VatUpgradeResults>} upgrade
 * Restart the vat with the specified bundle and options. This is a "baggage-style" upgrade,
 * in which the JS memory space is abandoned. The new image is launched with access to 'baggage'
 * and any durable storage reachable from it, and must fulfill all the obligations of the previous
 * incarnation.
 *
 *
 * @typedef {{ adminNode: Guarded<VatAdminFacet>, root: object }} CreateVatResults
 *
 * @typedef {object} VatAdminSvc
 * @property {(id: BundleID) => ERef<BundleCap>} waitForBundleCap
 * @property {(id: BundleID) => ERef<BundleCap>} getBundleCap
 * @property {(name: string) => ERef<BundleCap>} getNamedBundleCap
 * @property {(name: string) => ERef<BundleID>} getBundleIDByName
 * @property {(bundleCap: BundleCap, options?: DynamicVatOptions) => ERef<CreateVatResults>} createVat
 *
 */
