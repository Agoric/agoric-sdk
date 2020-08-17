/* global harden */

import Nat from '@agoric/nat';
import { assert, details } from '@agoric/assert';
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

// dynamic vats have these too:
// v$NN.source = JSON({ bundle }) or JSON({ bundleName })
// v$NN.options = JSON

// v$NN.o.nextID = $NN
// v$NN.p.nextID = $NN
// v$NN.d.nextID = $NN
// v$NN.c.$kernelSlot = $vatSlot = o+$NN/o-$NN/p+$NN/p-$NN/d+$NN/d-$NN
// v$NN.c.$vatSlot = $kernelSlot = ko$NN/kp$NN/kd$NN
// v$NN.t.$NN = JSON(transcript entry)
// v$NN.t.nextID = $NN

// d$NN.o.nextID = $NN
// d$NN.c.$kernelSlot = $deviceSlot = o-$NN/d+$NN/d-$NN
// d$NN.c.$deviceSlot = $kernelSlot = ko$NN/kd$NN
// d$NN.deviceState = JSON

// runQueue = JSON(runQueue) // usually empty on disk

// ko.nextID = $NN
// ko$NN.owner = $vatID
// kd.nextID = $NN
// kd$NN.owner = $vatID
// kp.nextID = $NN
// kp$NN.state = unresolved | fulfilledToPresence | fulfilledToData | rejected
// kp$NN.decider = missing | '' | $vatID
// kp$NN.subscribers = '' | $vatID[,$vatID..]
// kp$NN.queue.$NN = JSON(msg)
// kp$NN.queue.nextID = $NN
// kp$NN.slot = missing | $kernelSlot
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
const FIRST_VAT_ID = 1;
const FIRST_DEVICE_ID = 7;
const FIRST_OBJECT_ID = 20;
const FIRST_DEVNODE_ID = 30;
const FIRST_PROMISE_ID = 40;

export default function makeKernelKeeper(storage) {
  insistEnhancedStorageAPI(storage);

  function getRequired(key) {
    if (!storage.has(key)) {
      throw new Error(`storage lacks required key ${key}`);
    }
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
  let kernelStats = {
    kernelObjects: 0,
    kernelObjectsUp: 0,
    kernelObjectsDown: 0,
    kernelObjectsMax: 0,
    kernelDevices: 0,
    kernelDevicesUp: 0,
    kernelDevicesDown: 0,
    kernelDevicesMax: 0,
    kernelPromises: 0,
    kernelPromisesUp: 0,
    kernelPromisesDown: 0,
    kernelPromisesMax: 0,
    kpUnresolved: 0,
    kpUnresolvedUp: 0,
    kpUnresolvedDown: 0,
    kpUnresolvedMax: 0,
    kpFulfilledToPresence: 0,
    kpFulfilledToPresenceUp: 0,
    kpFulfilledToPresenceDown: 0,
    kpFulfilledToPresenceMax: 0,
    kpFulfilledToData: 0,
    kpFulfilledToDataUp: 0,
    kpFulfilledToDataDown: 0,
    kpFulfilledToDataMax: 0,
    kpRejected: 0,
    kpRejectedUp: 0,
    kpRejectedDown: 0,
    kpRejectedMax: 0,
    runQueueLength: 0,
    runQueueLengthUp: 0,
    runQueueLengthMax: 0,
    syscalls: 0,
    syscallSend: 0,
    syscallSubscribe: 0,
    syscallFulfillToData: 0,
    syscallFulfillToPresence: 0,
    syscallReject: 0,
    syscallCallNow: 0,
    dispatches: 0,
    dispatchDeliver: 0,
    dispatchNotifyFulfillToData: 0,
    dispatchNotifyFulfillToPresence: 0,
    dispatchReject: 0,
    clistEntries: 0,
    clistEntriesUp: 0,
    clistEntriesDown: 0,
    clistEntriesMax: 0,
  };

  function incStat(stat) {
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
    storage.set('initialized', true);
  }

  function getCrankNumber() {
    return Nat(Number(getRequired('crankNumber')));
  }

  function incrementCrankNumber() {
    const crankNumber = Nat(Number(getRequired('crankNumber')));
    storage.set('crankNumber', `${crankNumber + 1}`);
  }

  function createStartingKernelState() {
    storage.set('vat.names', '[]');
    storage.set('vat.dynamicIDs', '[]');
    storage.set('vat.nextID', JSON.stringify(FIRST_VAT_ID));
    storage.set('device.names', '[]');
    storage.set('device.nextID', JSON.stringify(FIRST_DEVICE_ID));
    storage.set('ko.nextID', JSON.stringify(FIRST_OBJECT_ID));
    storage.set('kd.nextID', JSON.stringify(FIRST_DEVNODE_ID));
    storage.set('kp.nextID', JSON.stringify(FIRST_PROMISE_ID));
    storage.set('runQueue', JSON.stringify([]));
    storage.set('crankNumber', '0');
  }

  function addKernelObject(ownerID) {
    insistVatID(ownerID);
    const id = Nat(Number(getRequired('ko.nextID')));
    kdebug(`Adding kernel object ko${id} for ${ownerID}`);
    storage.set('ko.nextID', `${id + 1}`);
    const s = makeKernelSlot('object', id);
    storage.set(`${s}.owner`, ownerID);
    incStat('kernelObjects');
    return s;
  }

  function ownerOfKernelObject(kernelSlot) {
    insistKernelType('object', kernelSlot);
    const owner = getRequired(`${kernelSlot}.owner`);
    insistVatID(owner);
    return owner;
  }

  function addKernelDeviceNode(deviceID) {
    insistDeviceID(deviceID);
    const id = Nat(Number(getRequired('kd.nextID')));
    kdebug(`Adding kernel device kd${id} for ${deviceID}`);
    storage.set('kd.nextID', `${id + 1}`);
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

  function addKernelPromise() {
    const kpidNum = Nat(Number(getRequired('kp.nextID')));
    storage.set('kp.nextID', `${kpidNum + 1}`);
    const kpid = makeKernelSlot('promise', kpidNum);
    storage.set(`${kpid}.state`, 'unresolved');
    storage.set(`${kpid}.subscribers`, '');
    storage.set(`${kpid}.queue.nextID`, `0`);
    storage.set(`${kpid}.refCount`, `0`);
    storage.set(`${kpid}.decider`, '');
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
        throw new Error(`unknown kernelPromise '${kernelSlot}'`);
      case 'unresolved':
        p.refCount = Number(storage.get(`${kernelSlot}.refCount`));
        p.decider = storage.get(`${kernelSlot}.decider`);
        if (p.decider === '') {
          p.decider = undefined;
        }
        p.subscribers = commaSplit(storage.get(`${kernelSlot}.subscribers`));
        p.queue = Array.from(
          storage.getPrefixedValues(`${kernelSlot}.queue.`),
        ).map(JSON.parse);
        break;
      case 'fulfilledToPresence':
        p.refCount = Number(storage.get(`${kernelSlot}.refCount`));
        p.slot = storage.get(`${kernelSlot}.slot`);
        parseKernelSlot(p.slot);
        break;
      case 'fulfilledToData':
        p.refCount = Number(storage.get(`${kernelSlot}.refCount`));
        p.data = {
          body: storage.get(`${kernelSlot}.data.body`),
          slots: commaSplit(storage.get(`${kernelSlot}.data.slots`)),
        };
        p.data.slots.map(parseKernelSlot);
        break;
      case 'rejected':
        p.refCount = Number(storage.get(`${kernelSlot}.refCount`));
        p.data = {
          body: storage.get(`${kernelSlot}.data.body`),
          slots: commaSplit(storage.get(`${kernelSlot}.data.slots`)),
        };
        p.data.slots.map(parseKernelSlot);
        break;
      default:
        throw new Error(`unknown state for ${kernelSlot}: ${p.state}`);
    }
    return harden(p);
  }

  function hasKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    return storage.has(`${kernelSlot}.state`);
  }

  function deleteKernelPromiseState(kpid) {
    storage.delete(`${kpid}.state`);
    storage.delete(`${kpid}.decider`);
    storage.delete(`${kpid}.subscribers`);
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
      case 'fulfilledToPresence':
        decStat('kpFulfilledToPresence');
        break;
      case 'fulfilledToData':
        decStat('kpFulfilledToData');
        break;
      case 'rejected':
        decStat('kpRejected');
        break;
      default:
        throw new Error(`unknown state for ${kpid}: ${state}`);
    }
    decStat('kernelPromises');
    deleteKernelPromiseState(kpid);
    storage.delete(`${kpid}.refCount`);
  }

  function fulfillKernelPromiseToPresence(kernelSlot, targetSlot) {
    insistKernelType('promise', kernelSlot);
    deleteKernelPromiseState(kernelSlot);
    decStat('kpUnresolved');
    incStat('kpFulfilledToPresence');
    storage.set(`${kernelSlot}.state`, 'fulfilledToPresence');
    storage.set(`${kernelSlot}.slot`, targetSlot);
  }

  function fulfillKernelPromiseToData(kernelSlot, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    deleteKernelPromiseState(kernelSlot);
    decStat('kpUnresolved');
    incStat('kpFulfilledToData');
    storage.set(`${kernelSlot}.state`, 'fulfilledToData');
    storage.set(`${kernelSlot}.data.body`, capdata.body);
    storage.set(`${kernelSlot}.data.slots`, capdata.slots.join(','));
  }

  function rejectKernelPromise(kernelSlot, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    deleteKernelPromiseState(kernelSlot);
    decStat('kpUnresolved');
    incStat('kpRejected');
    storage.set(`${kernelSlot}.state`, 'rejected');
    storage.set(`${kernelSlot}.data.body`, capdata.body);
    storage.set(`${kernelSlot}.data.slots`, capdata.slots.join(','));
  }

  function addMessageToPromiseQueue(kernelSlot, msg) {
    insistKernelType('promise', kernelSlot);

    const p = getKernelPromise(kernelSlot);
    if (p.state !== 'unresolved') {
      throw new Error(`${kernelSlot} is '${p.state}', not 'unresolved'`);
    }
    const nkey = `${kernelSlot}.queue.nextID`;
    const nextID = Nat(Number(storage.get(nkey)));
    storage.set(nkey, `${nextID + 1}`);
    const qid = `${kernelSlot}.queue.${nextID}`;
    storage.set(qid, JSON.stringify(msg));
  }

  function setDecider(kpid, decider) {
    insistVatID(decider);
    const p = getKernelPromise(kpid);
    assert(p.state === 'unresolved', details`${kpid} was already resolved`);
    assert(!p.decider, details`${kpid} has decider ${p.decider}, not empty`);
    storage.set(`${kpid}.decider`, decider);
  }

  function clearDecider(kpid) {
    const p = getKernelPromise(kpid);
    assert(p.state === 'unresolved', details`${kpid} was already resolved`);
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

  function getVatIDForName(name) {
    assert.typeof(name, 'string');
    const k = `vat.name.${name}`;
    if (!storage.has(k)) {
      throw new Error(`vat name ${name} must exist, but doesn't`);
    }
    return storage.get(k);
  }

  function allocateUnusedVatID() {
    const nextID = Nat(Number(getRequired(`vat.nextID`)));
    storage.set(`vat.nextID`, `${nextID + 1}`);
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

  function getAllDynamicVatIDs() {
    return JSON.parse(getRequired('vat.dynamicIDs'));
  }

  const deadKernelPromises = new Set();

  /**
   * Increment the reference count associated with some kernel object.
   *
   * Note that currently we are only reference counting promises, but ultimately
   * we intend to keep track of all objects with kernel slots.
   *
   * @param kernelSlot  The kernel slot whose refcount is to be incremented.
   */
  function incrementRefCount(kernelSlot, tag) {
    if (kernelSlot && parseKernelSlot(kernelSlot).type === 'promise') {
      const refCount = Nat(Number(storage.get(`${kernelSlot}.refCount`))) + 1;
      kdebug(`++ ${kernelSlot}  ${tag} ${refCount}`);
      storage.set(`${kernelSlot}.refCount`, `${refCount}`);
    }
  }

  /**
   * Decrement the reference count associated with some kernel object.
   *
   * Note that currently we are only reference counting promises, but ultimately
   * we intend to keep track of all objects with kernel slots.
   *
   * @param kernelSlot  The kernel slot whose refcount is to be decremented.
   *
   * @return true if the reference count has been decremented to zero, false if it is still non-zero
   *
   * @throws if this tries to decrement the reference count below zero.
   */
  function decrementRefCount(kernelSlot, tag) {
    if (kernelSlot && parseKernelSlot(kernelSlot).type === 'promise') {
      let refCount = Nat(Number(storage.get(`${kernelSlot}.refCount`)));
      assert(refCount > 0, details`refCount underflow {kernelSlot} ${tag}`);
      refCount -= 1;
      kdebug(`-- ${kernelSlot}  ${tag} ${refCount}`);
      storage.set(`${kernelSlot}.refCount`, `${refCount}`);
      if (refCount === 0) {
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
          if (kp.state === 'fulfilledToData' || kp.state === 'rejected') {
            let idx = 0;
            for (const slot of kp.data.slots) {
              // Note: the following decrement can result in an addition to the
              // deadKernelPromises set, which we are in the midst of iterating.
              // TC39 went to a lot of trouble to ensure that this is kosher.
              decrementRefCount(slot, `gc|${kpid}|s${idx}`);
              idx += 1;
            }
          }
          deleteKernelPromise(kpid);
        }
      }
    }
    deadKernelPromises.clear();
  }

  function allocateVatKeeperIfNeeded(vatID) {
    insistVatID(vatID);
    if (!storage.has(`${vatID}.o.nextID`)) {
      initializeVatState(storage, vatID);
    }
    if (!ephemeral.vatKeepers.has(vatID)) {
      const vk = makeVatKeeper(
        storage,
        vatID,
        addKernelObject,
        addKernelPromiseForVat,
        incrementRefCount,
        decrementRefCount,
        incStat,
        decStat,
      );
      ephemeral.vatKeepers.set(vatID, vk);
    }
    return ephemeral.vatKeepers.get(vatID);
  }

  function getAllVatIDs() {
    const nextID = Nat(Number(getRequired(`vat.nextID`)));
    const vatIDs = [];
    for (let i = FIRST_VAT_ID; i < nextID; i += 1) {
      const vatID = makeVatID(i);
      if (storage.has(`${vatID}.o.nextID`)) {
        vatIDs.push(vatID);
      }
    }
    return harden(vatIDs);
  }

  function getAllVatNames() {
    const names = JSON.parse(getRequired('vat.names'));
    return harden(names.sort());
  }

  function getDeviceIDForName(name) {
    assert.typeof(name, 'string');
    const k = `device.name.${name}`;
    if (!storage.has(k)) {
      throw new Error(`device name ${name} must exist, but doesn't`);
    }
    return storage.get(k);
  }

  function allocateDeviceIDForNameIfNeeded(name) {
    assert.typeof(name, 'string');
    const k = `device.name.${name}`;
    if (!storage.has(k)) {
      const nextID = Nat(Number(getRequired(`device.nextID`)));
      storage.set(`device.nextID`, `${nextID + 1}`);
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
    const nextID = Nat(Number(getRequired(`device.nextID`)));
    const deviceIDs = [];
    for (let i = FIRST_DEVICE_ID; i < nextID; i += 1) {
      const deviceID = makeDeviceID(i);
      if (storage.has(`${deviceID}.o.nextID`)) {
        deviceIDs.push(deviceID);
      }
    }
    return harden(deviceIDs);
  }

  function getAllDeviceNames() {
    const names = JSON.parse(getRequired('device.names'));
    return harden(names.sort());
  }

  // used for debugging, and tests. This returns a JSON-serializable object.
  // It includes references to live (mutable) kernel state, so don't mutate
  // the pieces, and be sure to serialize/deserialize before passing it
  // outside the kernel realm.
  function dump() {
    const vatTables = [];
    const kernelTable = [];

    for (const vatID of getAllVatIDs()) {
      const vk = allocateVatKeeperIfNeeded(vatID);

      // TODO: find some way to expose the liveSlots internal tables, the
      // kernel doesn't see them
      const vatTable = {
        vatID,
        state: { transcript: Array.from(vk.getTranscript()) },
      };
      vatTables.push(vatTable);
      vk.dumpState().forEach(e => kernelTable.push(e));
    }

    for (const deviceID of getAllDeviceIDs()) {
      const dk = allocateDeviceKeeperIfNeeded(deviceID);
      dk.dumpState().forEach(e => kernelTable.push(e));
    }

    function compareNumbers(a, b) {
      return a - b;
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

    const nextPromiseID = Nat(Number(getRequired('kp.nextID')));
    for (let i = FIRST_PROMISE_ID; i < nextPromiseID; i += 1) {
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
    hasKernelPromise,
    fulfillKernelPromiseToPresence,
    fulfillKernelPromiseToData,
    rejectKernelPromise,
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

    getVatIDForName,
    allocateVatIDForNameIfNeeded,
    allocateUnusedVatID,
    allocateVatKeeperIfNeeded,
    getAllVatNames,
    addDynamicVatID,
    getAllDynamicVatIDs,

    getDeviceIDForName,
    allocateDeviceIDForNameIfNeeded,
    allocateDeviceKeeperIfNeeded,
    getAllDeviceNames,

    dump,
  });
}
