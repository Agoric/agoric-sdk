import { Nat } from '@agoric/nat';
import { assert, details as X } from '@agoric/assert';
import { initializeVatState, makeVatKeeper } from './vatKeeper';
import { initializeDeviceState, makeDeviceKeeper } from './deviceKeeper';
import { insistEnhancedStorageAPI } from '../../storageAPI';
import {
  insistKernelType,
  makeKernelSlot,
  parseKernelSlot,
} from '../parseKernelSlots';
import { insistCapData } from '../../capdata';
import { insistDeviceID, insistVatID, makeDeviceID, makeVatID } from '../id';
import { kdebug } from '../kdebug';
import {
  KERNEL_STATS_SUM_METRICS,
  KERNEL_STATS_UPDOWN_METRICS,
} from '../metrics';

const enableKernelPromiseGC = true;

// This holds all the kernel state, including that of each Vat and Device, in
// a single JSON-serializable object. At any moment (well, really only
// between turns) we might be asked for it as a string. This same string may
// be used as the 'initialState' argument of some future makeKernelKeeper()
// call, and that future instance should behave identically to this one.

// kernel state lives in a key-value store. All keys and values are strings.
// We simulate a tree by concatenating path-name components with ".". When we
// want to delete a subtree, we tell the DB to delete everything between
// "prefix." and "prefix/", which avoids including anything using an
// extension of the prefix (e.g. [vat1.foo, vat1.bar, vat15.baz]).
//
// The schema is:
//
// vat.names = JSON([names..])
// vat.dynamicIDs = JSON([vatIDs..])
// vat.name.$NAME = $vatID = v$NN
// vat.nextID = $NN
// device.names = JSON([names..])
// device.name.$NAME = $deviceID = d$NN
// device.nextID = $NN

// kernelBundle = JSON(bundle)
// bundle.$NAME = JSON(bundle)

// v$NN.source = JSON({ bundle }) or JSON({ bundleName })
// v$NN.options = JSON
// v$NN.o.nextID = $NN
// v$NN.p.nextID = $NN
// v$NN.d.nextID = $NN
// v$NN.c.$kernelSlot = $vatSlot = o+$NN/o-$NN/p+$NN/p-$NN/d+$NN/d-$NN
// v$NN.c.$vatSlot = $kernelSlot = ko$NN/kp$NN/kd$NN
// v$NN.t.$NN = JSON(transcript entry)
// v$NN.t.nextID = $NN
// v$NN.vs.$key = string

// d$NN.o.nextID = $NN
// d$NN.c.$kernelSlot = $deviceSlot = o-$NN/d+$NN/d-$NN
// d$NN.c.$deviceSlot = $kernelSlot = ko$NN/kd$NN
// d$NN.deviceState = JSON
// d$NN.source = JSON({ bundle }) or JSON({ bundleName })
// d$NN.options = JSON

// runQueue = JSON(runQueue) // usually empty on disk

// ko.nextID = $NN
// ko$NN.owner = $vatID
// kd.nextID = $NN
// kd$NN.owner = $vatID
// kp.nextID = $NN
// kp$NN.state = unresolved | fulfilled | rejected
// // if unresolved:
// kp$NN.decider = missing | '' | $vatID
// kp$NN.policy = missing (=ignore) | ignore | logAlways | logFailure | panic
// kp$NN.subscribers = '' | $vatID[,$vatID..]
// kp$NN.queue.$NN = JSON(msg)
// kp$NN.queue.nextID = $NN
// // if fulfilled or rejected:
// kp$NN.data.body = missing | JSON
// kp$NN.data.slots = '' | $vatID[,$vatID..]

// for now we hold this in a plain object, but soon it will move to a
// host-side database

export function commaSplit(s) {
  if (s === '') {
    return [];
  }
  return s.split(',');
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

export default function makeKernelKeeper(storage, kernelSlog) {
  insistEnhancedStorageAPI(storage);

  function getRequired(key) {
    assert(storage.has(key), X`storage lacks required key ${key}`);
    return storage.get(key);
  }

  // These are the defined kernel statistics counters.
  //
  // For any counter 'foo' that is defined here, if there is also a defined
  // counter named 'fooMax', the stats collection machinery will automatically
  // track the latter as a high-water mark for 'foo'.
  //
  // For any counter 'foo' that is defined here, if there is also a defined
  // counter named 'fooUp', the stats collection machinery will automatically
  // track the number of times 'foo' is incremented.  Similarly, 'fooDown' will
  // track the number of times 'foo' is decremented.
  let kernelStats = {};

  // The SUM_METRICS just allow incrementing a single value.
  KERNEL_STATS_SUM_METRICS.forEach(({ key }) => {
    kernelStats[key] = 0;
  });

  // The UPDOWN_METRICS track a value, up, down, and max.
  KERNEL_STATS_UPDOWN_METRICS.forEach(({ key }) => {
    kernelStats[key] = 0;
    kernelStats[`${key}Up`] = 0;
    kernelStats[`${key}Down`] = 0;
    kernelStats[`${key}Max`] = 0;
  });

  function incStat(stat) {
    assert.typeof(kernelStats[stat], 'number');
    kernelStats[stat] += 1;
    const maxStat = `${stat}Max`;
    if (
      kernelStats[maxStat] !== undefined &&
      kernelStats[stat] > kernelStats[maxStat]
    ) {
      kernelStats[maxStat] = kernelStats[stat];
    }
    const upStat = `${stat}Up`;
    if (kernelStats[upStat] !== undefined) {
      kernelStats[upStat] += 1;
    }
  }

  function decStat(stat) {
    assert.typeof(kernelStats[stat], 'number');
    kernelStats[stat] -= 1;
    const downStat = `${stat}Down`;
    if (kernelStats[downStat] !== undefined) {
      kernelStats[downStat] += 1;
    }
  }

  function saveStats() {
    storage.set('kernelStats', JSON.stringify(kernelStats));
  }

  function loadStats() {
    kernelStats = { ...kernelStats, ...JSON.parse(getRequired('kernelStats')) };
  }

  function getStats() {
    return { ...kernelStats };
  }

  const ephemeral = harden({
    vatKeepers: new Map(), // vatID -> vatKeeper
    deviceKeepers: new Map(), // deviceID -> deviceKeeper
  });

  function getInitialized() {
    return !!storage.get('initialized');
  }

  function setInitialized() {
    storage.set('initialized', 'true');
  }

  function getCrankNumber() {
    return Nat(BigInt(getRequired('crankNumber')));
  }

  function incrementCrankNumber() {
    const crankNumber = Nat(BigInt(getRequired('crankNumber')));
    storage.set('crankNumber', `${crankNumber + 1n}`);
  }

  /**
   * @param { ManagerType } defaultManagerType
   */
  function createStartingKernelState(defaultManagerType) {
    storage.set('vat.names', '[]');
    storage.set('vat.dynamicIDs', '[]');
    storage.set('vat.nextID', `${FIRST_VAT_ID}`);
    storage.set('device.names', '[]');
    storage.set('device.nextID', `${FIRST_DEVICE_ID}`);
    storage.set('ko.nextID', `${FIRST_OBJECT_ID}`);
    storage.set('kd.nextID', `${FIRST_DEVNODE_ID}`);
    storage.set('kp.nextID', `${FIRST_PROMISE_ID}`);
    storage.set('runQueue', JSON.stringify([]));
    storage.set('crankNumber', `${FIRST_CRANK_NUMBER}`);
    storage.set('kernel.defaultManagerType', defaultManagerType);
  }

  function getDefaultManagerType() {
    return getRequired('kernel.defaultManagerType');
  }

  function addBundle(name, bundle) {
    storage.set(`bundle.${name}`, JSON.stringify(bundle));
  }

  function getBundle(name) {
    return harden(JSON.parse(storage.get(`bundle.${name}`)));
  }

  function addKernelObject(ownerID) {
    insistVatID(ownerID);
    const id = Nat(BigInt(getRequired('ko.nextID')));
    kdebug(`Adding kernel object ko${id} for ${ownerID}`);
    storage.set('ko.nextID', `${id + 1n}`);
    const s = makeKernelSlot('object', id);
    storage.set(`${s}.owner`, ownerID);
    incStat('kernelObjects');
    return s;
  }

  function ownerOfKernelObject(kernelSlot) {
    insistKernelType('object', kernelSlot);
    const owner = storage.get(`${kernelSlot}.owner`);
    if (owner) {
      insistVatID(owner);
    }
    return owner;
  }

  function addKernelDeviceNode(deviceID) {
    insistDeviceID(deviceID);
    const id = Nat(BigInt(getRequired('kd.nextID')));
    kdebug(`Adding kernel device kd${id} for ${deviceID}`);
    storage.set('kd.nextID', `${id + 1n}`);
    const s = makeKernelSlot('device', id);
    storage.set(`${s}.owner`, deviceID);
    incStat('kernelDevices');
    return s;
  }

  function ownerOfKernelDevice(kernelSlot) {
    insistKernelType('device', kernelSlot);
    const owner = storage.get(`${kernelSlot}.owner`);
    insistDeviceID(owner);
    return owner;
  }

  function addKernelPromise(policy) {
    const kpidNum = Nat(BigInt(getRequired('kp.nextID')));
    storage.set('kp.nextID', `${kpidNum + 1n}`);
    const kpid = makeKernelSlot('promise', kpidNum);
    storage.set(`${kpid}.state`, 'unresolved');
    storage.set(`${kpid}.subscribers`, '');
    storage.set(`${kpid}.queue.nextID`, `0`);
    storage.set(`${kpid}.refCount`, `0`);
    storage.set(`${kpid}.decider`, '');
    if (policy && policy !== 'ignore') {
      storage.set(`${kpid}.policy`, policy);
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
    storage.set(`${kpid}.decider`, deciderVatID);
    return kpid;
  }

  function getKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    const p = { state: storage.get(`${kernelSlot}.state`) };
    switch (p.state) {
      case undefined:
        assert.fail(X`unknown kernelPromise '${kernelSlot}'`);
      case 'unresolved':
        p.refCount = Number(storage.get(`${kernelSlot}.refCount`));
        p.decider = storage.get(`${kernelSlot}.decider`);
        if (p.decider === '') {
          p.decider = undefined;
        }
        p.policy = storage.get(`${kernelSlot}.policy`) || 'ignore';
        p.subscribers = commaSplit(storage.get(`${kernelSlot}.subscribers`));
        p.queue = Array.from(
          storage.getPrefixedValues(`${kernelSlot}.queue.`),
        ).map(JSON.parse);
        break;
      case 'fulfilled':
      case 'rejected':
        p.refCount = Number(storage.get(`${kernelSlot}.refCount`));
        p.data = {
          body: storage.get(`${kernelSlot}.data.body`),
          slots: commaSplit(storage.get(`${kernelSlot}.data.slots`)),
        };
        p.data.slots.map(parseKernelSlot);
        break;
      default:
        assert.fail(X`unknown state for ${kernelSlot}: ${p.state}`);
    }
    return harden(p);
  }

  function getResolveablePromise(kpid, expectedDecider) {
    insistKernelType('promise', kpid);
    if (expectedDecider) {
      insistVatID(expectedDecider);
    }
    const p = getKernelPromise(kpid);
    assert(p.state === 'unresolved', X`${kpid} was already resolved`);
    if (expectedDecider) {
      assert(
        p.decider === expectedDecider,
        X`${kpid} is decided by ${p.decider}, not ${expectedDecider}`,
      );
    } else {
      assert(!p.decider, X`${kpid} is decided by ${p.decider}, not the kernel`);
    }
    return p;
  }

  function hasKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    return storage.has(`${kernelSlot}.state`);
  }

  function deleteKernelPromiseState(kpid) {
    storage.delete(`${kpid}.state`);
    storage.delete(`${kpid}.decider`);
    storage.delete(`${kpid}.subscribers`);
    storage.delete(`${kpid}.policy`);
    storage.deletePrefixedKeys(`${kpid}.queue.`);
    storage.delete(`${kpid}.queue.nextID`);
    storage.delete(`${kpid}.slot`);
    storage.delete(`${kpid}.data.body`);
    storage.delete(`${kpid}.data.slots`);
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
        assert.fail(X`unknown state for ${kpid}: ${state}`);
    }
    decStat('kernelPromises');
    deleteKernelPromiseState(kpid);
    storage.delete(`${kpid}.refCount`);
  }

  function resolveKernelPromise(kernelSlot, rejected, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    deleteKernelPromiseState(kernelSlot);
    decStat('kpUnresolved');

    if (rejected) {
      incStat('kpRejected');
      storage.set(`${kernelSlot}.state`, 'rejected');
    } else {
      incStat('kpFulfilled');
      storage.set(`${kernelSlot}.state`, 'fulfilled');
    }
    storage.set(`${kernelSlot}.data.body`, capdata.body);
    storage.set(`${kernelSlot}.data.slots`, capdata.slots.join(','));
  }

  function cleanupAfterTerminatedVat(vatID) {
    insistVatID(vatID);
    ephemeral.vatKeepers.delete(vatID);
    const koPrefix = `${vatID}.c.o+`;
    const kpPrefix = `${vatID}.c.p`;
    const kernelPromisesToReject = [];
    for (const k of storage.getKeys(`${vatID}.`, `${vatID}/`)) {
      // The current store semantics ensure this iteration is lexicographic.
      // Any changes to the creation of the list of promises to be rejected (and
      // thus to the order in which they *get* rejected) need to preserve this
      // ordering in order to preserve determinism.  TODO: we would like to
      // shift to a different deterministic ordering scheme that is less fragile
      // in the face of potential changes in the nature of the database being
      // used.
      if (k.startsWith(koPrefix)) {
        // The void for an object exported by a vat will always be of the form
        // `o+NN`.  The '+' means that the vat exported the object (rather than
        // importing it) and therefor the object is owned by (i.e., within) the
        // vat.  The corresponding void->koid c-list entry will thus always
        // begin with `vMM.c.o+`.  In addition to deleting the c-list entry, we
        // must also delete the corresponding kernel owner entry for the object,
        // since the object will no longer be accessible.
        const koid = storage.get(k);
        const ownerKey = `${koid}.owner`;
        const ownerVat = storage.get(ownerKey);
        if (ownerVat === vatID) {
          storage.delete(ownerKey);
        }
      } else if (k.startsWith(kpPrefix)) {
        // The vpid for a promise imported or exported by a vat (and thus
        // potentially a promise for which the vat *might* be the decider) will
        // always be of the form `p+NN` or `p-NN`.  The corresponding vpid->kpid
        // c-list entry will thus always begin with `vMM.c.p`.  Decider-ship is
        // independent of whether the promise was imported or exported, so we
        // have to look up the corresponding kernel promise table entry to see
        // whether the vat is the decider or not.  If it is, we add the promise
        // to the list of promises that must be rejected because the dead vat
        // will never be able to act upon them.
        const kpid = storage.get(k);
        const p = getKernelPromise(kpid);
        if (p.state === 'unresolved' && p.decider === vatID) {
          kernelPromisesToReject.push(kpid);
        }
      }
      storage.delete(k);
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
      storage.set(DYNAMIC_IDS_KEY, JSON.stringify(newDynamicVatIDs));
    } else {
      kdebug(`removing static vat ${vatID}`);
      for (const k of storage.getKeys('vat.name.', 'vat.name/')) {
        if (storage.get(k) === vatID) {
          storage.delete(k);
          const VAT_NAMES_KEY = 'vat.names';
          const name = k.slice('vat.name.'.length);
          const oldStaticVatNames = JSON.parse(getRequired(VAT_NAMES_KEY));
          const newStaticVatNames = oldStaticVatNames.filter(v => v !== name);
          storage.set(VAT_NAMES_KEY, JSON.stringify(newStaticVatNames));
          break;
        }
      }
      decStat('vats');
    }

    return kernelPromisesToReject;
  }

  function addMessageToPromiseQueue(kernelSlot, msg) {
    insistKernelType('promise', kernelSlot);

    const p = getKernelPromise(kernelSlot);
    assert(
      p.state === 'unresolved',
      X`${kernelSlot} is '${p.state}', not 'unresolved'`,
    );
    const nkey = `${kernelSlot}.queue.nextID`;
    const nextID = Nat(BigInt(storage.get(nkey)));
    storage.set(nkey, `${nextID + 1n}`);
    const qid = `${kernelSlot}.queue.${nextID}`;
    storage.set(qid, JSON.stringify(msg));
  }

  function setDecider(kpid, decider) {
    insistVatID(decider);
    const p = getKernelPromise(kpid);
    assert(p.state === 'unresolved', X`${kpid} was already resolved`);
    assert(!p.decider, X`${kpid} has decider ${p.decider}, not empty`);
    storage.set(`${kpid}.decider`, decider);
  }

  function clearDecider(kpid) {
    const p = getKernelPromise(kpid);
    assert(p.state === 'unresolved', X`${kpid} was already resolved`);
    storage.set(`${kpid}.decider`, '');
  }

  function addSubscriberToPromise(kernelSlot, vatID) {
    insistKernelType('promise', kernelSlot);
    insistVatID(vatID);
    const p = getKernelPromise(kernelSlot);
    const s = new Set(p.subscribers);
    s.add(vatID);
    const v = Array.from(s)
      .sort()
      .join(',');
    storage.set(`${kernelSlot}.subscribers`, v);
  }

  function addToRunQueue(msg) {
    // the runqueue is usually empty between blocks, so we can afford a
    // non-delta-friendly format
    const queue = JSON.parse(getRequired('runQueue'));
    queue.push(msg);
    storage.set('runQueue', JSON.stringify(queue));
    incStat('runQueueLength');
  }

  function isRunQueueEmpty() {
    const queue = JSON.parse(getRequired('runQueue'));
    return queue.length <= 0;
  }

  function getRunQueueLength() {
    const queue = JSON.parse(getRequired('runQueue'));
    return queue.length;
  }

  function getNextMsg() {
    const queue = JSON.parse(getRequired('runQueue'));
    const msg = queue.shift();
    storage.set('runQueue', JSON.stringify(queue));
    decStat('runQueueLength');
    return msg;
  }

  function hasVatWithName(name) {
    return storage.has(`vat.name.${name}`);
  }

  function getVatIDForName(name) {
    assert.typeof(name, 'string');
    const k = `vat.name.${name}`;
    assert(storage.has(k), X`vat name ${name} must exist, but doesn't`);
    return storage.get(k);
  }

  function allocateUnusedVatID() {
    const nextID = Nat(BigInt(getRequired(`vat.nextID`)));
    incStat('vats');
    storage.set(`vat.nextID`, `${nextID + 1n}`);
    return makeVatID(nextID);
  }

  function allocateVatIDForNameIfNeeded(name) {
    assert.typeof(name, 'string');
    const k = `vat.name.${name}`;
    if (!storage.has(k)) {
      storage.set(k, allocateUnusedVatID());
      const names = JSON.parse(getRequired('vat.names'));
      names.push(name);
      storage.set('vat.names', JSON.stringify(names));
    }
    return storage.get(k);
  }

  function addDynamicVatID(vatID) {
    assert.typeof(vatID, 'string');
    const KEY = 'vat.dynamicIDs';
    const dynamicVatIDs = JSON.parse(getRequired(KEY));
    dynamicVatIDs.push(vatID);
    storage.set(KEY, JSON.stringify(dynamicVatIDs));
  }

  function getStaticVats() {
    const result = [];
    for (const k of storage.getKeys('vat.name.', 'vat.name/')) {
      const name = k.slice(9);
      const vatID = storage.get(k);
      result.push([name, vatID]);
    }
    return result;
  }

  function getDevices() {
    const result = [];
    for (const k of storage.getKeys('device.name.', 'device.name/')) {
      const name = k.slice(12);
      const deviceID = storage.get(k);
      result.push([name, deviceID]);
    }
    return result;
  }

  function getDynamicVats() {
    return JSON.parse(getRequired('vat.dynamicIDs'));
  }

  const deadKernelPromises = new Set();

  /**
   * Increment the reference count associated with some kernel object.
   *
   * Note that currently we are only reference counting promises, but ultimately
   * we intend to keep track of all objects with kernel slots.
   *
   * @param {*} kernelSlot  The kernel slot whose refcount is to be incremented.
   * @param {*} _tag
   */
  function incrementRefCount(kernelSlot, _tag) {
    if (kernelSlot && parseKernelSlot(kernelSlot).type === 'promise') {
      const refCount = Nat(BigInt(storage.get(`${kernelSlot}.refCount`))) + 1n;
      // kdebug(`++ ${kernelSlot}  ${tag} ${refCount}`);
      storage.set(`${kernelSlot}.refCount`, `${refCount}`);
    }
  }

  /**
   * Decrement the reference count associated with some kernel object.
   *
   * Note that currently we are only reference counting promises, but ultimately
   * we intend to keep track of all objects with kernel slots.
   *
   * @param {*} kernelSlot  The kernel slot whose refcount is to be decremented.
   * @param {string} tag
   * @returns {boolean} true if the reference count has been decremented to zero, false if it is still non-zero
   * @throws if this tries to decrement the reference count below zero.
   */
  function decrementRefCount(kernelSlot, tag) {
    if (kernelSlot && parseKernelSlot(kernelSlot).type === 'promise') {
      let refCount = Nat(BigInt(storage.get(`${kernelSlot}.refCount`)));
      assert(refCount > 0n, X`refCount underflow {kernelSlot} ${tag}`);
      refCount -= 1n;
      // kdebug(`-- ${kernelSlot}  ${tag} ${refCount}`);
      storage.set(`${kernelSlot}.refCount`, `${refCount}`);
      if (refCount === 0n) {
        deadKernelPromises.add(kernelSlot);
        return true;
      }
    }
    return false;
  }

  function purgeDeadKernelPromises() {
    if (enableKernelPromiseGC) {
      for (const kpid of deadKernelPromises.values()) {
        const kp = getKernelPromise(kpid);
        if (kp.refCount === 0) {
          let idx = 0;
          for (const slot of kp.data.slots) {
            // Note: the following decrement can result in an addition to the
            // deadKernelPromises set, which we are in the midst of iterating.
            // TC39 went to a lot of trouble to ensure that this is kosher.
            decrementRefCount(slot, `gc|${kpid}|s${idx}`);
            idx += 1;
          }
          deleteKernelPromise(kpid);
        }
      }
    }
    deadKernelPromises.clear();
  }

  function getVatKeeper(vatID) {
    insistVatID(vatID);
    return ephemeral.vatKeepers.get(vatID);
  }

  function allocateVatKeeper(vatID) {
    insistVatID(vatID);
    if (!storage.has(`${vatID}.o.nextID`)) {
      initializeVatState(storage, vatID);
    }
    assert(!ephemeral.vatKeepers.has(vatID), X`vatID ${vatID} already defined`);
    const vk = makeVatKeeper(
      storage,
      kernelSlog,
      vatID,
      addKernelObject,
      addKernelPromiseForVat,
      incrementRefCount,
      decrementRefCount,
      incStat,
      decStat,
      getCrankNumber,
    );
    ephemeral.vatKeepers.set(vatID, vk);
    return vk;
  }

  function getAllVatIDs() {
    const nextID = Nat(BigInt(getRequired(`vat.nextID`)));
    const vatIDs = [];
    for (let i = FIRST_VAT_ID; i < nextID; i += 1n) {
      const vatID = makeVatID(i);
      if (storage.has(`${vatID}.o.nextID`)) {
        vatIDs.push(vatID);
      }
    }
    return harden(vatIDs);
  }

  function getDeviceIDForName(name) {
    assert.typeof(name, 'string');
    const k = `device.name.${name}`;
    assert(storage.has(k), X`device name ${name} must exist, but doesn't`);
    return storage.get(k);
  }

  function allocateDeviceIDForNameIfNeeded(name) {
    assert.typeof(name, 'string');
    const k = `device.name.${name}`;
    if (!storage.has(k)) {
      const nextID = Nat(BigInt(getRequired(`device.nextID`)));
      storage.set(`device.nextID`, `${nextID + 1n}`);
      storage.set(k, makeDeviceID(nextID));
      const names = JSON.parse(getRequired('device.names'));
      names.push(name);
      storage.set('device.names', JSON.stringify(names));
    }
    return storage.get(k);
  }

  function allocateDeviceKeeperIfNeeded(deviceID) {
    insistDeviceID(deviceID);
    if (!storage.has(`${deviceID}.o.nextID`)) {
      initializeDeviceState(storage, deviceID);
    }
    if (!ephemeral.deviceKeepers.has(deviceID)) {
      const dk = makeDeviceKeeper(storage, deviceID, addKernelDeviceNode);
      ephemeral.deviceKeepers.set(deviceID, dk);
    }
    return ephemeral.deviceKeepers.get(deviceID);
  }

  function getAllDeviceIDs() {
    const nextID = Nat(BigInt(getRequired(`device.nextID`)));
    const deviceIDs = [];
    for (let i = FIRST_DEVICE_ID; i < nextID; i += 1n) {
      const deviceID = makeDeviceID(i);
      if (storage.has(`${deviceID}.o.nextID`)) {
        deviceIDs.push(deviceID);
      }
    }
    return harden(deviceIDs);
  }

  // used for debugging, and tests. This returns a JSON-serializable object.
  // It includes references to live (mutable) kernel state, so don't mutate
  // the pieces, and be sure to serialize/deserialize before passing it
  // outside the kernel realm.
  function dump() {
    const vatTables = [];
    const kernelTable = [];

    for (const vatID of getAllVatIDs()) {
      const vk = getVatKeeper(vatID);
      if (vk) {
        // TODO: find some way to expose the liveSlots internal tables, the
        // kernel doesn't see them
        const vatTable = {
          vatID,
          state: { transcript: Array.from(vk.getTranscript()) },
        };
        vatTables.push(vatTable);
        vk.dumpState().forEach(e => kernelTable.push(e));
      }
    }

    for (const deviceID of getAllDeviceIDs()) {
      const dk = allocateDeviceKeeperIfNeeded(deviceID);
      dk.dumpState().forEach(e => kernelTable.push(e));
    }

    function compareNumbers(a, b) {
      return Number(a - b);
    }

    function compareStrings(a, b) {
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

    const runQueue = JSON.parse(getRequired('runQueue'));

    return harden({
      vatTables,
      kernelTable,
      promises,
      runQueue,
    });
  }

  return harden({
    getInitialized,
    setInitialized,
    createStartingKernelState,
    getDefaultManagerType,
    addBundle,
    getBundle,

    getCrankNumber,
    incrementCrankNumber,
    purgeDeadKernelPromises,

    incStat,
    decStat,
    saveStats,
    loadStats,
    getStats,

    ownerOfKernelObject,
    ownerOfKernelDevice,

    addKernelPromise,
    addKernelPromiseForVat,
    getKernelPromise,
    getResolveablePromise,
    hasKernelPromise,
    resolveKernelPromise,
    addMessageToPromiseQueue,
    addSubscriberToPromise,
    setDecider,
    clearDecider,
    incrementRefCount,
    decrementRefCount,

    addToRunQueue,
    isRunQueueEmpty,
    getRunQueueLength,
    getNextMsg,

    hasVatWithName,
    getVatIDForName,
    allocateVatIDForNameIfNeeded,
    allocateUnusedVatID,
    allocateVatKeeper,
    getVatKeeper,
    cleanupAfterTerminatedVat,
    addDynamicVatID,
    getDynamicVats,
    getStaticVats,
    getDevices,

    getDeviceIDForName,
    allocateDeviceIDForNameIfNeeded,
    allocateDeviceKeeperIfNeeded,

    dump,
  });
}
