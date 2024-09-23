/* eslint-disable no-use-before-define */
import { Nat, isNat } from '@endo/nat';
import { assert, Fail } from '@endo/errors';
import {
  initializeVatState,
  makeVatKeeper,
  DEFAULT_REAP_DIRT_THRESHOLD_KEY,
} from './vatKeeper.js';
import { initializeDeviceState, makeDeviceKeeper } from './deviceKeeper.js';
import { parseReachableAndVatSlot } from './reachable.js';
import { insistStorageAPI } from '../../lib/storageAPI.js';
import {
  insistKernelType,
  makeKernelSlot,
  parseKernelSlot,
} from '../parseKernelSlots.js';
import { insistCapData } from '../../lib/capdata.js';
import { insistMessage } from '../../lib/message.js';
import {
  insistDeviceID,
  insistVatID,
  makeDeviceID,
  makeVatID,
  makeUpgradeID,
} from '../../lib/id.js';
import { kdebug } from '../../lib/kdebug.js';
import { KERNEL_STATS_METRICS } from '../metrics.js';
import { makeKernelStats } from './stats.js';
import {
  enumeratePrefixedKeys,
  getPrefixedValues,
  deletePrefixedKeys,
} from './storageHelper.js';

const enableKernelGC = true;

/**
 * @typedef { import('../../types-external.js').BundleCap } BundleCap
 * @typedef { import('../../types-external.js').BundleID } BundleID
 * @typedef { import('../../types-external.js').EndoZipBase64Bundle } EndoZipBase64Bundle
 * @typedef { import('../../types-external.js').KernelSlog } KernelSlog
 * @typedef { import('../../types-external.js').ManagerType } ManagerType
 * @typedef { import('../../types-external.js').SnapStore } SnapStore
 * @typedef { import('../../types-external.js').TranscriptStore } TranscriptStore
 * @typedef { import('../../types-external.js').VatKeeper } VatKeeper
 * @typedef { import('../../types-internal.js').InternalKernelOptions } InternalKernelOptions
 * @typedef { import('../../types-internal.js').ReapDirtThreshold } ReapDirtThreshold
 * @import {CleanupBudget, CleanupWork, PolicyOutputCleanupBudget} from '../../types-external.js';
 * @import {RunQueueEventCleanupTerminatedVat} from '../../types-internal.js';
 */

export { DEFAULT_REAP_DIRT_THRESHOLD_KEY };

// most recent DB schema version
export const CURRENT_SCHEMA_VERSION = 2;

// Kernel state lives in a key-value store supporting key retrieval by
// lexicographic range. All keys and values are strings.
// We simulate a tree by concatenating path-name components with ".". When we
// want to delete a subtree, we tell the store to delete everything from
// "prefix." (inclusive) to "prefix/" (exclusive), which avoids anything using an
// extension of the prefix (e.g., consider [vat1.prefix1, vat1.prefix2, vat15.prefix1]).
//
// The 'local.' namespace is excluded from the kernel activity hash, and is
// allowed to vary between instances in a consensus machine. Everything else
// is required to be deterministic.
//
//
// The schema is indicated by the value of the "version" key, which
// was added for version 1 (i.e., version 0 had no such key), and is
// only modified by a call to upgradeSwingset(). See below for
// deltas/upgrades from one version to the next.
//
// The current ("v2") schema keys/values are:
//
// version = '2'
// vat.names = JSON([names..])
// vat.dynamicIDs = JSON([vatIDs..])
// vat.name.$NAME = $vatID = v$NN
// vat.nextID = $NN
// vat.nextUpgradeID = $NN
// vats.terminated = JSON([vatIDs..])
// device.names = JSON([names..])
// device.name.$NAME = $deviceID = d$NN
// device.nextID = $NN
// meter.nextID = $NN // used to make m$NN

// namedBundleID.$NAME = bundleID
// bundle.$BUNDLEID = JSON(bundle)
//
// kernel.defaultManagerType = managerType
// (old) kernel.defaultReapInterval = $NN
// kernel.defaultReapDirtThreshold = JSON({ thresholds })
//         thresholds (all optional)
//          deliveries: number or 'never' (default)
//          gcKrefs: number or 'never' (default)
//          computrons:  number or 'never' (default)
//          never: boolean (default false)
// kernel.relaxDurabilityRules = missing | 'true'
// kernel.snapshotInitial = $NN
// kernel.snapshotInterval = $NN

// v$NN.source = JSON({ bundle }) or JSON({ bundleName })
// v$NN.options = JSON , options include:
//       .reapDirtThreshold = JSON({ thresholds })
//         thresholds (all optional, default to kernel-wide defaultReapDirtThreshold)
//       (leave room for .snapshotDirtThreshold for #6786)
// v$NN.o.nextID = $NN
// v$NN.p.nextID = $NN
// v$NN.d.nextID = $NN
// v$NN.c.$kernelSlot = '$R $vatSlot'
//   $R is 'R' when reachable, '_' when merely recognizable
//   $vatSlot is one of: o+$NN/o-$NN/p+$NN/p-$NN/d+$NN/d-$NN
// v$NN.c.$vatSlot = $kernelSlot = ko$NN/kp$NN/kd$NN
// v$NN.vs.$key = string
// old (v0): v$NN.reapInterval = $NN or 'never'
// old (v0): v$NN.reapCountdown = $NN or 'never'
// v$NN.reapDirt = JSON({ deliveries, gcKrefs, computrons }) // missing keys treated as zero
// (leave room for v$NN.snapshotDirt and options.snapshotDirtThreshold for #6786)
// exclude from consensus
// local.*

// m$NN.remaining = $NN // remaining capacity (in computrons) or 'unlimited'
// m$NN.threshold = $NN // notify when .remaining first drops below this

// kernelStats // JSON(various consensus kernel stats of other kernel state)
// local.kernelStats // JSON(various non-consensus kernel stats of other kernel state)

// d$NN.o.nextID = $NN
// d$NN.c.$kernelSlot = $deviceSlot = o-$NN/d+$NN/d-$NN
// d$NN.c.$deviceSlot = $kernelSlot = ko$NN/kd$NN
// d$NN.deviceState = JSON
// d$NN.source = JSON({ bundle }) or JSON({ bundleName })
// d$NN.options = JSON

// crankNumber = $NN
// runQueue = JSON([$head, $tail])
// runQueue.$NN = JSON(item)
// acceptanceQueue = JSON([$head, $tail])
// acceptanceQueue.$NN = JSON(item)
// gcActions = JSON(gcActions)
// reapQueue = JSON([vatIDs...])
// pinnedObjects = ko$NN[,ko$NN..]

// ko.nextID = $NN
// ko$NN.owner = $vatID
// ko$NN.refCount = $NN,$MM  // reachable count, recognizable count
// kd.nextID = $NN
// kd$NN.owner = $vatID
// kp.nextID = $NN
// kp$NN.state = unresolved | fulfilled | rejected
// kp$NN.refCount = $NN
// // if unresolved:
// kp$NN.decider = missing | '' | $vatID
// kp$NN.policy = missing (=ignore) | ignore | logAlways | logFailure | panic
// kp$NN.subscribers = '' | $vatID[,$vatID..]
// kp$NN.queue.$NN = JSON(msg)
// kp$NN.queue.nextID = $NN
// // if fulfilled or rejected:
// kp$NN.data.body = missing | JSON
// kp$NN.data.slots = '' | $vatID[,$vatID..]
//
// Prefix reserved for host written data:
// host.

// Kernel state schema changes:
//
// v0: the original
//   * no `version`
//   * uses `initialized = 'true'`
// v1:
//   * add `version = '1'`
//   * remove `initialized`
//   * replace `kernel.defaultReapInterval` with `kernel.defaultReapDirtThreshold`
//   * replace vat's `vNN.reapInterval`/`vNN.reapCountdown` with `vNN.reapDirt`
//             and a `vNN.reapDirtThreshold` in `vNN.options`
// v2:
//   * change `version` to `'2'`
//   * add `vats.terminated` with `[]` as initial value

/** @type {(s: string) => string[]} s */
export function commaSplit(s) {
  if (s === '') {
    return [];
  }
  return s.split(',');
}

export function stripPrefix(prefix, str) {
  assert(str.startsWith(prefix), str);
  return str.slice(prefix.length);
}

function insistMeterID(m) {
  assert.typeof(m, 'string');
  assert.equal(m[0], 'm');
  Nat(BigInt(m.slice(1)));
}

export const getAllStaticVats = kvStore => {
  const result = [];
  const prefix = 'vat.name.';
  for (const k of enumeratePrefixedKeys(kvStore, prefix)) {
    const vatID = kvStore.get(k) || Fail`getNextKey ensures get`;
    const name = k.slice(prefix.length);
    result.push([name, vatID]);
  }
  return result;
};

export const getAllDynamicVats = getRequired => {
  return JSON.parse(getRequired('vat.dynamicIDs'));
};

// we use different starting index values for the various vNN/koNN/kdNN/kpNN
// slots, to reduce confusing overlap when looking at debug messages (e.g.
// seeing both kp1 and ko1, which are completely unrelated despite having the
// same integer), and as a weak safety mechanism to guard against slots being
// misinterpreted (if "kp1" is somehow transmuted to "ko1", then there is
// probably already a real ko1 in the table, but "kp40" being corrupted into
// "ko40" is marginally less likely to collide with koNN that start at a
// different index). The safety mechanism is only likely to help during very
// limited unit tests, where we only allocate a handful of items, but it's
// proven useful even there.
const FIRST_VAT_ID = 1n;
const FIRST_DEVICE_ID = 7n;
const FIRST_OBJECT_ID = 20n;
const FIRST_DEVNODE_ID = 30n;
const FIRST_PROMISE_ID = 40n;
const FIRST_CRANK_NUMBER = 0n;
const FIRST_METER_ID = 1n;

// this default "reap interval" is low for the benefit of tests:
// applications should set it to something higher (perhaps 200) based
// on their expected usage

export const DEFAULT_DELIVERIES_PER_BOYD = 1;

// "20" will trigger a BOYD after 10 krefs are dropped and retired
// (drops and retires are delivered in separate messages, so
// 10+10=20). The worst case work-expansion we've seen is in #8401,
// where one drop breaks one cycle, and each cycle's cleanup causes 50
// syscalls in the next v9-zoe BOYD. So this should limit each BOYD
// to cleaning 10 cycles, in 500 syscalls.

export const DEFAULT_GC_KREFS_PER_BOYD = 20;

/**
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {number | 'uninitialized'} expectedVersion
 * @param {KernelSlog} [kernelSlog]
 */
export default function makeKernelKeeper(
  kernelStorage,
  expectedVersion,
  kernelSlog,
) {
  const { kvStore, transcriptStore, snapStore, bundleStore } = kernelStorage;

  insistStorageAPI(kvStore);

  // the terminated-vats cache is normally populated from
  // 'vats.terminated', but for initialization purposes we need give
  // it a value here, and then populate it for real if we're dealing
  // with an up-to-date DB
  let terminatedVats = [];

  const versionString = kvStore.get('version');
  const version = Number(versionString || '0');
  if (expectedVersion === 'uninitialized') {
    if (kvStore.has('initialized')) {
      throw Error(`kernel DB already initialized (v0)`);
    }
    if (versionString) {
      throw Error(`kernel DB already initialized (v${versionString})`);
    }
  } else if (expectedVersion !== version) {
    throw Error(
      `kernel DB is too old: has version v${version}, but expected v${expectedVersion}`,
    );
  } else {
    // DB is up-to-date, so populate any caches we use
    terminatedVats = JSON.parse(getRequired('vats.terminated'));
  }

  /**
   * @param {string} key
   * @returns {string}
   */
  function getRequired(key) {
    kvStore.has(key) || Fail`storage lacks required key ${key}`;
    // @ts-expect-error already checked .has()
    return kvStore.get(key);
  }

  const {
    incStat,
    decStat,
    getStats,
    getSerializedStats,
    initializeStats,
    loadFromSerializedStats,
  } = makeKernelStats(KERNEL_STATS_METRICS);

  function saveStats() {
    const { consensusStats, localStats } = getSerializedStats();

    kvStore.set('kernelStats', consensusStats);
    kvStore.set('local.kernelStats', localStats);
  }

  function loadStats() {
    loadFromSerializedStats({
      consensusStats: getRequired('kernelStats'),
      localStats: kvStore.get('local.kernelStats'),
    });
  }

  function startCrank() {
    kernelStorage.startCrank();
  }

  function establishCrankSavepoint(savepoint) {
    kernelStorage.establishCrankSavepoint(savepoint);
  }

  function rollbackCrank(savepoint) {
    kernelStorage.rollbackCrank(savepoint);
    loadStats();
  }

  function emitCrankHashes() {
    saveStats();
    return kernelStorage.emitCrankHashes();
  }

  function endCrank() {
    kernelStorage.endCrank();
  }

  const ephemeral = harden({
    /** @type { Map<string, VatKeeper> } */
    vatKeepers: new Map(),
    deviceKeepers: new Map(), // deviceID -> deviceKeeper
  });

  function setInitialized() {
    assert(!kvStore.has('initialized'));
    assert(!kvStore.has('version'));
    kvStore.set('version', `${CURRENT_SCHEMA_VERSION}`);
  }

  function getCrankNumber() {
    return Nat(BigInt(getRequired('crankNumber')));
  }

  function incrementCrankNumber() {
    const crankNumber = Nat(BigInt(getRequired('crankNumber')));
    kvStore.set('crankNumber', `${crankNumber + 1n}`);
  }

  function initQueue(queue) {
    kvStore.set(`${queue}`, JSON.stringify([1, 1]));
  }

  function enqueue(queue, item) {
    const [head, tail] = JSON.parse(getRequired(`${queue}`));
    kvStore.set(`${queue}.${tail}`, JSON.stringify(item));
    kvStore.set(`${queue}`, JSON.stringify([head, tail + 1]));
    incStat(`${queue}Length`);
  }

  function dequeue(queue) {
    const [head, tail] = JSON.parse(getRequired(`${queue}`));
    if (head < tail) {
      const itemKey = `${queue}.${head}`;
      const item = JSON.parse(getRequired(itemKey));
      kvStore.delete(itemKey);
      kvStore.set(`${queue}`, JSON.stringify([head + 1, tail]));
      decStat(`${queue}Length`);
      return item;
    } else {
      return undefined;
    }
  }

  function queueLength(queue) {
    const [head, tail] = JSON.parse(getRequired(`${queue}`));
    return tail - head;
  }

  function dumpQueue(queue) {
    const [head, tail] = JSON.parse(getRequired(`${queue}`));
    const result = [];
    for (let i = head; i < tail; i += 1) {
      result.push(JSON.parse(getRequired(`${queue}.${i}`)));
    }
    return result;
  }

  /**
   * @param {InternalKernelOptions} kernelOptions
   */
  function createStartingKernelState(kernelOptions) {
    // this should probably be a standalone function, not a method
    const {
      defaultManagerType = 'local',
      defaultReapDirtThreshold = {
        deliveries: DEFAULT_DELIVERIES_PER_BOYD,
        gcKrefs: DEFAULT_GC_KREFS_PER_BOYD,
        computrons: 'never',
      },
      relaxDurabilityRules = false,
      snapshotInitial = 3,
      snapshotInterval = 200,
    } = kernelOptions;

    kvStore.set('vat.names', '[]');
    kvStore.set('vat.dynamicIDs', '[]');
    kvStore.set('vat.nextID', `${FIRST_VAT_ID}`);
    kvStore.set('vat.nextUpgradeID', `1`);
    kvStore.set('vats.terminated', '[]');
    kvStore.set('device.names', '[]');
    kvStore.set('device.nextID', `${FIRST_DEVICE_ID}`);
    kvStore.set('ko.nextID', `${FIRST_OBJECT_ID}`);
    kvStore.set('kd.nextID', `${FIRST_DEVNODE_ID}`);
    kvStore.set('kp.nextID', `${FIRST_PROMISE_ID}`);
    kvStore.set('meter.nextID', `${FIRST_METER_ID}`);
    kvStore.set('gcActions', '[]');
    kvStore.set('reapQueue', '[]');
    initQueue('runQueue');
    initQueue('acceptanceQueue');
    kvStore.set('crankNumber', `${FIRST_CRANK_NUMBER}`);
    kvStore.set('kernel.defaultManagerType', defaultManagerType);
    kvStore.set(
      DEFAULT_REAP_DIRT_THRESHOLD_KEY,
      JSON.stringify(defaultReapDirtThreshold),
    );
    kvStore.set('kernel.snapshotInitial', `${snapshotInitial}`);
    kvStore.set('kernel.snapshotInterval', `${snapshotInterval}`);
    if (relaxDurabilityRules) {
      kvStore.set('kernel.relaxDurabilityRules', 'true');
    }
    // Will be saved in the bootstrap commit
    initializeStats();
  }

  /**
   *
   * @param {string} mt
   * @returns {asserts mt is ManagerType}
   */

  function insistManagerType(mt) {
    assert(['local', 'node-subprocess', 'xsnap', 'xs-worker'].includes(mt));
  }

  function getDefaultManagerType() {
    const mt = getRequired('kernel.defaultManagerType');
    insistManagerType(mt);
    return mt;
  }

  /**
   * @returns {boolean}
   */
  function getRelaxDurabilityRules() {
    return !!kvStore.get('kernel.relaxDurabilityRules');
  }

  /**
   *
   * @returns {ReapDirtThreshold}
   */
  function getDefaultReapDirtThreshold() {
    return JSON.parse(getRequired(DEFAULT_REAP_DIRT_THRESHOLD_KEY));
  }

  /**
   * @param {ReapDirtThreshold} threshold
   */
  function setDefaultReapDirtThreshold(threshold) {
    assert.typeof(threshold, 'object');
    assert(threshold);
    for (const [key, value] of Object.entries(threshold)) {
      assert(
        (typeof value === 'number' && value > 0) || value === 'never',
        `threshold[${key}] ${value} must be a positive number or "never"`,
      );
    }
    kvStore.set(DEFAULT_REAP_DIRT_THRESHOLD_KEY, JSON.stringify(threshold));
  }

  function getNat(key) {
    const result = Number.parseInt(getRequired(key), 10);
    assert(isNat(result));
    return result;
  }

  function getSnapshotInitial() {
    return getNat('kernel.snapshotInitial');
  }

  function getSnapshotInterval() {
    return getNat('kernel.snapshotInterval');
  }

  function setSnapshotInterval(interval) {
    assert(isNat(interval), 'invalid snapshotInterval value');
    kvStore.set('kernel.snapshotInterval', `${interval}`);
  }

  const bundleIDRE = new RegExp('^b1-[0-9a-f]{128}$');

  /**
   * @param {string} name
   * @param {BundleID} bundleID
   * @returns {void}
   */
  function addNamedBundleID(name, bundleID) {
    assert.typeof(bundleID, 'string');
    bundleIDRE.test(bundleID) || Fail`${bundleID} is not a bundleID`;
    kvStore.set(`namedBundleID.${name}`, bundleID);
  }

  /**
   * @param {string} name
   * @returns {BundleID}
   */
  function getNamedBundleID(name) {
    return harden(getRequired(`namedBundleID.${name}`));
  }

  /**
   * Store a bundle (by ID) in the kernel DB.
   *
   * @param {BundleID} bundleID The claimed bundleID: the caller
   *        (controller.js) must validate it first, we assume it is correct.
   * @param {EndoZipBase64Bundle} bundle The code bundle, whose format must
   *        be 'endoZipBase64'.
   */
  function addBundle(bundleID, bundle) {
    assert(!bundleStore.hasBundle(bundleID), 'bundleID already installed');
    bundleStore.addBundle(bundleID, bundle);
  }

  /**
   * @param {BundleID} bundleID
   * @returns {boolean}
   */
  function hasBundle(bundleID) {
    return bundleStore.hasBundle(bundleID);
  }

  /**
   * @param {BundleID} bundleID
   * @returns {EndoZipBase64Bundle | undefined}
   */
  function getBundle(bundleID) {
    if (bundleStore.hasBundle(bundleID)) {
      const bundle = bundleStore.getBundle(bundleID);
      if (bundle.moduleFormat !== 'endoZipBase64') {
        throw Fail`unsupported module format ${bundle.moduleFormat}`;
      }
      return bundle;
    } else {
      return undefined;
    }
  }

  function getGCActions() {
    return new Set(JSON.parse(getRequired(`gcActions`)));
  }

  function setGCActions(actions) {
    const a = Array.from(actions);
    a.sort();
    kvStore.set('gcActions', JSON.stringify(a));
  }

  function addGCActions(newActions) {
    const actions = getGCActions();
    for (const action of newActions) {
      assert.typeof(action, 'string', 'addGCActions given bad action');
      const [vatID, type, koid] = action.split(' ');
      insistVatID(vatID);
      ['dropExport', 'retireExport', 'retireImport'].includes(type) ||
        Fail`bad GCAction ${action} (type='${type}')`;
      insistKernelType('object', koid);
      actions.add(action);
    }
    setGCActions(actions);
  }

  function scheduleReap(vatID) {
    const reapQueue = JSON.parse(getRequired('reapQueue'));
    if (!reapQueue.includes(vatID)) {
      reapQueue.push(vatID);
      kvStore.set('reapQueue', JSON.stringify(reapQueue));
    }
  }

  function nextReapAction() {
    const reapQueue = JSON.parse(getRequired('reapQueue'));
    if (reapQueue.length > 0) {
      const vatID = reapQueue.shift();
      kvStore.set('reapQueue', JSON.stringify(reapQueue));
      return harden({ type: 'bringOutYourDead', vatID });
    } else {
      return undefined;
    }
  }

  /**
   * @param {string} vatID
   * @param {string} kernelSlot
   */
  function getReachableAndVatSlot(vatID, kernelSlot) {
    const kernelKey = `${vatID}.c.${kernelSlot}`;
    return parseReachableAndVatSlot(kvStore.get(kernelKey));
  }

  function getObjectRefCount(kernelSlot) {
    const data = kvStore.get(`${kernelSlot}.refCount`);
    if (!data) {
      return { reachable: 0, recognizable: 0 };
    }
    const [reachable, recognizable] = commaSplit(data).map(Number);
    reachable <= recognizable ||
      Fail`refmismatch(get) ${kernelSlot} ${reachable},${recognizable}`;
    return { reachable, recognizable };
  }

  function setObjectRefCount(kernelSlot, { reachable, recognizable }) {
    assert.typeof(reachable, 'number');
    assert.typeof(recognizable, 'number');
    (reachable >= 0 && recognizable >= 0) ||
      Fail`${kernelSlot} underflow ${reachable},${recognizable}`;
    reachable <= recognizable ||
      Fail`refmismatch(set) ${kernelSlot} ${reachable},${recognizable}`;
    kvStore.set(`${kernelSlot}.refCount`, `${reachable},${recognizable}`);
  }

  /**
   * Iterate over non-durable objects exported by a vat.
   *
   * @param {string} vatID
   * @yields {{kref: string, vref: string}}
   */
  function* enumerateNonDurableObjectExports(vatID) {
    insistVatID(vatID);
    // vrefs for exported objects start with o+NN (ephemeral),
    // o+vNN/MM (merely-virtual), or o+dNN/MM (durable).
    // We iterate through all ephemeral and virtual entries so the kernel
    // can ensure that they are abandoned by a vat being upgraded.
    const prefix = `${vatID}.c.`;
    const ephStart = `${prefix}o+`;
    const durStart = `${prefix}o+d`;
    const virStart = `${prefix}o+v`;
    /** @type {[string, string?][]} */
    const ranges = [[ephStart, durStart], [virStart]];
    for (const range of ranges) {
      for (const k of enumeratePrefixedKeys(kvStore, ...range)) {
        const vref = k.slice(prefix.length);
        // exclude the root object, which is replaced by upgrade
        if (vref !== 'o+0') {
          const kref = kvStore.get(k);
          assert.typeof(kref, 'string');
          yield { kref, vref };
        }
      }
    }
  }
  harden(enumerateNonDurableObjectExports);

  /**
   * Allocate a new koid.
   *
   * @param {string} ownerID
   * @param {bigint} [id]
   * @returns {string}
   */
  function addKernelObject(ownerID, id) {
    // providing id= is only for unit tests
    insistVatID(ownerID);
    if (id === undefined) {
      id = Nat(BigInt(getRequired('ko.nextID')));
      kvStore.set('ko.nextID', `${id + 1n}`);
    }
    kdebug(`Adding kernel object ko${id} for ${ownerID}`);
    const s = makeKernelSlot('object', id);
    kvStore.set(`${s}.owner`, ownerID);
    setObjectRefCount(s, { reachable: 0, recognizable: 0 });
    incStat('kernelObjects');
    return s;
  }

  function kernelObjectExists(kref) {
    return kvStore.has(`${kref}.refCount`);
  }

  function ownerOfKernelObject(kernelSlot) {
    insistKernelType('object', kernelSlot);
    const owner = kvStore.get(`${kernelSlot}.owner`);
    if (!owner) {
      return undefined;
    }
    insistVatID(owner);
    if (terminatedVats.includes(owner)) {
      return undefined;
    }
    return owner;
  }

  function retireKernelObjects(koids) {
    Array.isArray(koids) || Fail`retireExports given non-Array ${koids}`;
    const newActions = [];
    for (const koid of koids) {
      const importers = getImporters(koid);
      for (const vatID of importers) {
        newActions.push(`${vatID} retireImport ${koid}`);
      }
      deleteKernelObject(koid);
    }
    addGCActions(newActions);
  }

  function orphanKernelObject(kref, oldVat) {
    // termination orphans all exports, upgrade orphans non-durable
    // exports, and syscall.abandonExports orphans specific ones
    const ownerKey = `${kref}.owner`;
    const ownerVat = kvStore.get(ownerKey);
    ownerVat === oldVat || Fail`export ${kref} not owned by old vat`;
    kvStore.delete(ownerKey);
    const { vatSlot: vref } = getReachableAndVatSlot(oldVat, kref);
    kvStore.delete(`${oldVat}.c.${kref}`);
    kvStore.delete(`${oldVat}.c.${vref}`);
    addMaybeFreeKref(kref);
    // note that we do not delete the object here: it will be
    // retired if/when all other references are dropped
  }

  function deleteKernelObject(koid) {
    kvStore.delete(`${koid}.owner`);
    kvStore.delete(`${koid}.refCount`);
    decStat('kernelObjects');
    // TODO: decref auxdata slots and delete auxdata, when #2069 is added
  }

  function addKernelDeviceNode(deviceID) {
    insistDeviceID(deviceID);
    const id = Nat(BigInt(getRequired('kd.nextID')));
    kdebug(`Adding kernel device kd${id} for ${deviceID}`);
    kvStore.set('kd.nextID', `${id + 1n}`);
    const s = makeKernelSlot('device', id);
    kvStore.set(`${s}.owner`, deviceID);
    incStat('kernelDevices');
    return s;
  }

  function ownerOfKernelDevice(kernelSlot) {
    insistKernelType('device', kernelSlot);
    const owner = kvStore.get(`${kernelSlot}.owner`);
    insistDeviceID(owner);
    return owner;
  }

  function addKernelPromise(policy) {
    const kpidNum = Nat(BigInt(getRequired('kp.nextID')));
    kvStore.set('kp.nextID', `${kpidNum + 1n}`);
    const kpid = makeKernelSlot('promise', kpidNum);
    kvStore.set(`${kpid}.state`, 'unresolved');
    kvStore.set(`${kpid}.subscribers`, '');
    kvStore.set(`${kpid}.queue.nextID`, `0`);
    kvStore.set(`${kpid}.refCount`, `0`);
    kvStore.set(`${kpid}.decider`, '');
    if (policy && policy !== 'ignore') {
      kvStore.set(`${kpid}.policy`, policy);
    }
    // queue is empty, so no state[kp$NN.queue.$NN] keys yet
    incStat('kernelPromises');
    incStat('kpUnresolved');
    return kpid;
  }

  function addKernelPromiseForVat(deciderVatID) {
    insistVatID(deciderVatID);
    const kpid = addKernelPromise();
    kdebug(`Adding kernel promise ${kpid} for ${deciderVatID}`);
    kvStore.set(`${kpid}.decider`, deciderVatID);
    return kpid;
  }

  function getKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    const p = { state: getRequired(`${kernelSlot}.state`) };
    switch (p.state) {
      case undefined: {
        throw Fail`unknown kernelPromise '${kernelSlot}'`;
      }
      case 'unresolved': {
        p.refCount = Number(kvStore.get(`${kernelSlot}.refCount`));
        p.decider = kvStore.get(`${kernelSlot}.decider`);
        if (p.decider === '') {
          p.decider = undefined;
        }
        p.policy = kvStore.get(`${kernelSlot}.policy`) || 'ignore';
        // @ts-expect-error get() may fail
        p.subscribers = commaSplit(kvStore.get(`${kernelSlot}.subscribers`));
        p.queue = Array.from(
          getPrefixedValues(kvStore, `${kernelSlot}.queue.`),
        ).map(s => JSON.parse(s));
        break;
      }
      case 'fulfilled':
      case 'rejected': {
        p.refCount = Number(kvStore.get(`${kernelSlot}.refCount`));
        p.data = {
          body: kvStore.get(`${kernelSlot}.data.body`),
          // @ts-expect-error get() may fail
          slots: commaSplit(kvStore.get(`${kernelSlot}.data.slots`)),
        };
        for (const s of p.data.slots) {
          parseKernelSlot(s);
        }
        break;
      }
      default: {
        throw Fail`unknown state for ${kernelSlot}: ${p.state}`;
      }
    }
    return harden(p);
  }

  function getResolveablePromise(kpid, expectedDecider) {
    insistKernelType('promise', kpid);
    if (expectedDecider) {
      insistVatID(expectedDecider);
    }
    const p = getKernelPromise(kpid);
    p.state === 'unresolved' || Fail`${kpid} was already resolved`;
    if (expectedDecider) {
      p.decider === expectedDecider ||
        Fail`${kpid} is decided by ${p.decider}, not ${expectedDecider}`;
    } else {
      !p.decider || Fail`${kpid} is decided by ${p.decider}, not the kernel`;
    }
    return p;
  }

  function hasKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    return kvStore.has(`${kernelSlot}.state`);
  }

  function deleteKernelPromiseState(kpid) {
    kvStore.delete(`${kpid}.state`);
    kvStore.delete(`${kpid}.decider`);
    kvStore.delete(`${kpid}.subscribers`);
    kvStore.delete(`${kpid}.policy`);
    deletePrefixedKeys(kvStore, `${kpid}.queue.`);
    kvStore.delete(`${kpid}.queue.nextID`);
    kvStore.delete(`${kpid}.data.body`);
    kvStore.delete(`${kpid}.data.slots`);
  }

  function deleteKernelPromise(kpid) {
    const state = getRequired(`${kpid}.state`);
    switch (state) {
      case 'unresolved':
        decStat('kpUnresolved');
        break;
      case 'fulfilled':
        decStat('kpFulfilled');
        break;
      case 'rejected':
        decStat('kpRejected');
        break;
      default:
        Fail`unknown state for ${kpid}: ${state}`;
    }
    decStat('kernelPromises');
    deleteKernelPromiseState(kpid);
    kvStore.delete(`${kpid}.refCount`);
  }

  function requeueKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);

    // Re-queue all messages, so they can be delivered to the resolution if the
    // promise was resolved, or to the pipelining vat if the decider was
    // updated.
    // This is a lateral move, so we retain their original refcounts. TODO:
    // this is slightly lazy, sending the message back to the same promise
    // that just got resolved. When this message makes it to the front of the
    // run-queue, we'll look up the resolution. Instead, we could maybe look
    // up the resolution *now* and set the correct target early. Doing that
    // might make it easier to remove the Promise Table entry earlier.
    const p = getKernelPromise(kernelSlot);
    for (const msg of p.queue) {
      const entry = harden({ type: 'send', target: kernelSlot, msg });
      enqueue('acceptanceQueue', entry);
    }
    decStat('promiseQueuesLength', p.queue.length);

    deletePrefixedKeys(kvStore, `${kernelSlot}.queue.`);
    kvStore.set(`${kernelSlot}.queue.nextID`, `0`);
  }

  function resolveKernelPromise(kernelSlot, rejected, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);

    let idx = 0;
    for (const dataSlot of capdata.slots) {
      incrementRefCount(dataSlot, `resolve|${kernelSlot}|s${idx}`);
      idx += 1;
    }

    requeueKernelPromise(kernelSlot);

    deleteKernelPromiseState(kernelSlot);
    decStat('kpUnresolved');

    if (rejected) {
      incStat('kpRejected');
      kvStore.set(`${kernelSlot}.state`, 'rejected');
    } else {
      incStat('kpFulfilled');
      kvStore.set(`${kernelSlot}.state`, 'fulfilled');
    }
    kvStore.set(`${kernelSlot}.data.body`, capdata.body);
    kvStore.set(`${kernelSlot}.data.slots`, capdata.slots.join(','));
  }

  async function removeVatFromSwingStoreExports(vatID) {
    // Delete primary swingstore records for this vat, in preparation
    // for (slow) deletion. After this, swingstore exports will omit
    // this vat. This is called from the kernel's terminateVat, which
    // initiates (but does not complete) deletion.
    snapStore.stopUsingLastSnapshot(vatID);
    await transcriptStore.stopUsingTranscript(vatID);
  }

  /**
   * Perform some cleanup work for a specific (terminated but not
   * fully-deleted) vat, possibly limited by a budget. Returns 'done'
   * (where false means "please call me again", and true means "you
   * can delete the vatID now"), and a count of how much work was done
   * (so the runPolicy can decide when to stop).
   *
   * @param {string} vatID
   * @param {CleanupBudget} budget
   * @returns {{ done: boolean, work: CleanupWork }}
   *
   */
  function cleanupAfterTerminatedVat(vatID, budget) {
    // this is called from terminateVat, which is called from either:
    // * end of processDeliveryMessage, if crankResults.terminate
    // * device-vat-admin (when vat-v-a does adminNode.terminateVat)
    //   (which always happens inside processDeliveryMessage)
    // so we're always followed by a call to processRefcounts, at
    // end-of-delivery in processDeliveryMessage, after checking
    // crankResults.terminate

    insistVatID(vatID);
    const work = {
      exports: 0,
      imports: 0,
      kv: 0,
      snapshots: 0,
      transcripts: 0,
    };
    let remaining = 0;

    // TODO: it would be slightly cheaper to walk all kvStore keys in
    // order, and act on each one according to its category (c-list
    // export, c-list import, vatstore, other), so we use a single
    // enumeratePrefixedKeys() call each time. Until we do that, the
    // last phase of the cleanup (where we've deleted all the exports
    // and imports, and are working on the remaining keys) will waste
    // two DB queries on each call. OTOH, those queries will probably
    // hit the same SQLite index page as the successful one, so it
    // probably won't cause any extra disk IO. So we can defer this
    // optimization for a while. Note: when we implement it, be
    // prepared to encounter the clist entries in eiher order (kref
    // first or vref first), and delete the other one in the same
    // call, so we don't wind up with half an entry.

    const vatKeeper = provideVatKeeper(vatID);
    const clistPrefix = `${vatID}.c.`;
    const exportPrefix = `${clistPrefix}o+`;
    const importPrefix = `${clistPrefix}o-`;

    // Note: ASCII order is "+,-./", and we rely upon this to split the
    // keyspace into the various o+NN/o-NN/etc spaces. If we were using a
    // more sophisticated database, we'd keep each section in a separate
    // table.

    // The current store semantics ensure this iteration is lexicographic.
    // Any changes to the creation of the list of promises to be rejected (and
    // thus to the order in which they *get* rejected) need to preserve this
    // ordering in order to preserve determinism.  TODO: we would like to
    // shift to a different deterministic ordering scheme that is less fragile
    // in the face of potential changes in the nature of the database being
    // used.

    // first, scan for exported objects, which must be orphaned
    remaining = budget.exports ?? budget.default;
    for (const k of enumeratePrefixedKeys(kvStore, exportPrefix)) {
      // The void for an object exported by a vat will always be of the form
      // `o+NN`.  The '+' means that the vat exported the object (rather than
      // importing it) and therefore the object is owned by (i.e., within) the
      // vat.  The corresponding void->koid c-list entry will thus always
      // begin with `vMM.c.o+`.  In addition to deleting the c-list entry, we
      // must also delete the corresponding kernel owner entry for the object,
      // since the object will no longer be accessible.
      const vref = stripPrefix(clistPrefix, k);
      assert(vref.startsWith('o+'), vref);
      const kref = kvStore.get(k);
      // note: adds to maybeFreeKrefs, deletes c-list and .owner
      orphanKernelObject(kref, vatID);
      work.exports += 1;
      remaining -= 1;
      if (remaining <= 0) {
        return { done: false, work };
      }
    }

    // then scan for imported objects, which must be decrefed
    remaining = budget.imports ?? budget.default;
    for (const k of enumeratePrefixedKeys(kvStore, importPrefix)) {
      // abandoned imports: delete the clist entry as if the vat did a
      // drop+retire
      const kref = kvStore.get(k) || Fail`getNextKey ensures get`;
      const vref = stripPrefix(clistPrefix, k);
      vatKeeper.deleteCListEntry(kref, vref);
      // that will also delete both db keys
      work.imports += 1;
      remaining -= 1;
      if (remaining <= 0) {
        return { done: false, work };
      }
    }

    // the caller used enumeratePromisesByDecider() before calling us,
    // so they already know the orphaned promises to reject

    // now loop back through everything and delete it all
    remaining = budget.kv ?? budget.default;
    for (const k of enumeratePrefixedKeys(kvStore, `${vatID}.`)) {
      kvStore.delete(k);
      work.kv += 1;
      remaining -= 1;
      if (remaining <= 0) {
        return { done: false, work };
      }
    }

    // this will internally loop through 'budget' deletions
    remaining = budget.snapshots ?? budget.default;
    const dsc = vatKeeper.deleteSnapshots(remaining);
    work.snapshots += dsc.cleanups;
    remaining -= dsc.cleanups;
    if (remaining <= 0) {
      return { done: false, work };
    }

    // same
    remaining = budget.transcripts ?? budget.default;
    const dts = vatKeeper.deleteTranscripts(remaining);
    work.transcripts += dts.cleanups;
    remaining -= dts.cleanups;
    // last task, so increment cleanups, but dc.done is authoritative
    return { done: dts.done, work };
  }

  function deleteVatID(vatID) {
    // TODO: deleting entries from the dynamic vat IDs list requires a linear
    // scan of the list; arguably this collection ought to be represented in a
    // different way that makes it efficient to remove an entry from it, though
    // for the time being the linear list should be OK enough as long as we keep
    // the list short.
    const DYNAMIC_IDS_KEY = 'vat.dynamicIDs';
    const oldDynamicVatIDs = JSON.parse(getRequired(DYNAMIC_IDS_KEY));
    const newDynamicVatIDs = oldDynamicVatIDs.filter(v => v !== vatID);
    if (newDynamicVatIDs.length !== oldDynamicVatIDs.length) {
      kvStore.set(DYNAMIC_IDS_KEY, JSON.stringify(newDynamicVatIDs));
    } else {
      kdebug(`removing static vat ${vatID}`);
      for (const k of enumeratePrefixedKeys(kvStore, 'vat.name.')) {
        if (kvStore.get(k) === vatID) {
          kvStore.delete(k);
          const VAT_NAMES_KEY = 'vat.names';
          const name = k.slice('vat.name.'.length);
          const oldStaticVatNames = JSON.parse(getRequired(VAT_NAMES_KEY));
          const newStaticVatNames = oldStaticVatNames.filter(v => v !== name);
          kvStore.set(VAT_NAMES_KEY, JSON.stringify(newStaticVatNames));
          break;
        }
      }
      decStat('vats');
    }
  }

  function addMessageToPromiseQueue(kernelSlot, msg) {
    insistKernelType('promise', kernelSlot);
    insistMessage(msg);

    // Each message on a promise's queue maintains a refcount to the promise
    // itself. This isn't strictly necessary (the promise will be kept alive
    // by the deciding vat's clist, or the queued message that holds this
    // promise as its result), but it matches our policy with run-queue
    // messages (each holds a refcount on its target).
    //
    // Messages are enqueued on a promise queue in 2 cases:
    // - A message routed from the acceptance queue
    // - A pipelined message had a decider change while in the run-queue
    // Messages are dequeued from a promise queue in 2 cases:
    // - The promise is resolved
    // - The promise's decider is changed to a pipelining vat
    // In all cases the messages are just moved from one queue to another so
    // the caller should not need to change the refcounts when moving messages
    // sent to promises between queues. Only when re-targeting after resolution
    // would the targets refcount be updated (but not the result or slots).
    //
    // Since messages are moved from queue to queue, the tag describing the ref
    // does not designate which current queue the message sits on, but that
    // there is some kernel queue holding the message and its content.

    const p = getKernelPromise(kernelSlot);
    p.state === 'unresolved' ||
      Fail`${kernelSlot} is '${p.state}', not 'unresolved'`;
    const nkey = `${kernelSlot}.queue.nextID`;
    const nextID = Nat(BigInt(getRequired(nkey)));
    kvStore.set(nkey, `${nextID + 1n}`);
    const qid = `${kernelSlot}.queue.${nextID}`;
    kvStore.set(qid, JSON.stringify(msg));
    incStat('promiseQueuesLength');
  }

  function setDecider(kpid, decider) {
    insistVatID(decider);
    const p = getKernelPromise(kpid);
    p.state === 'unresolved' || Fail`${kpid} was already resolved`;
    !p.decider || Fail`${kpid} has decider ${p.decider}, not empty`;
    kvStore.set(`${kpid}.decider`, decider);
  }

  function clearDecider(kpid) {
    const p = getKernelPromise(kpid);
    p.state === 'unresolved' || Fail`${kpid} was already resolved`;
    p.decider || Fail`${kpid} does not have a decider`;
    kvStore.set(`${kpid}.decider`, '');
  }

  function* enumeratePromisesByDecider(vatID) {
    insistVatID(vatID);
    const promisePrefix = `${vatID}.c.p`;
    for (const k of enumeratePrefixedKeys(kvStore, promisePrefix)) {
      // The vpid for a promise imported or exported by a vat (and thus
      // potentially a promise for which the vat *might* be the decider) will
      // always be of the form `p+NN` or `p-NN`.  The corresponding vpid->kpid
      // c-list entry will thus always begin with `vMM.c.p`.  Decider-ship is
      // independent of whether the promise was imported or exported, so we
      // have to look up the corresponding kernel promise table entry to see
      // whether the vat is the decider or not.  If it is, we add the promise
      // to the list of promises that must be rejected because the dead vat
      // will never be able to act upon them.
      const kpid = kvStore.get(k);
      const p = getKernelPromise(kpid);
      if (p.state === 'unresolved' && p.decider === vatID) {
        yield kpid;
      }
    }
  }
  harden(enumeratePromisesByDecider);

  function addSubscriberToPromise(kernelSlot, vatID) {
    insistKernelType('promise', kernelSlot);
    insistVatID(vatID);
    const p = getKernelPromise(kernelSlot);
    const s = new Set(p.subscribers);
    s.add(vatID);
    const v = Array.from(s).sort().join(',');
    kvStore.set(`${kernelSlot}.subscribers`, v);
  }

  function addToRunQueue(msg) {
    enqueue('runQueue', msg);
  }

  function getRunQueueLength() {
    return queueLength('runQueue');
  }

  function getNextRunQueueMsg() {
    return dequeue('runQueue');
  }

  function addToAcceptanceQueue(msg) {
    enqueue('acceptanceQueue', msg);
  }

  function getAcceptanceQueueLength() {
    return queueLength('acceptanceQueue');
  }

  function getNextAcceptanceQueueMsg() {
    return dequeue('acceptanceQueue');
  }

  function allocateMeter(remaining, threshold) {
    if (remaining !== 'unlimited') {
      assert.typeof(remaining, 'bigint');
      Nat(remaining);
    }
    assert.typeof(threshold, 'bigint');
    Nat(threshold);
    const nextID = Nat(BigInt(getRequired('meter.nextID')));
    kvStore.set('meter.nextID', `${nextID + 1n}`);
    const meterID = `m${nextID}`;
    kvStore.set(`${meterID}.remaining`, `${remaining}`);
    kvStore.set(`${meterID}.threshold`, `${threshold}`);
    return meterID;
  }

  function addMeterRemaining(meterID, delta) {
    insistMeterID(meterID);
    assert.typeof(delta, 'bigint');
    Nat(delta);
    /** @type { bigint | string } */
    let remaining = getRequired(`${meterID}.remaining`);
    if (remaining !== 'unlimited') {
      remaining = Nat(BigInt(remaining));
      kvStore.set(`${meterID}.remaining`, `${remaining + delta}`);
    }
  }

  function setMeterThreshold(meterID, threshold) {
    insistMeterID(meterID);
    assert.typeof(threshold, 'bigint');
    Nat(threshold);
    kvStore.set(`${meterID}.threshold`, `${threshold}`);
  }

  function getMeter(meterID) {
    insistMeterID(meterID);
    /** @type { bigint | string } */
    let remaining = getRequired(`${meterID}.remaining`);
    if (remaining !== 'unlimited') {
      remaining = BigInt(remaining);
    }
    const threshold = BigInt(getRequired(`${meterID}.threshold`));
    return harden({ remaining, threshold });
  }

  function checkMeter(meterID, spent) {
    // Can this meter accomodate the spend? (read-only)
    insistMeterID(meterID);
    assert.typeof(spent, 'bigint');
    Nat(spent);
    /** @type { bigint | string } */
    const oldRemaining = getRequired(`${meterID}.remaining`);
    if (oldRemaining === 'unlimited') {
      return true;
    } else {
      return BigInt(oldRemaining) >= spent;
      // note: this function is read-only, but if it indicates
      // underrun, then the caller in kernel.js (probably
      // processDeliveryMessage) will turn around and call
      // deductMeter() to zero out the stored value
    }
  }

  function deductMeter(meterID, spent) {
    // Deduct the meter, and return true if it crossed the
    // notification threshold
    insistMeterID(meterID);
    assert.typeof(spent, 'bigint');
    Nat(spent);
    /** @type { bigint | string } */
    let oldRemaining = getRequired(`${meterID}.remaining`);
    if (oldRemaining === 'unlimited') {
      return false;
    } else {
      oldRemaining = BigInt(oldRemaining);
      const threshold = BigInt(getRequired(`${meterID}.threshold`));
      let remaining = oldRemaining - spent;
      if (remaining < 0n) {
        remaining = 0n;
      }
      kvStore.set(`${meterID}.remaining`, `${Nat(remaining)}`);
      // only notify once per crossing
      return remaining < threshold && oldRemaining >= threshold;
    }
  }

  function deleteMeter(meterID) {
    insistMeterID(meterID);
    kvStore.delete(`${meterID}.remaining`);
    kvStore.delete(`${meterID}.threshold`);
  }

  function hasVatWithName(name) {
    return kvStore.has(`vat.name.${name}`);
  }

  function getVatIDForName(name) {
    assert.typeof(name, 'string');
    const k = `vat.name.${name}`;
    kvStore.has(k) || Fail`vat name ${name} must exist, but doesn't`;
    return kvStore.get(k) || Fail`.has() ensures .get()`;
  }

  function allocateUnusedVatID() {
    const nextID = Nat(BigInt(getRequired(`vat.nextID`)));
    incStat('vats');
    kvStore.set(`vat.nextID`, `${nextID + 1n}`);
    return makeVatID(nextID);
  }

  function allocateVatIDForNameIfNeeded(name) {
    assert.typeof(name, 'string');
    const k = `vat.name.${name}`;
    if (!kvStore.has(k)) {
      kvStore.set(k, allocateUnusedVatID());
      const names = JSON.parse(getRequired('vat.names'));
      names.push(name);
      kvStore.set('vat.names', JSON.stringify(names));
    }
    return kvStore.get(k) || Fail`.has() ensures .get()`;
  }

  function addDynamicVatID(vatID) {
    assert.typeof(vatID, 'string');
    const KEY = 'vat.dynamicIDs';
    const dynamicVatIDs = JSON.parse(getRequired(KEY));
    dynamicVatIDs.push(vatID);
    kvStore.set(KEY, JSON.stringify(dynamicVatIDs));
  }

  const getStaticVats = () => getAllStaticVats(kvStore);

  function getDevices() {
    const result = [];
    for (const k of enumeratePrefixedKeys(kvStore, 'device.name.')) {
      const name = k.slice(12);
      const deviceID = kvStore.get(k) || Fail`getNextKey ensures get`;
      result.push([name, deviceID]);
    }
    return result;
  }

  const getDynamicVats = () => getAllDynamicVats(getRequired);

  function allocateUpgradeID() {
    const nextID = Nat(BigInt(getRequired(`vat.nextUpgradeID`)));
    kvStore.set(`vat.nextUpgradeID`, `${nextID + 1n}`);
    return makeUpgradeID(nextID);
  }

  function markVatAsTerminated(vatID) {
    if (!terminatedVats.includes(vatID)) {
      terminatedVats.push(vatID);
      kvStore.set(`vats.terminated`, JSON.stringify(terminatedVats));
    }
  }

  function getFirstTerminatedVat() {
    if (terminatedVats.length) {
      return terminatedVats[0];
    }
    return undefined;
  }

  function forgetTerminatedVat(vatID) {
    terminatedVats = terminatedVats.filter(id => id !== vatID);
    kvStore.set(`vats.terminated`, JSON.stringify(terminatedVats));
  }

  /**
   * @param {PolicyOutputCleanupBudget} allowCleanup
   * @returns {RunQueueEventCleanupTerminatedVat | undefined}
   */
  function nextCleanupTerminatedVatAction(allowCleanup) {
    if (allowCleanup === false) {
      return undefined;
    } else {
      const unlimited = { default: Infinity };
      /** @type {CleanupBudget} */
      const budget = allowCleanup === true ? unlimited : allowCleanup;
      const vatID = getFirstTerminatedVat();
      if (vatID) {
        return { type: 'cleanup-terminated-vat', vatID, budget };
      }
      return undefined;
    }
  }

  // As refcounts are decremented, we accumulate a set of krefs for which
  // action might need to be taken:
  //   * promises which are now resolved and unreferenced can be deleted
  //   * objects which are no longer reachable: export can be dropped
  //   * objects which are no longer recognizable: export can be retired

  // This set is ephemeral: it lives in RAM, grows as deliveries and syscalls
  // cause decrefs, and is harvested by processRefcounts(). This needs to be
  // called in the same transaction window as the syscalls/etc which prompted
  // the change, else removals might be lost (not performed during the next
  // replay).

  const maybeFreeKrefs = new Set();
  /** @param {string} kref */
  function addMaybeFreeKref(kref) {
    insistKernelType('object', kref);
    maybeFreeKrefs.add(kref);
  }

  /**
   * Increment the reference count associated with some kernel object.
   *
   * We track references to promises and objects, but not devices. Promises
   * have only a "reachable" count, whereas objects track both "reachable"
   * and "recognizable" counts.
   *
   * @param {unknown} kernelSlot  The kernel slot whose refcount is to be incremented.
   * @param {string?} tag  Debugging note with rough source of the reference.
   * @param {{ isExport?: boolean, onlyRecognizable?: boolean }} options
   * 'isExport' means the reference comes from a clist export, which counts
   * for promises but not objects. 'onlyRecognizable' means the reference
   * provides only recognition, not reachability
   */
  function incrementRefCount(kernelSlot, tag, options = {}) {
    const { isExport = false, onlyRecognizable = false } = options;
    kernelSlot ||
      Fail`incrementRefCount called with empty kernelSlot, tag=${tag}`;
    const { type } = parseKernelSlot(kernelSlot);
    if (type === 'promise') {
      const refCount = Nat(BigInt(getRequired(`${kernelSlot}.refCount`))) + 1n;
      // kdebug(`++ ${kernelSlot}  ${tag} ${refCount}`);
      kvStore.set(`${kernelSlot}.refCount`, `${refCount}`);
    }
    if (type === 'object' && !isExport) {
      let { reachable, recognizable } = getObjectRefCount(kernelSlot);
      if (!onlyRecognizable) {
        reachable += 1;
      }
      recognizable += 1;
      // kdebug(`++ ${kernelSlot}  ${tag} ${reachable},${recognizable}`);
      setObjectRefCount(kernelSlot, { reachable, recognizable });
    }
  }

  /**
   * Decrement the reference count associated with some kernel object.
   *
   * We track references to promises and objects.
   *
   * @param {string} kernelSlot  The kernel slot whose refcount is to be decremented.
   * @param {string} tag
   * @param {{ isExport?: boolean, onlyRecognizable?: boolean }} options
   * 'isExport' means the reference comes from a clist export, which counts
   * for promises but not objects. 'onlyRecognizable' means the reference
   * deing deleted only provided recognition, not reachability
   * @returns {boolean} true if the reference count has been decremented to zero, false if it is still non-zero
   * @throws if this tries to decrement the reference count below zero.
   */
  function decrementRefCount(kernelSlot, tag, options = {}) {
    const { isExport = false, onlyRecognizable = false } = options;
    kernelSlot ||
      Fail`decrementRefCount called with empty kernelSlot, tag=${tag}`;
    const { type } = parseKernelSlot(kernelSlot);
    if (type === 'promise') {
      let refCount = Nat(BigInt(getRequired(`${kernelSlot}.refCount`)));
      refCount > 0n || Fail`refCount underflow ${kernelSlot} ${tag}`;
      refCount -= 1n;
      // kdebug(`-- ${kernelSlot}  ${tag} ${refCount}`);
      kvStore.set(`${kernelSlot}.refCount`, `${refCount}`);
      if (refCount === 0n) {
        maybeFreeKrefs.add(kernelSlot);
        return true;
      }
    }
    if (type === 'object' && !isExport && kernelObjectExists(kernelSlot)) {
      let { reachable, recognizable } = getObjectRefCount(kernelSlot);
      if (!onlyRecognizable) {
        reachable -= 1;
      }
      recognizable -= 1;
      // kdebug(`-- ${kernelSlot}  ${tag} ${reachable},${recognizable}`);
      if (!reachable || !recognizable) {
        maybeFreeKrefs.add(kernelSlot);
      }
      setObjectRefCount(kernelSlot, { reachable, recognizable });
    }

    return false;
  }

  // TODO (#9888): change the processRefcounts maybeFreeKrefs
  // iteration to handle krefs that get added multiple times (while
  // we're iterating), because we might do different work the second
  // time around. The concerning scenario is:
  //
  // * kp2 has resolution data which references ko1
  // * somehow both kp2 and ko1 end up on maybeFreeKrefs, but ko1.reachable=1
  //   (via kp2)
  // * our iterator visits ko1 first, sees it is still reachable, ignores it
  // * then the iterator visits kp2, decrefs its kp.data.slots
  //   * this pushes ko1 back onto maybeFreeKrefs
  // * we need to examine ko1 again, so it can be released
  //
  // It could also happen if/when we implement #2069 auxdata:
  //
  // * ko2 has auxdata that references ko1
  // * both ko1 and ko2 end up on maybeFreeKrefs, but ko1.reachable = 1
  //   (via the ko2 auxdata)
  // * our iterator visits ko1 first, sees it is still reachable, ignores it
  // * then the iterator visits ko2, does deleteKernelObject
  //   * this frees the auxdata, which pushes ko1 back onto maybeFreeKrefs
  // * we need to examine ko1 again, so it can be released
  //
  // We should use something like an ordered Set, and a loop that does:
  // * pop the first kref off
  // * processes it (maybe adding more krefs)
  // * repeats until the thing is empty
  // Or maybe make a copy of maybeFreeKrefs at the start, clear the
  // original, and wrap this in a loop that keeps going until
  // maybeFreeKrefs is still empty at the end. Be sure to imagine a
  // very deep linked list: don't just process it twice, keep
  // processing until there's nothing left to do, otherwise we'll be
  // leaving work for the next delivery.

  function processRefcounts() {
    if (enableKernelGC) {
      const actions = new Set();
      for (const kref of maybeFreeKrefs.values()) {
        const { type } = parseKernelSlot(kref);
        if (type === 'promise') {
          const kpid = kref;
          const kp = getKernelPromise(kpid);
          if (kp.refCount === 0) {
            let idx = 0;
            // TODO (#9889) don't assume promise is settled
            for (const slot of kp.data.slots) {
              // Note: the following decrement can result in an addition to the
              // maybeFreeKrefs set, which we are in the midst of iterating.
              // TC39 went to a lot of trouble to ensure that this is kosher.
              decrementRefCount(slot, `gc|${kpid}|s${idx}`);
              idx += 1;
            }
            deleteKernelPromise(kpid);
          }
        }

        if (type === 'object') {
          const { reachable, recognizable } = getObjectRefCount(kref);
          if (reachable === 0) {
            // We avoid ownerOfKernelObject(), which will report
            // 'undefined' if the owner is dead (and being slowly
            // deleted). Message delivery should use that, but not us.
            const ownerKey = `${kref}.owner`;
            let ownerVatID = kvStore.get(ownerKey);
            const terminated = terminatedVats.includes(ownerVatID);

            // Some objects that are still owned, but the owning vat
            // might still alive, or might be terminated and in the
            // process of being deleted. These two clauses are
            // mutually exclusive.

            if (ownerVatID && !terminated) {
              const vatKeeper = provideVatKeeper(ownerVatID);
              const vatConsidersReachable = vatKeeper.getReachableFlag(kref);
              if (vatConsidersReachable) {
                // the reachable count is zero, but the vat doesn't realize it
                actions.add(`${ownerVatID} dropExport ${kref}`);
              }
              if (recognizable === 0) {
                // TODO: rethink this assert
                // assert.equal(vatConsidersReachable, false, `${kref} is reachable but not recognizable`);
                actions.add(`${ownerVatID} retireExport ${kref}`);
              }
            } else if (ownerVatID && terminated) {
              // When we're slowly deleting a vat, and one of its
              // exports becomes unreferenced, we obviously must not
              // send dropExports or retireExports into the dead vat.
              // We fast-forward the abandonment that slow-deletion
              // would have done, then treat the object as orphaned.

              const { vatSlot } = getReachableAndVatSlot(ownerVatID, kref);
              // delete directly, not orphanKernelObject(), which
              // would re-submit to maybeFreeKrefs
              kvStore.delete(ownerKey);
              kvStore.delete(`${ownerVatID}.c.${kref}`);
              kvStore.delete(`${ownerVatID}.c.${vatSlot}`);
              // now fall through to the orphaned case
              ownerVatID = undefined;
            }

            // Now handle objects which were orphaned. NOTE: this
            // includes objects which were owned by a terminated (but
            // not fully deleted) vat, where `ownerVatID` was cleared
            // in the last line of that previous clause (the
            // fall-through case). Don't try to change this `if
            // (!ownerVatID)` into an `else if`: the two clauses are
            // *not* mutually-exclusive.

            if (!ownerVatID) {
              // orphaned and unreachable, so retire it. If the kref
              // is recognizable, then we need retireKernelObjects()
              // to scan for importers and send retireImports (and
              // delete), else we can call deleteKernelObject directly
              if (recognizable) {
                retireKernelObjects([kref]);
              } else {
                deleteKernelObject(kref);
              }
            }
          }
        }
      }
      addGCActions([...actions]);
    }
    maybeFreeKrefs.clear();
  }

  function createVatState(vatID, source, options) {
    initializeVatState(kvStore, transcriptStore, vatID, source, options);
  }

  function provideVatKeeper(vatID) {
    insistVatID(vatID);
    const found = ephemeral.vatKeepers.get(vatID);
    if (found !== undefined) {
      return found;
    }
    assert(kvStore.has(`${vatID}.o.nextID`), `${vatID} was not initialized`);
    const vk = makeVatKeeper(
      kvStore,
      transcriptStore,
      kernelSlog,
      vatID,
      addKernelObject,
      addKernelPromiseForVat,
      kernelObjectExists,
      incrementRefCount,
      decrementRefCount,
      getObjectRefCount,
      setObjectRefCount,
      getReachableAndVatSlot,
      addMaybeFreeKref,
      incStat,
      decStat,
      getCrankNumber,
      scheduleReap,
      snapStore,
    );
    ephemeral.vatKeepers.set(vatID, vk);
    return vk;
  }

  function vatIsAlive(vatID) {
    insistVatID(vatID);
    return kvStore.has(`${vatID}.o.nextID`) && !terminatedVats.includes(vatID);
  }

  /**
   * @param {string} vatID
   */
  function evictVatKeeper(vatID) {
    insistVatID(vatID);
    ephemeral.vatKeepers.delete(vatID);
  }

  function getAllVatIDs() {
    const nextID = Nat(BigInt(getRequired(`vat.nextID`)));
    const vatIDs = [];
    for (let i = FIRST_VAT_ID; i < nextID; i += 1n) {
      const vatID = makeVatID(i);
      if (kvStore.has(`${vatID}.o.nextID`)) {
        vatIDs.push(vatID);
      }
    }
    return harden(vatIDs);
  }

  /*
   * @returns {DeviceID | undefined}
   */
  function getDeviceIDForName(name) {
    assert.typeof(name, 'string');
    const k = `device.name.${name}`;
    return kvStore.get(k);
  }

  function allocateDeviceIDForNameIfNeeded(name) {
    assert.typeof(name, 'string');
    const k = `device.name.${name}`;
    if (!kvStore.has(k)) {
      const nextID = Nat(BigInt(getRequired(`device.nextID`)));
      kvStore.set(`device.nextID`, `${nextID + 1n}`);
      kvStore.set(k, makeDeviceID(nextID));
      const names = JSON.parse(getRequired('device.names'));
      names.push(name);
      kvStore.set('device.names', JSON.stringify(names));
    }
    return kvStore.get(k);
  }

  function allocateDeviceKeeperIfNeeded(deviceID) {
    insistDeviceID(deviceID);
    if (!kvStore.has(`${deviceID}.o.nextID`)) {
      initializeDeviceState(kvStore, deviceID);
    }
    if (!ephemeral.deviceKeepers.has(deviceID)) {
      const tools = { addKernelDeviceNode, incrementRefCount };
      const dk = makeDeviceKeeper(kvStore, deviceID, tools);
      ephemeral.deviceKeepers.set(deviceID, dk);
    }
    return ephemeral.deviceKeepers.get(deviceID);
  }

  function getAllDeviceIDs() {
    const nextID = Nat(BigInt(getRequired(`device.nextID`)));
    const deviceIDs = [];
    for (let i = FIRST_DEVICE_ID; i < nextID; i += 1n) {
      const deviceID = makeDeviceID(i);
      if (kvStore.has(`${deviceID}.o.nextID`)) {
        deviceIDs.push(deviceID);
      }
    }
    return harden(deviceIDs);
  }

  function getImporters(koid) {
    // TODO maintain an index instead of scanning every single vat
    const importers = [];
    function doesImport(vatID) {
      return provideVatKeeper(vatID).importsKernelSlot(koid);
    }
    importers.push(...getDynamicVats().filter(doesImport));
    importers.push(
      ...getStaticVats()
        .map(nameAndVatID => nameAndVatID[1])
        .filter(doesImport),
    );
    importers.sort();
    return importers;
  }

  function pinObject(kref) {
    const pinList = kvStore.get('pinnedObjects') || '';
    const pinned = new Set(commaSplit(pinList));
    if (!pinned.has(kref)) {
      incrementRefCount(kref, 'pin');
      pinned.add(kref);
      kvStore.set('pinnedObjects', [...pinned].sort().join(','));
    }
  }

  // used for debugging, and tests. This returns a JSON-serializable object.
  // It includes references to live (mutable) kernel state, so don't mutate
  // the pieces, and be sure to serialize/deserialize before passing it
  // outside the kernel realm.
  function dump() {
    const vatTables = [];
    const kernelTable = [];

    for (const vatID of getAllVatIDs()) {
      const vk = provideVatKeeper(vatID);
      if (vk) {
        // TODO: find some way to expose the liveSlots internal tables, the
        // kernel doesn't see them
        const vatTable = {
          vatID,
          state: { transcript: Array.from(vk.getTranscript()) },
        };
        vatTables.push(vatTable);
        for (const e of vk.dumpState()) {
          kernelTable.push(e);
        }
      }
    }

    for (const deviceID of getAllDeviceIDs()) {
      const dk = allocateDeviceKeeperIfNeeded(deviceID);
      for (const e of dk.dumpState()) {
        kernelTable.push(e);
      }
    }

    function compareNumbers(a, b) {
      return Number(a - b);
    }

    function compareStrings(a, b) {
      // natural-sort strings having a shared prefix followed by digits
      // (e.g., 'ko42' and 'ko100')
      const [_a, aPrefix, aDigits] = /^(\D+)(\d+)$/.exec(a) || [];
      if (aPrefix) {
        const [_b, bPrefix, bDigits] = /^(\D+)(\d+)$/.exec(b) || [];
        if (bPrefix === aPrefix) {
          return compareNumbers(aDigits, bDigits);
        }
      }

      // otherwise use the default string ordering
      if (a > b) {
        return 1;
      }
      if (a < b) {
        return -1;
      }
      return 0;
    }

    kernelTable.sort(
      (a, b) =>
        compareStrings(a[0], b[0]) ||
        compareStrings(a[1], b[1]) ||
        compareNumbers(a[2], b[2]) ||
        compareStrings(a[3], b[3]) ||
        compareNumbers(a[4], b[4]) ||
        compareNumbers(a[5], b[5]) ||
        0,
    );

    const promises = [];

    const nextPromiseID = Nat(BigInt(getRequired('kp.nextID')));
    for (let i = FIRST_PROMISE_ID; i < nextPromiseID; i += 1n) {
      const kpid = makeKernelSlot('promise', i);
      if (hasKernelPromise(kpid)) {
        promises.push({ id: kpid, ...getKernelPromise(kpid) });
      }
    }
    promises.sort((a, b) => compareStrings(a.id, b.id));

    const objects = [];
    const nextObjectID = Nat(BigInt(getRequired('ko.nextID')));
    for (let i = FIRST_OBJECT_ID; i < nextObjectID; i += 1n) {
      const koid = makeKernelSlot('object', i);
      if (kvStore.has(`${koid}.refCount`)) {
        const owner = kvStore.get(`${koid}.owner`); // missing for orphans
        const { reachable, recognizable } = getObjectRefCount(koid);
        objects.push([koid, owner, reachable, recognizable]);
      }
    }

    const gcActions = Array.from(getGCActions());
    gcActions.sort();

    const reapQueue = JSON.parse(getRequired('reapQueue'));

    const runQueue = dumpQueue('runQueue');

    const acceptanceQueue = dumpQueue('acceptanceQueue');

    return harden({
      vatTables,
      kernelTable,
      promises,
      objects,
      gcActions,
      reapQueue,
      runQueue,
      acceptanceQueue,
    });
  }

  return harden({
    setInitialized,
    createStartingKernelState,
    getDefaultManagerType,
    getRelaxDurabilityRules,
    getDefaultReapDirtThreshold,
    setDefaultReapDirtThreshold,

    getSnapshotInitial,
    getSnapshotInterval,
    setSnapshotInterval,

    addNamedBundleID,
    getNamedBundleID,

    addBundle,
    hasBundle,
    getBundle,

    getCrankNumber,
    incrementCrankNumber,
    processRefcounts,

    incStat,
    decStat,
    saveStats,
    loadStats,
    getStats,

    getGCActions,
    setGCActions,
    addGCActions,
    scheduleReap,
    nextReapAction,

    addKernelObject,
    ownerOfKernelObject,
    ownerOfKernelDevice,
    kernelObjectExists,
    getImporters,
    orphanKernelObject,
    retireKernelObjects,
    deleteKernelObject,
    pinObject,

    addKernelPromise,
    addKernelPromiseForVat,
    getKernelPromise,
    getResolveablePromise,
    hasKernelPromise,
    requeueKernelPromise,
    resolveKernelPromise,
    addMessageToPromiseQueue,
    addSubscriberToPromise,
    setDecider,
    clearDecider,
    enumeratePromisesByDecider,
    incrementRefCount,
    decrementRefCount,
    getObjectRefCount,
    enumerateNonDurableObjectExports,

    addToRunQueue,
    getRunQueueLength,
    getNextRunQueueMsg,

    addToAcceptanceQueue,
    getAcceptanceQueueLength,
    getNextAcceptanceQueueMsg,

    allocateMeter,
    addMeterRemaining,
    setMeterThreshold,
    getMeter,
    checkMeter,
    deductMeter,
    deleteMeter,

    hasVatWithName,
    getVatIDForName,
    allocateVatIDForNameIfNeeded,
    allocateUnusedVatID,
    createVatState,
    provideVatKeeper,
    vatIsAlive,
    evictVatKeeper,
    removeVatFromSwingStoreExports,
    cleanupAfterTerminatedVat,
    addDynamicVatID,
    getDynamicVats,
    getStaticVats,
    getDevices,
    deleteVatID,

    markVatAsTerminated,
    getFirstTerminatedVat,
    forgetTerminatedVat,
    nextCleanupTerminatedVatAction,

    allocateUpgradeID,

    getDeviceIDForName,
    allocateDeviceIDForNameIfNeeded,
    allocateDeviceKeeperIfNeeded,

    kvStore,
    startCrank,
    establishCrankSavepoint,
    rollbackCrank,
    emitCrankHashes,
    endCrank,

    dump,
  });
}
/** @typedef {ReturnType<typeof makeKernelKeeper>} KernelKeeper */
