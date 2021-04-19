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
 *   enableInternalMetering?: boolean,
 *   enableDisavow?: boolean,
 *   vatParameters: Record<string, unknown>,
 *   virtualObjectCacheSize: number,
 *   name: string,
 * } & (HasBundle | HasSetup)} ManagerOptions
 */

/**
 * See ../docs/static-vats.md#vatpowers
 *
 * @typedef { MarshallingVatPowers & EventualSyntaxVatPowers & TerminationVatPowers } VatPowers
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
 *   transformTildot: ReturnType<typeof import('@agoric/transform-eventual-send').makeTransform>,
 * }} EventualSyntaxVatPowers
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
 * @typedef { VatDeliveryMessage | VatDeliveryNotify | VatDeliveryDropExports } VatDeliveryObject
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
 *
 * @typedef { VatSyscallSend | VatSyscallCallNow | VatSyscallSubscribe
 *    | VatSyscallResolve | VatSyscallVatstoreGet | VatSyscallVatstoreSet
 *    | VatSyscallVatstoreDelete | VatSyscallDropImports
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
