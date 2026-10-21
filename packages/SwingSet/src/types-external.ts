/**
 * This file defines types that are part of the external API of swingset. That
 * includes standard services which user-provided vat code might interact with,
 * like VatAdminService.
 */

import type { Guarded } from '@endo/exo';
import type { ERef } from '@endo/far';
import type { CapData } from '@endo/marshal';
import type { LimitedConsole } from '@agoric/internal/src/js-utils.js';
import type { xsnap } from '@agoric/xsnap';

// Types sourced elsewhere but re-exported as part of the SwingSet external API
// (see the `export type { ... }` block below).
import type {
  Message,
  VatDeliveryObject,
  VatDeliveryResult,
  VatSyscallObject,
  VatSyscallResult,
} from '@agoric/swingset-liveslots';
import type { KVStore } from '@agoric/internal/src/kv-store.js';
import type {
  SnapStore,
  SnapshotResult,
  TranscriptStore,
  SwingStore,
  SwingStoreKernelStorage,
  SwingStoreHostStorage,
} from '@agoric/swing-store';
import type { makeVatKeeper } from './kernel/state/vatKeeper.js';
import type { StartDuration } from './kernel/slogger.js';
import type { SlogProps } from './controller/controller.js';
import type { KernelKeeper } from './kernel/state/kernelKeeper.js';
import type { Mailbox, MailboxExport } from './devices/mailbox/mailbox.js';

export type {
  Message,
  VatDeliveryObject,
  VatDeliveryResult,
  VatSyscallObject,
  VatSyscallResult,
  KVStore,
  SnapStore,
  SnapshotResult,
  TranscriptStore,
  SwingStore,
  SwingStoreKernelStorage,
  SwingStoreHostStorage,
  KernelKeeper,
  Mailbox,
  MailboxExport,
};

export type Device<T> = 'Device' & { __deviceType__: T };

/** (approximately) */
export type DProxy = <T>(target: Device<T>) => T;

export type SwingSetCapData = CapData<string>;

// TODO move Bundle types into Endo
export type BundleFormat = 'getExport' | 'nestedEvaluate' | 'endoZipBase64';
export type GetExportBundle = {
  moduleFormat: 'getExport';
  source: string;
  sourceMap?: string;
};
export type NestedEvaluateBundle = {
  moduleFormat: 'nestedEvaluate';
  source: string;
  sourceMap?: string;
};
export type TestBundle = {
  moduleFormat: 'test';
  [x: symbol]: Record<PropertyKey, unknown>;
};
export type Bundle =
  | EndoZipBase64Bundle
  | GetExportBundle
  | NestedEvaluateBundle
  | TestBundle;

/**
 * The type of worker for hosting a vat.
 *
 * - **local**: a Compartment in the SwingSet Node.js process
 * - **node-subprocess**: a child process using the same Node.js executable
 *   (`process.execPath`)
 * - **xsnap** or **xs-worker**: an `@agoric/xsnap` worker
 */
export type ManagerType = 'local' | 'node-subprocess' | 'xsnap' | 'xs-worker';

export interface KernelOptions {
  defaultManagerType?: ManagerType;
  defaultReapGCKrefs?: number | 'never';
  defaultReapInterval?: number | 'never';
  relaxDurabilityRules?: boolean;
  snapshotInitial?: number;
  snapshotInterval?: number;
  pinBootstrapRoot?: boolean;
}

/**
 * See ../docs/static-vats.md#vatpowers
 */
export type VatPowers = TerminationVatPowers;

export type StaticVatPowers = VatPowers & MeteringVatPowers;

export type MeteringVatPowers = {
  makeGetMeter: unknown;
  transformMetering: unknown;
};

export type TerminationVatPowers = {
  exitVat: (completion: unknown) => void;
  exitVatWithFailure: (reason: Error) => void;
};

/*
 * `['message', targetSlot, msg]`
 * msg is `{ methargs, result }`
 * `['notify', resolutions]`
 * `['dropExports', vrefs]`
 */

export type ResolutionPolicy =
  | 'none'
  | 'ignore'
  | 'logAlways'
  | 'logFailure'
  | 'panic';

export type KernelDeliveryMessage = [
  tag: 'message',
  target: string,
  msg: Message,
];
export type KernelDeliveryOneNotify = [
  kpid: string,
  kp: { state: string; data: SwingSetCapData },
];
export type KernelDeliveryNotify = [
  tag: 'notify',
  resolutions: KernelDeliveryOneNotify[],
];
export type KernelDeliveryDropExports = [tag: 'dropExports', krefs: string[]];
export type KernelDeliveryRetireExports = [
  tag: 'retireExports',
  krefs: string[],
];
export type KernelDeliveryRetireImports = [
  tag: 'retireImports',
  krefs: string[],
];
export type KernelDeliveryChangeVatOptions = [
  tag: 'changeVatOptions',
  options: Record<string, unknown>,
];
export type KernelDeliveryStartVat = [
  tag: 'startVat',
  vatParameters: SwingSetCapData,
];
export type KernelDeliveryStopVat = [
  tag: 'stopVat',
  disconnectObject: SwingSetCapData,
];
export type KernelDeliveryBringOutYourDead = [tag: 'bringOutYourDead'];
export type KernelDeliveryObject =
  | KernelDeliveryMessage
  | KernelDeliveryNotify
  | KernelDeliveryDropExports
  | KernelDeliveryRetireExports
  | KernelDeliveryRetireImports
  | KernelDeliveryChangeVatOptions
  | KernelDeliveryStartVat
  | KernelDeliveryStopVat
  | KernelDeliveryBringOutYourDead;
export type KernelSyscallSend = [tag: 'send', target: string, msg: Message];
export type KernelSyscallInvoke = [
  tag: 'invoke',
  target: string,
  method: string,
  args: SwingSetCapData,
];
export type KernelSyscallSubscribe = [
  tag: 'subscribe',
  vatID: string,
  kpid: string,
];
export type KernelOneResolution = [
  kpid: string,
  rejected: boolean,
  data: SwingSetCapData,
];
export type KernelSyscallResolve = [
  tag: 'resolve',
  vatID: string,
  resolutions: KernelOneResolution[],
];
export type KernelSyscallExit = [
  tag: 'exit',
  vatID: string,
  isFailure: boolean,
  info: SwingSetCapData,
];
export type KernelSyscallVatstoreGet = [
  tag: 'vatstoreGet',
  vatID: string,
  key: string,
];
export type KernelSyscallVatstoreGetNextKey = [
  tag: 'vatstoreGetNextKey',
  vatID: string,
  priorKey: string,
];
export type KernelSyscallVatstoreSet = [
  tag: 'vatstoreSet',
  vatID: string,
  key: string,
  data: string,
];
export type KernelSyscallVatstoreDelete = [
  tag: 'vatstoreDelete',
  vatID: string,
  key: string,
];
export type KernelSyscallDropImports = [tag: 'dropImports', krefs: string[]];
export type KernelSyscallRetireImports = [
  tag: 'retireImports',
  krefs: string[],
];
export type KernelSyscallRetireExports = [
  tag: 'retireExports',
  krefs: string[],
];
export type KernelSyscallAbandonExports = [
  tag: 'abandonExports',
  vatID: string,
  krefs: string[],
];
export type KernelSyscallCallKernelHook = [
  tag: 'callKernelHook',
  hookName: string,
  args: SwingSetCapData,
];
export type KernelSyscallObject =
  | KernelSyscallSend
  | KernelSyscallInvoke
  | KernelSyscallSubscribe
  | KernelSyscallResolve
  | KernelSyscallExit
  | KernelSyscallVatstoreGet
  | KernelSyscallVatstoreGetNextKey
  | KernelSyscallVatstoreSet
  | KernelSyscallVatstoreDelete
  | KernelSyscallDropImports
  | KernelSyscallRetireImports
  | KernelSyscallRetireExports
  | KernelSyscallAbandonExports
  | KernelSyscallCallKernelHook;
export type KernelSyscallResultOk = [
  tag: 'ok',
  data: SwingSetCapData | string | string[] | undefined[] | null,
];
export type KernelSyscallResultError = [tag: 'error', err: string];
export type KernelSyscallResult =
  | KernelSyscallResultOk
  | KernelSyscallResultError;

export type DeviceInvocation = [
  /** Kernel slot designating the device node that is the target of the invocation */
  target: string,
  /** A string naming the method to be invoked */
  method: string,
  /** A capdata object containing the arguments to the invocation */
  args: SwingSetCapData,
];
export type DeviceInvocationResultOk = [tag: 'ok', data: SwingSetCapData];
export type DeviceInvocationResultError = [tag: 'error', problem: string];
export type DeviceInvocationResult =
  | DeviceInvocationResultOk
  | DeviceInvocationResultError;

export type VatStats = { transcriptCount: number };
export type VatKeeper = ReturnType<typeof makeVatKeeper>;
export type XSnap = Awaited<ReturnType<typeof xsnap>>;
export type SlogFinishDelivery = (dr: VatDeliveryResult) => void;
export type SlogFinishSyscall = (
  ksr: KernelSyscallResult,
  vsr: VatSyscallResult,
) => void;
export type KernelSlog = {
  write: (obj: SlogProps) => void;
  startDuration: StartDuration;
  provideVatSlogger: (
    vatID: string,
    dynamic?: boolean,
    description?: string,
    name?: string,
    vatSourceBundle?: unknown,
    managerType?: string,
    vatParameters?: unknown,
  ) => { vatSlog: VatSlog };
  vatConsole: (vatID: string, origConsole: LimitedConsole) => LimitedConsole;
  startup: (vatID: string) => () => void;
  delivery: (
    vatID: string,
    newCrankNum: bigint,
    newDeliveryNum: bigint,
    kd: KernelDeliveryObject,
    vd: VatDeliveryObject,
    replay?: boolean,
  ) => SlogFinishDelivery;
  syscall: (
    vatID: string,
    ksc: KernelSyscallObject | undefined,
    vsc: VatSyscallObject,
  ) => SlogFinishSyscall;
  changeCList: (
    vatID: string,
    crankNum: bigint,
    mode: 'import' | 'export' | 'drop',
    kernelSlot: string,
    vatSlot: string,
  ) => void;
  terminateVat: (
    vatID: string,
    shouldReject: boolean,
    info: SwingSetCapData,
  ) => void;
};
export type VatSlog = {
  delivery: (
    crankNum: bigint,
    deliveryNum: bigint,
    kd: KernelDeliveryObject,
    vd: VatDeliveryObject,
  ) => SlogFinishDelivery;
};

export type WaitUntilQuiescent = () => Promise<void>;

/** a bundle object */
export type BundleRef = { bundle: Bundle };
/** a name identifying a property in the `bundles` of a SwingSetOptions object */
export type BundleName = { bundleName: string };
/** a path to a bundle file */
export type BundleSpec = { bundleSpec: string };
/** a package specifier such as "@agoric/swingset-vat/tools/vat-puppet.js" */
export type SourceSpec = { sourceSpec: string };

export type VatConfigOptions = {
  bundleID?: BundleID;
  creationOptions?: StaticVatOptions;
  parameters?: Record<string, any>;
};

export type SwingSetConfigProperties<Fields = object> = (
  | SourceSpec
  | BundleSpec
  | BundleName
  | BundleRef
) &
  VatConfigOptions &
  Fields;

/**
 * Where the property name is the name of the vat. Note that the `bootstrap`
 * property names the vat that should be used as the bootstrap vat. Although a
 * swingset configuration can designate any vat as its bootstrap vat,
 * `loadBasedir` will always look for a file named 'bootstrap.js' and use that
 * (note that if there is no 'bootstrap.js', there will be no bootstrap vat).
 */
export type SwingSetConfigDescriptor<Fields = object> = Record<
  string,
  SwingSetConfigProperties<Fields>
>;

export interface SwingSetOptions {
  bootstrap?: string;
  /**
   * indicates that `devDependencies` of the surrounding `package.json` should
   * be accessible to bundles.
   */
  includeDevDependencies?: boolean;
  /**
   * optional cache path used by wrappers that choose to cache `sourceSpec`
   * bundling
   */
  bundleCachePath?: string;
  vats: SwingSetConfigDescriptor<VatConfigOptions>;
  bundles?: SwingSetConfigDescriptor;
  /** the bundle source / import bundle format. */
  bundleFormat?: BundleFormat;
  devices?: any;
}

/** a swingset config object */
export type SwingSetConfig = KernelOptions & SwingSetOptions;

/** the config object passed to initializeKernel */
export type SwingSetKernelConfig = SwingSetConfig & {
  namedBundleIDs: Record<string, BundleID>;
  idToBundle: Record<BundleID, Bundle>;
};

export type SourceOfBundle = BundleName | BundleRef | { bundleID: BundleID };

/**
 * PolicyInput is used internally within kernel.js, returned by each message
 * processor, and used to decide which of the host's runPolicy methods to
 * invoke. The 'details' portion of PolicyInput is passed as an argument to
 * those methods, so those types are externally-visible.
 */
export type CleanupWork = {
  exports: number;
  imports: number;
  promises: number;
  kv: number;
  snapshots: number;
  transcripts: number;
};

export type PolicyInputCleanupCounts = { total: number } & CleanupWork;
export type PolicyInputCleanupDetails = {
  cleanups: PolicyInputCleanupCounts;
  computrons?: bigint;
};
export type PolicyInputDetails = { computrons?: bigint };

export type PolicyInputNone = [tag: 'none', details: PolicyInputDetails];
export type PolicyInputCreateVat = [
  tag: 'create-vat',
  details: PolicyInputDetails,
];
export type PolicyInputCrankComplete = [
  tag: 'crank',
  details: PolicyInputDetails,
];
export type PolicyInputCrankFailed = [
  tag: 'crank-failed',
  details: PolicyInputDetails,
];
export type PolicyInputCleanup = [
  tag: 'cleanup',
  details: PolicyInputCleanupDetails,
];

export type PolicyInput =
  | PolicyInputNone
  | PolicyInputCreateVat
  | PolicyInputCrankComplete
  | PolicyInputCrankFailed
  | PolicyInputCleanup;

/**
 * CleanupBudget is the internal record used to limit the slow deletion of
 * terminated vats. Each property limits the number of deletions per
 * 'cleanup-terminated-vat' run-queue event, for a specific phase (imports,
 * exports, snapshots, etc). It must always have a 'default' property, which is
 * used for phases that aren't otherwise specified.
 */
export type CleanupBudget = { default: number } & Partial<CleanupWork>;

/**
 * PolicyOutputCleanupBudget is the return value of runPolicy.allowCleanup(),
 * and tells the kernel how much it is allowed to clean up. It is either a
 * CleanupBudget, or 'true' to allow unlimited cleanup, or 'false' to forbid any
 * cleanup.
 */
export type PolicyOutputCleanupBudget = CleanupBudget | true | false;

/**
 * PolicyOutput is the boolean returned by all the other runPolicy methods,
 * where 'true' means "keep going", and 'false' means "stop now".
 */
export type PolicyOutput = boolean;

export type RunPolicy = {
  allowCleanup?: () => boolean | PolicyOutputCleanupBudget;
  vatCreated: (details: object) => PolicyOutput;
  crankComplete: (details: { computrons?: bigint }) => PolicyOutput;
  crankFailed: (details: object) => PolicyOutput;
  emptyCrank: () => PolicyOutput;
  didCleanup?: (details: PolicyInputCleanupDetails) => PolicyOutput;
};

export interface VatWarehousePolicy {
  /** Limit the number of simultaneous workers */
  maxVatsOnline?: number;
  /** Limit the number of vats preloaded at startup */
  maxPreloadVats?: number;
  /** Reload worker immediately upon snapshot creation */
  restartWorkerOnSnapshot?: boolean;
}

/**
 * Vat Creation and Management
 */
export type BundleID = string;
export type BundleCap = any;
export type EndoZipBase64Bundle = {
  moduleFormat: 'endoZipBase64';
  endoZipBase64: string;
  endoZipBase64Sha512: string;
};

/**
 * The options used to define vats pass can come from two primary APIs:
 *
 * - config record: config.vats[name].creationOptions
 * - E(vatAdminService).createVat(bundlecap, options)
 *
 * These two sources use StaticVatOptions and DynamicVatOptions respectively (the
 * dynamic options are more restrictive, but can include a Meter object). The
 * dynamic `createVat()` process creates a run-queue event named 'create-vat',
 * which carries a form named InternalDynamicVatOptions (which can include a
 * MeterID integer).
 *
 * For both types, when we finally create the vat, the options are converted into
 * RecordedVatOptions, which is plain data and gets stored in the DB
 * (vatKeeper.setSourceAndOptions).
 *
 * Later, when a worker is launched for this vat, vat-loader.js converts the
 * recorded options into ManagerOptions, which explains to the manager how to
 * configure and communicate with the worker.
 *
 * 'BaseVatOptions' holds the common subset of all these types. The other types
 * are then defined as amendments to this base type.
 */
export interface BaseVatOptions {
  /**
   * If true, permits the vat to construct itself using the `setup()` API, which
   * bypasses the imposition of LiveSlots but requires the vat implementation to
   * enforce the vat invariants manually. If false, the vat will be constructed
   * using the `buildRootObject()` API, which uses LiveSlots to enforce the vat
   * invariants automatically. Defaults to false.
   */
  enableSetup?: boolean;
  /**
   * If true, permits the kernel to pipeline messages to promises for which the
   * vat is the decider directly to the vat without waiting for the promises to
   * be resolved. If false, such messages will be queued inside the kernel.
   * Defaults to false.
   */
  enablePipelining?: boolean;
  /**
   * If true, saves a transcript of a vat's inbound deliveries and outbound
   * syscalls so that the vat's internal state can be reconstructed via replay.
   * If false, no such record is kept. Defaults to true.
   */
  useTranscript?: boolean;
  managerType?: ManagerType;
  /**
   * If true, disables automatic bringOutYourDead deliveries to a vat. Defaults
   * to false.
   */
  neverReap?: boolean;
  /**
   * Trigger a bringOutYourDead after the vat has received this many deliveries.
   * If the value is 'never', 'bringOutYourDead' will not be triggered by a
   * delivery count (but might be triggered for other reasons).
   */
  reapInterval?: number | 'never';
  /**
   * Trigger a bringOutYourDead when the vat has been given this many krefs in GC
   * deliveries (dropImports, retireImports, retireExports). If the value is
   * 'never', GC deliveries and their krefs are not treated specially.
   */
  reapGCKrefs?: number | 'never';
  critical?: boolean;
}

/**
 * If a meter is provided, the new dynamic vat is limited to a fixed amount of
 * computation and allocation that can occur during any given crank. Peak stack
 * frames are limited as well. In addition, the given meter's "remaining" value
 * will be reduced by the amount of computation used by each crank. The meter
 * will eventually underflow unless it is topped up, at which point the vat is
 * terminated. If undefined, the vat is unmetered. Static vats cannot be
 * metered.
 */
export type OptMeter = { meter?: unknown };

export type DynamicVatOptions = BaseVatOptions & {
  name: string;
  vatParameters?: object;
} & OptMeter;

// config.vats[name].creationOptions: StaticVatOptions

export type OptEnableDisavow = { enableDisavow?: boolean };
export type OptNodeOptions = { nodeOptions?: string[] };
export type StaticVatOptions = BaseVatOptions &
  OptEnableDisavow &
  OptNodeOptions;

export type VatUpgradeOptions = {
  vatParameters?: object;
  upgradeMessage?: string;
};
export type VatUpgradeResults = { incarnationNumber: number };

/**
 * Called to shut something down because something went wrong, where the reason
 * is supposed to be an Error that describes what went wrong. Some valid
 * implementations of `ShutdownWithFailure` will never return, either because
 * they throw or because they immediately shutdown the enclosing unit of
 * computation. However, they also might return, so the caller should follow
 * this call by their own defensive `throw reason;` if appropriate.
 *
 * @param reason
 */
export type ShutdownWithFailure = (reason: Error) => void;

/**
 * A powerful object corresponding with a vat that can be used to upgrade it with
 * new code or parameters, terminate it, or be notified when it terminates.
 */
export type VatAdminFacet = {
  /**
   * returns a promise that will be fulfilled or rejected when the vat is
   * terminated. If the vat terminates with a failure, the promise will be
   * rejected with the reason. If the vat terminates successfully, the promise
   * will fulfill to the completion value.
   */
  done: () => Promise<any>;
  /** Terminate the vat with a failure reason. */
  terminateWithFailure: ShutdownWithFailure;
  /**
   * Restart the vat with the specified bundle and options. This is a
   * "baggage-style" upgrade, in which the JS memory space is abandoned. The new
   * image is launched with access to 'baggage' and any durable storage
   * reachable from it, and must fulfill all the obligations of the previous
   * incarnation.
   */
  upgrade: (
    bundlecap: BundleCap,
    options?: VatUpgradeOptions,
  ) => Promise<VatUpgradeResults>;
};

export type CreateVatResults = {
  adminNode: Guarded<VatAdminFacet>;
  root: object;
};

export interface VatAdminSvc {
  waitForBundleCap: (id: BundleID) => ERef<BundleCap>;
  getBundleCap: (id: BundleID) => ERef<BundleCap>;
  getNamedBundleCap: (name: string) => ERef<BundleCap>;
  getBundleIDByName: (name: string) => ERef<BundleID>;
  createVat: (
    bundleCap: BundleCap,
    options?: DynamicVatOptions,
  ) => ERef<CreateVatResults>;
}
