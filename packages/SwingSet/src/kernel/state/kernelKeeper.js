import { Nat, isNat } from '@endo/nat';
import { assert, Fail } from '@agoric/assert';
import { initializeVatState, makeVatKeeper } from './vatKeeper.js';
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
 * @typedef { import('../../types-external.js').KernelOptions } KernelOptions
 * @typedef { import('../../types-external.js').KernelSlog } KernelSlog
 * @typedef { import('../../types-external.js').ManagerType } ManagerType
 * @typedef { import('../../types-external.js').SnapStore } SnapStore
 * @typedef { import('../../types-external.js').TranscriptStore } TranscriptStore
 * @typedef { import('../../types-external.js').VatKeeper } VatKeeper
 */

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
// The schema is:
//
// vat.names = JSON([names..])
// vat.dynamicIDs = JSON([vatIDs..])
// vat.name.$NAME = $vatID = v$NN
// vat.nextID = $NN
// vat.nextUpgradeID = $NN
// device.names = JSON([names..])
// device.name.$NAME = $deviceID = d$NN
// device.nextID = $NN
// meter.nextID = $NN // used to make m$NN

// namedBundleID.$NAME = bundleID
// bundle.$BUNDLEID = JSON(bundle)
//
// kernel.defaultManagerType = managerType
// kernel.defaultReapInterval = $NN
// kernel.relaxDurabilityRules = missing | 'true'
// kernel.snapshotInitial = $NN
// kernel.snapshotInterval = $NN

// v$NN.source = JSON({ bundle }) or JSON({ bundleName })
// v$NN.options = JSON
// v$NN.o.nextID = $NN
// v$NN.p.nextID = $NN
// v$NN.d.nextID = $NN
// v$NN.c.$kernelSlot = '$R $vatSlot'
//   $R is 'R' when reachable, '_' when merely recognizable
//   $vatSlot is one of: o+$NN/o-$NN/p+$NN/p-$NN/d+$NN/d-$NN
// v$NN.c.$vatSlot = $kernelSlot = ko$NN/kp$NN/kd$NN
// v$NN.vs.$key = string
// v$NN.meter = m$NN // XXX does this exist?
// v$NN.reapInterval = $NN or 'never'
// v$NN.reapCountdown = $NN or 'never'
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

export function commaSplit(s) {
  if (s === '') {
    return [];
  }
  return s.split(',');
}

function insistMeterID(m) {
  assert.typeof(m, 'string');
  assert.equal(m[0], 'm');
  Nat(BigInt(m.slice(1)));
}

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

/**
 * @param {SwingStoreKernelStorage} kernelStorage
 * @param {KernelSlog|null} kernelSlog
 */
export default function makeKernelKeeper(kernelStorage, kernelSlog) {
  const { kvStore, transcriptStore, snapStore, bundleStore } = kernelStorage;

  insistStorageAPI(kvStore);

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

  function getInitialized() {
    return !!kvStore.get('initialized');
  }

  function setInitialized() {
    kvStore.set('initialized', 'true');
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
   * @param {KernelOptions} kernelOptions
   */
  function createStartingKernelState(kernelOptions) {
    const {
      defaultManagerType = 'local',
      defaultReapInterval = 1,
      relaxDurabilityRules = false,
      snapshotInitial = 3,
      snapshotInterval = 200,
    } = kernelOptions;

    kvStore.set('vat.names', '[]');
    kvStore.set('vat.dynamicIDs', '[]');
    kvStore.set('vat.nextID', `${FIRST_VAT_ID}`);
    kvStore.set('vat.nextUpgradeID', `1`);
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
    kvStore.set('kernel.defaultReapInterval', `${defaultReapInterval}`);
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
   * @returns {number | 'never'}
   */
  function getDefaultReapInterval() {
    const r = getRequired('kernel.defaultReapInterval');
    const ri = r === 'never' ? r : Number.parseInt(r, 10);
    assert(ri === 'never' || typeof ri === 'number', `k.dri is '${ri}'`);
    return ri;
  }

  function setDefaultReapInterval(interval) {
    assert(
      interval === 'never' || isNat(interval),
      'invalid defaultReapInterval value',
    );
    kvStore.set('kernel.defaultReapInterval', `${interval}`);
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
    data || Fail`getObjectRefCount(${kernelSlot}) was missing`;
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
    if (owner) {
      insistVatID(owner);
    }
    return owner;
  }

  function orphanKernelObject(kref, oldVat) {
    const ownerKey = `${kref}.owner`;
    const ownerVat = kvStore.get(ownerKey);
    ownerVat === oldVat || Fail`export ${kref} not owned by old vat`;
    kvStore.delete(ownerKey);
    // note that we do not delete the object here: it will be
    // collected if/when all other references are dropped
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

  function cleanupAfterTerminatedVat(vatID) {
    insistVatID(vatID);
    const vatKeeper = provideVatKeeper(vatID);
    const exportPrefix = `${vatID}.c.o+`;
    const importPrefix = `${vatID}.c.o-`;

    vatKeeper.deleteSnapshotsAndTranscript();

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
    for (const k of enumeratePrefixedKeys(kvStore, exportPrefix)) {
      // The void for an object exported by a vat will always be of the form
      // `o+NN`.  The '+' means that the vat exported the object (rather than
      // importing it) and therefore the object is owned by (i.e., within) the
      // vat.  The corresponding void->koid c-list entry will thus always
      // begin with `vMM.c.o+`.  In addition to deleting the c-list entry, we
      // must also delete the corresponding kernel owner entry for the object,
      // since the object will no longer be accessible.
      const kref = kvStore.get(k);
      orphanKernelObject(kref, vatID);
    }

    // then scan for imported objects, which must be decrefed
    for (const k of enumeratePrefixedKeys(kvStore, importPrefix)) {
      // abandoned imports: delete the clist entry as if the vat did a
      // drop+retire
      const kref = kvStore.get(k) || Fail`getNextKey ensures get`;
      const vref = k.slice(`${vatID}.c.`.length);
      vatKeeper.deleteCListEntry(kref, vref);
      // that will also delete both db keys
    }

    // the caller used enumeratePromisesByDecider() before calling us,
    // so they already know the orphaned promises to reject

    // now loop back through everything and delete it all
    for (const k of enumeratePrefixedKeys(kvStore, `${vatID}.`)) {
      kvStore.delete(k);
    }

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

  function getStaticVats() {
    const result = [];
    for (const k of enumeratePrefixedKeys(kvStore, 'vat.name.')) {
      const name = k.slice(9);
      const vatID = kvStore.get(k) || Fail`getNextKey ensures get`;
      result.push([name, vatID]);
    }
    return result;
  }

  function getDevices() {
    const result = [];
    for (const k of enumeratePrefixedKeys(kvStore, 'device.name.')) {
      const name = k.slice(12);
      const deviceID = kvStore.get(k) || Fail`getNextKey ensures get`;
      result.push([name, deviceID]);
    }
    return result;
  }

  function getDynamicVats() {
    return JSON.parse(getRequired('vat.dynamicIDs'));
  }

  function allocateUpgradeID() {
    const nextID = Nat(BigInt(getRequired(`vat.nextUpgradeID`)));
    kvStore.set(`vat.nextUpgradeID`, `${nextID + 1n}`);
    return makeUpgradeID(nextID);
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

  function processRefcounts() {
    if (enableKernelGC) {
      const actions = getGCActions(); // local cache
      // TODO (else buggy): change the iteration to handle krefs that get
      // added multiple times (while we're iterating), because we might do
      // different work the second time around. Something like an ordered
      // Set, and a loop that: pops the first kref off, processes it (maybe
      // adding more krefs), repeats until the thing is empty.
      for (const kref of maybeFreeKrefs.values()) {
        const { type } = parseKernelSlot(kref);
        if (type === 'promise') {
          const kpid = kref;
          const kp = getKernelPromise(kpid);
          if (kp.refCount === 0) {
            let idx = 0;
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
            const ownerVatID = ownerOfKernelObject(kref);
            if (ownerVatID) {
              const vatKeeper = provideVatKeeper(ownerVatID);
              const isReachable = vatKeeper.getReachableFlag(kref);
              if (isReachable) {
                // the reachable count is zero, but the vat doesn't realize it
                actions.add(`${ownerVatID} dropExport ${kref}`);
              }
              if (recognizable === 0) {
                // TODO: rethink this
                // assert.equal(isReachable, false, `${kref} is reachable but not recognizable`);
                actions.add(`${ownerVatID} retireExport ${kref}`);
              }
            } else if (recognizable === 0) {
              // unreachable, unrecognizable, orphaned: delete the
              // empty refcount here, since we can't send a GC
              // action without an ownerVatID
              deleteKernelObject(kref);
            }
          }
        }
      }
      setGCActions(actions);
    }
    maybeFreeKrefs.clear();
  }

  function provideVatKeeper(vatID) {
    insistVatID(vatID);
    const found = ephemeral.vatKeepers.get(vatID);
    if (found !== undefined) {
      return found;
    }
    if (!kvStore.has(`${vatID}.o.nextID`)) {
      initializeVatState(kvStore, transcriptStore, vatID);
    }
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
      snapStore,
    );
    ephemeral.vatKeepers.set(vatID, vk);
    return vk;
  }

  function vatIsAlive(vatID) {
    insistVatID(vatID);
    return kvStore.has(`${vatID}.o.nextID`);
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
    getInitialized,
    setInitialized,
    createStartingKernelState,
    getDefaultManagerType,
    getDefaultReapInterval,
    getRelaxDurabilityRules,
    setDefaultReapInterval,
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
    provideVatKeeper,
    vatIsAlive,
    evictVatKeeper,
    cleanupAfterTerminatedVat,
    addDynamicVatID,
    getDynamicVats,
    getStaticVats,
    getDevices,

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
