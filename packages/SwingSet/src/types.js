// @ts-check

// import '@agoric/marshal/src/types';

/**
 * @typedef {CapData<string>} SwingSetCapData
 */

/**
 * @typedef {{
 *   bundle: unknown,
 *   enableSetup: false,
 * }} HasBundle
 * @typedef {{
 *   setup: unknown,
 *   enableSetup: true,
 * }} HasSetup
 *
 * TODO: metered...
 *
 * See validateManagerOptions() in factory.js
 * @typedef { 'local' | 'nodeWorker' | 'node-subprocess' | 'xs-worker' } ManagerType
 * @typedef {{
 *   managerType: ManagerType,
 *   metered?: boolean,
 *   enableDisavow?: boolean,
 *   vatParameters: Record<string, unknown>,
 *   virtualObjectCacheSize: number,
 *   name: string,
 *   compareSyscalls?: (originalSyscall: {}, newSyscall: {}) => Error | undefined,
 * } & (HasBundle | HasSetup)} ManagerOptions
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
 *   exitVat: unknown,
 *   exitVatWithFailure: unknown,
 * }} TerminationVatPowers
 */

/*
 * `['message', targetSlot, msg]`
 * msg is `{ method, args, result }`
 * `['notify', resolutions]`
 * `['dropExports', vrefs]`
 */

/**
 * @typedef {{
 * method: string,
 * args: SwingSetCapData,
 * result?: string,
 * }} Message
 *
 * @typedef { [tag: 'message', target: string, msg: Message]} VatDeliveryMessage
 * @typedef { [tag: 'notify', resolutions: string[] ]} VatDeliveryNotify
 * @typedef { [tag: 'dropExports', vrefs: string[] ]} VatDeliveryDropExports
 * @typedef { [tag: 'retireExports', vrefs: string[] ]} VatDeliveryRetireExports
 * @typedef { [tag: 'retireImports', vrefs: string[] ]} VatDeliveryRetireImports
 * @typedef { VatDeliveryMessage | VatDeliveryNotify | VatDeliveryDropExports
 *            | VatDeliveryRetireExports | VatDeliveryRetireImports
 *          } VatDeliveryObject
 * @typedef { [tag: 'ok', message: null, usage: unknown] | [tag: 'error', message: string, usage: unknown | null] } VatDeliveryResult
 *
 * @typedef { [tag: 'send', target: string, msg: Message] } VatSyscallSend
 * @typedef { [tag: 'callNow', target: string, method: string, args: SwingSetCapData]} VatSyscallCallNow
 * @typedef { [tag: 'subscribe', vpid: string ]} VatSyscallSubscribe
 * @typedef { [ vpid: string, rejected: boolean, data: SwingSetCapData ]} Resolutions
 * @typedef { [tag: 'resolve', resolutions: Resolutions ]} VatSyscallResolve
 * @typedef { [tag: 'vatstoreGet', key: string ]} VatSyscallVatstoreGet
 * @typedef { [tag: 'vatstoreSet', key: string, data: string ]} VatSyscallVatstoreSet
 * @typedef { [tag: 'vatstoreDelete', key: string ]} VatSyscallVatstoreDelete
 * @typedef { [tag: 'dropImports', slots: string[] ]} VatSyscallDropImports
 * @typedef { [tag: 'retireImports', slots: string[] ]} VatSyscallRetireImports
 * @typedef { [tag: 'retireExports', slots: string[] ]} VatSyscallRetireExports
 *
 * @typedef { VatSyscallSend | VatSyscallCallNow | VatSyscallSubscribe
 *    | VatSyscallResolve | VatSyscallVatstoreGet | VatSyscallVatstoreSet
 *    | VatSyscallVatstoreDelete | VatSyscallDropImports
 *    | VatSyscallRetireImports | VatSyscallRetireExports
 * } VatSyscallObject
 *
 * @typedef { [tag: 'ok', data: SwingSetCapData | string | null ]} VatSyscallResultOk
 * @typedef { [tag: 'error', err: string ] } VatSyscallResultError
 * @typedef { VatSyscallResultOk | VatSyscallResultError } VatSyscallResult
 * @typedef { (vso: VatSyscallObject) => VatSyscallResult } VatSyscaller
 *
 * @typedef { { d: VatDeliveryObject, syscalls: VatSyscallObject[] } } TranscriptEntry
 * @typedef { { transcriptCount: number } } VatStats
 * @typedef { { getTranscript: () => TranscriptEntry[],
 *              vatStats: () => VatStats,
 *             } } VatKeeper
 * @typedef { { getVatKeeper: (vatID: string) => VatKeeper } } KernelKeeper
 * @typedef { { write: ({}) => void,
 *             } } KernelSlog
 *
 * @typedef { { createFromBundle: (vatID: string,
 *                                 bundle: unknown,
 *                                 managerOptions: unknown,
 *                                 vatSyscallHandler: unknown) => Promise<VatManager>,
 *            } } VatManagerFactory
 * @typedef { { deliver: (delivery: VatDeliveryObject) => Promise<VatDeliveryResult>,
 *              replayTranscript: () => void,
 *              shutdown: () => Promise<void>,
 *            } } VatManager
 * @typedef { () => Promise<void> } WaitUntilQuiescent
 *
 */

/**
 * @typedef {{
 *   sourceSpec: string // path to the source code
 * }} SourceSpec
 * @typedef {{
 *   bundleSpec: string
 * }} BundleSpec
 * @typedef {{
 *   bundle: unknown
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
 * @typedef {Object} SwingSetConfig a swingset config object
 * @property {string} [bootstrap]
 * @property { ManagerType } [defaultManagerType]
 * @property {SwingSetConfigDescriptor} [vats]
 * @property {SwingSetConfigDescriptor} [bundles]
 * @property {*} [devices]
 *
 * Swingsets defined by scanning a directory in this manner define no devices.
 */

/**
 * @typedef { import('@agoric/swing-store-simple').SwingStore } SwingStore
 */
