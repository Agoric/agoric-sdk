export {};

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
 * @typedef { { moduleFormat: 'getExport', source: string, sourceMap: string? } } GetExportBundle
 * @typedef { { moduleFormat: 'nestedEvaluate', source: string, sourceMap: string? } } NestedEvaluateBundle
 * @typedef { EndoZipBase64Bundle | GetExportBundle | NestedEvaluateBundle } Bundle
 *
 * @typedef {{
 *   bundle: Bundle,
 *   enableSetup: false,
 * }} HasBundle
 * @typedef {{
 *   setup: unknown,
 *   enableSetup: true,
 * }} HasSetup
 *
 * @typedef { 'local' | 'xs-worker' } ManagerType
 * @typedef {{
 *   enablePipelining?: boolean,
 *   managerType: ManagerType,
 *   metered?: boolean,
 *   critical?: boolean,
 *   enableDisavow?: boolean,
 *   useTranscript?: boolean,
 *   reapInterval?: number | 'never',
 *   vatParameters: Record<string, unknown>,
 *   virtualObjectCacheSize: number,
 *   name: string,
 *   compareSyscalls?: (originalSyscall: {}, newSyscall: {}) => Error | undefined,
 *   sourcedConsole: Pick<Console, 'debug' | 'log' | 'info' | 'warn' | 'error'>,
 *   meterID?: string,
 * } & (HasBundle | HasSetup)} ManagerOptions
 */

/**
 * @typedef {{
 *   defaultManagerType?: ManagerType,
 *   defaultReapInterval?: number | 'never',
 *   relaxDurabilityRules?: boolean,
 *   snapshotInitial?: number,
 *   snapshotInterval?: number,
 *   pinBootstrapRoot?: boolean,
 * }} KernelOptions
 */

/**
 * See ../docs/static-vats.md#vatpowers
 *
 * @typedef { MarshallingVatPowers & TerminationVatPowers } VatPowers
 *
 * @typedef { (VatPowers & MeteringVatPowers) } StaticVatPowers
 *
 * @typedef {{
 *   Remotable: unknown,
 *   getInterfaceOf: unknown,
 * }} MarshallingVatPowers
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
 * @typedef {{ name: string, upgradeMessage: string, incarnationNumber: number }} DisconnectObject
 *
 * @typedef { import('@agoric/swingset-liveslots').VatDeliveryObject } VatDeliveryObject
 * @typedef { import('@agoric/swingset-liveslots').VatOneResolution } VatOneResolution
 * @typedef { { compute: number } } MeterConsumption
 * @typedef { [tag: 'ok', message: null, usage: MeterConsumption | null] |
 *            [tag: 'error', message: string, usage: MeterConsumption | null] } VatDeliveryResult
 *
 * @typedef { [tag: 'send', target: string, msg: Message] } VatSyscallSend
 * @typedef { [tag: 'callNow', target: string, method: string, args: SwingSetCapData]} VatSyscallCallNow
 * @typedef { [tag: 'subscribe', vpid: string ]} VatSyscallSubscribe
 * @typedef { [tag: 'resolve', resolutions: VatOneResolution[] ]} VatSyscallResolve
 * @typedef { [tag: 'exit', isFailure: boolean, info: SwingSetCapData ]} VatSyscallExit
 * @typedef { [tag: 'vatstoreGet', key: string ]} VatSyscallVatstoreGet
 * @typedef { [tag: 'vatstoreGetNextKey', priorKey: string ]} VatSyscallVatstoreGetNextKey
 * @typedef { [tag: 'vatstoreSet', key: string, data: string ]} VatSyscallVatstoreSet
 * @typedef { [tag: 'vatstoreDelete', key: string ]} VatSyscallVatstoreDelete
 * @typedef { [tag: 'dropImports', slots: string[] ]} VatSyscallDropImports
 * @typedef { [tag: 'retireImports', slots: string[] ]} VatSyscallRetireImports
 * @typedef { [tag: 'retireExports', slots: string[] ]} VatSyscallRetireExports
 * @typedef { [tag: 'abandonExports', slots: string[] ]} VatSyscallAbandonExports
 *
 * @typedef { VatSyscallSend | VatSyscallCallNow | VatSyscallSubscribe
 *    | VatSyscallResolve | VatSyscallExit | VatSyscallVatstoreGet | VatSyscallVatstoreGetNextKey
 *    | VatSyscallVatstoreSet | VatSyscallVatstoreDelete | VatSyscallDropImports
 *    | VatSyscallRetireImports | VatSyscallRetireExports | VatSyscallAbandonExports
 * } VatSyscallObject
 *
 * @typedef { [tag: 'ok', data: SwingSetCapData | string | string[] | null ]} VatSyscallResultOk
 * @typedef { [tag: 'error', err: string ] } VatSyscallResultError
 * @typedef { VatSyscallResultOk | VatSyscallResultError } VatSyscallResult
 * @typedef { (vso: VatSyscallObject) => VatSyscallResult } VatSyscaller
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
 * @typedef { { d: VatDeliveryObject, syscalls: VatSyscallObject[] } } TranscriptEntry
 * @typedef { { transcriptCount: number } } VatStats
 * @typedef { ReturnType<typeof import('./kernel/state/vatKeeper').makeVatKeeper> } VatKeeper
 * @typedef { ReturnType<typeof import('./kernel/state/kernelKeeper').default> } KernelKeeper
 * @typedef { ReturnType<typeof import('@agoric/xsnap').xsnap> } XSnap
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
 *                                  vatSourceBundle?: *,
 *                                  managerType?: string,
 *                                  vatParameters?: *) => VatSlog,
 *              terminateVat: (vatID: string, shouldReject: boolean, info: SwingSetCapData) => void,
 *             } } KernelSlog
 * @typedef { * } VatSlog
 *
 * @typedef { { createFromBundle: (vatID: string,
 *                                 bundle: Bundle,
 *                                 managerOptions: ManagerOptions,
 *                                 liveSlotsOptions: import('@agoric/swingset-liveslots').LiveSlotsOptions,
 *                                 vatSyscallHandler: unknown) => Promise<VatManager>,
 *            } } VatManagerFactory
 * @typedef { { deliver: (delivery: VatDeliveryObject) => Promise<VatDeliveryResult>,
 *              replayTranscript: (startPos: StreamPosition | undefined) => Promise<number?>,
 *              makeSnapshot?: (endPos: number, ss: SnapStore) => Promise<SnapshotResult>,
 *              shutdown: () => Promise<void>,
 *            } } VatManager
 *
 * @typedef { () => Promise<void> } WaitUntilQuiescent
 */

/**
 * @typedef {{
 *   sourceSpec: string // path to pre-bundled root
 * }} SourceSpec
 * @typedef {{
 *   bundleSpec: string // path to bundled code
 * }} BundleSpec
 * @typedef {{
 *   bundle: Bundle
 * }} BundleRef
 * @typedef {(SourceSpec | BundleSpec | BundleRef ) & {
 *   creationOptions?: Record<string, any>,
 *   parameters?: Record<string, any>,
 * }} SwingSetConfigProperties
 */

/**
 * @typedef {Record<string, SwingSetConfigProperties>} SwingSetConfigDescriptor
 * Where the property name is the name of the vat.  Note that
 * the `bootstrap` property names the vat that should be used as the bootstrap vat.  Although a swingset
 * configuration can designate any vat as its bootstrap vat, `loadBasedir` will always look for a file named
 * 'bootstrap.js' and use that (note that if there is no 'bootstrap.js', there will be no bootstrap vat).
 */

/**
 * @typedef {object} SwingSetConfig a swingset config object
 * @property {string} [bootstrap]
 * @property {boolean} [includeDevDependencies] indicates that
 * `devDependencies` of the surrounding `package.json` should be accessible to
 * bundles.
 * @property { ManagerType } [defaultManagerType]
 * @property {number} [snapshotInitial]
 * @property {number} [snapshotInterval]
 * @property {boolean} [relaxDurabilityRules]
 * @property {SwingSetConfigDescriptor} [vats]
 * @property {SwingSetConfigDescriptor} [bundles]
 * @property {BundleFormat} [bundleFormat] the bundle source / import bundle
 * format.
 * @property {*} [devices]
 */

/**
 * @typedef {object} SwingSetKernelConfig the config object passed to initializeKernel
 * @property {string} [bootstrap]
 * @property {boolean} [includeDevDependencies] indicates that
 * `devDependencies` of the surrounding `package.json` should be accessible to
 * bundles.
 * @property { ManagerType } [defaultManagerType]
 * @property {SwingSetConfigDescriptor} [vats]
 * @property {SwingSetConfigDescriptor} [bundles]
 * @property {Record<string, BundleID>} namedBundleIDs
 * @property {Record<BundleID, Bundle>} idToBundle
 * @property {BundleFormat} [bundleFormat] the bundle source / import bundle
 * format.
 * @property {*} [devices]
 */

/**
 * @typedef {{ bundleName: string} | { bundle: Bundle } | { bundleID: BundleID } } SourceOfBundle
 */
/**
 * @typedef { import('@agoric/swing-store').KVStore } KVStore
 * @typedef { import('@agoric/swing-store').SnapStore } SnapStore
 * @typedef { import('@agoric/swing-store').SnapshotResult } SnapshotResult
 * @typedef { import('@agoric/swing-store').StreamStore } StreamStore
 * @typedef { import('@agoric/swing-store').StreamPosition } StreamPosition
 * @typedef { import('@agoric/swing-store').SwingStore } SwingStore
 * @typedef { import('@agoric/swing-store').SwingStoreKernelStorage } SwingStoreKernelStorage
 * @typedef { import('@agoric/swing-store').SwingStoreHostStorage } SwingStoreHostStorage
 */

/**
 * @typedef { { computrons?: bigint } } PolicyInputDetails
 * @typedef { [tag: 'none', details: PolicyInputDetails ] } PolicyInputNone
 * @typedef { [tag: 'create-vat', details: PolicyInputDetails  ]} PolicyInputCreateVat
 * @typedef { [tag: 'crank', details: PolicyInputDetails ] } PolicyInputCrankComplete
 * @typedef { [tag: 'crank-failed', details: PolicyInputDetails ]} PolicyInputCrankFailed
 * @typedef { PolicyInputNone | PolicyInputCreateVat | PolicyInputCrankComplete | PolicyInputCrankFailed } PolicyInput
 * @typedef { boolean } PolicyOutput
 * @typedef { { vatCreated: (details: {}) => PolicyOutput,
 *              crankComplete: (details: { computrons?: bigint }) => PolicyOutput,
 *              crankFailed: (details: {}) => PolicyOutput,
 *              emptyCrank: () => PolicyOutput,
 *             } } RunPolicy
 */

/**
 * Vat Creation and Management
 *
 * @typedef { string } BundleID
 * @typedef {*} BundleCap
 * @typedef { { moduleFormat: 'endoZipBase64', endoZipBase64: string, endoZipBase64Sha512: string } } EndoZipBase64Bundle
 *
 * @typedef { unknown } Meter
 *
 * E(vatAdminService).createVat(bundle, options: DynamicVatOptions)
 *
 * @typedef { { description?: string,
 *              meter?: Meter,
 *              managerType?: ManagerType,
 *              vatParameters?: *,
 *              enableSetup?: boolean,
 *              enablePipelining?: boolean
 *              virtualObjectCacheSize?: number,
 *              useTranscript?: boolean,
 *              reapInterval? : number | 'never',
 *              critical?: boolean,
 *            }} DynamicVatOptionsWithoutMeter
 * @typedef { { meter?: Meter } } HasMeter
 * @typedef { DynamicVatOptionsWithoutMeter & HasMeter } DynamicVatOptions
 *
 * config.vats[name].creationOptions: StaticVatOptions
 *
 * @typedef { { enableDisavow?: boolean } } HasEnableDisavow
 * @typedef { DynamicVatOptions & HasEnableDisavow } StaticVatOptions
 *
 * @typedef { { vatParameters?: object, upgradeMessage: string } } VatUpgradeOptions
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
 * @typedef {object} CreateVatResults
 * @property {object} root
 * @property {VatAdminFacet} adminNode
 *
 * @typedef {object} VatAdminSvc
 * @property {(id: BundleID) => ERef<BundleCap>} waitForBundleCap
 * @property {(id: BundleID) => ERef<BundleCap>} getBundleCap
 * @property {(name: string) => ERef<BundleCap>} getNamedBundleCap
 * @property {(name: string) => ERef<BundleID>} getBundleIDByName
 * @property {(bundleCap: BundleCap, options?: DynamicVatOptions) => ERef<CreateVatResults>} createVat
 *
 */
