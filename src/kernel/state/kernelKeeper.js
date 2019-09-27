import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { makeStorage } from './storage';
import { initializeVatState, makeVatKeeper } from './vatKeeper';
import { initializeDeviceState, makeDeviceKeeper } from './deviceKeeper';
import { insist } from '../../insist';
import {
  insistKernelType,
  makeKernelSlot,
  parseKernelSlot,
} from '../parseKernelSlots';
import { insistCapData } from '../../capdata';
import { insistVatID, insistDeviceID, makeDeviceID, makeVatID } from '../id';

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
// vat.name.$NAME = $vatID = v$NN
// vat.nextID = $NN
// device.names = JSON([names..])
// device.name.$NAME = $deviceID = d$NN
// device.nextID = $NN

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

export default function makeKernelKeeper(initialState) {
  const storage = makeStorage(`${initialState}`);

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

  function createStartingKernelState() {
    storage.set('vat.names', '[]');
    storage.set('vat.nextID', '1');
    storage.set('device.names', '[]');
    storage.set('device.nextID', '7');
    storage.set('ko.nextID', '20');
    storage.set('kd.nextID', '30');
    storage.set('kp.nextID', '40');
    storage.set('runQueue', JSON.stringify([]));
  }

  function addKernelObject(ownerID) {
    insistVatID(ownerID);
    const id = Nat(Number(storage.get('ko.nextID')));
    storage.set('ko.nextID', `${id + 1}`);
    const s = makeKernelSlot('object', id);
    storage.set(`${s}.owner`, ownerID);
    return s;
  }

  function ownerOfKernelObject(kernelSlot) {
    insistKernelType('object', kernelSlot);
    const owner = storage.get(`${kernelSlot}.owner`);
    insistVatID(owner);
    return owner;
  }

  function addKernelDeviceNode(deviceID) {
    insistDeviceID(deviceID);
    const id = Nat(Number(storage.get('kd.nextID')));
    storage.set('kd.nextID', `${id + 1}`);
    const s = makeKernelSlot('device', id);
    storage.set(`${s}.owner`, deviceID);
    return s;
  }

  function ownerOfKernelDevice(kernelSlot) {
    insistKernelType('device', kernelSlot);
    const owner = storage.get(`${kernelSlot}.owner`);
    insistDeviceID(owner);
    return owner;
  }

  function addKernelPromise(deciderVatID) {
    insistVatID(deciderVatID);
    const kpid = Nat(Number(storage.get('kp.nextID')));
    storage.set('kp.nextID', `${kpid + 1}`);
    const s = makeKernelSlot('promise', kpid);
    storage.set(`${s}.state`, 'unresolved');
    storage.set(`${s}.decider`, deciderVatID);
    storage.set(`${s}.subscribers`, '');
    storage.set(`${s}.queue.nextID`, `0`);
    // queue is empty, so no state[kp$NN.queue.$NN] keys yet
    return s;
  }

  function getKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    const p = { state: storage.get(`${kernelSlot}.state`) };
    switch (p.state) {
      case undefined:
        throw new Error(`unknown kernelPromise '${kernelSlot}'`);
      case 'unresolved':
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
        p.slot = storage.get(`${kernelSlot}.slot`);
        parseKernelSlot(p.slot);
        break;
      case 'fulfilledToData':
        p.data = {
          body: storage.get(`${kernelSlot}.data.body`),
          slots: commaSplit(storage.get(`${kernelSlot}.data.slots`)),
        };
        p.data.slots.map(parseKernelSlot);
        break;
      case 'rejected':
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

  function deleteKernelPromise(kpid) {
    // storage.deleteRange(`${kpid}.`, `${kpid}/`);
    storage.delete(`${kpid}.state`);
    storage.delete(`${kpid}.decider`);
    storage.delete(`${kpid}.subscribers`);
    storage.deletePrefixedKeys(`${kpid}.queue.`);
    storage.delete(`${kpid}.queue.nextID`);
    storage.delete(`${kpid}.slot`);
    storage.delete(`${kpid}.data.body`);
    storage.delete(`${kpid}.data.slots`);
  }

  function fulfillKernelPromiseToPresence(kernelSlot, targetSlot) {
    insistKernelType('promise', kernelSlot);
    deleteKernelPromise(kernelSlot);
    storage.set(`${kernelSlot}.state`, 'fulfilledToPresence');
    storage.set(`${kernelSlot}.slot`, targetSlot);
  }

  function fulfillKernelPromiseToData(kernelSlot, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    deleteKernelPromise(kernelSlot);
    storage.set(`${kernelSlot}.state`, 'fulfilledToData');
    storage.set(`${kernelSlot}.data.body`, capdata.body);
    storage.set(`${kernelSlot}.data.slots`, capdata.slots.join(','));
  }

  function rejectKernelPromise(kernelSlot, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    deleteKernelPromise(kernelSlot);
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
    insist(p.state === 'unresolved', `${kpid} was already resolved`);
    insist(!p.decider, `${kpid} has decider ${p.decider}, not empty`);
    storage.set(`${kpid}.decider`, decider);
  }

  function clearDecider(kpid) {
    const p = getKernelPromise(kpid);
    insist(p.state === 'unresolved', `${kpid} was already resolved`);
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
    const queue = JSON.parse(storage.get('runQueue'));
    queue.push(msg);
    storage.set('runQueue', JSON.stringify(queue));
  }

  function isRunQueueEmpty() {
    const queue = JSON.parse(storage.get('runQueue'));
    return queue.length <= 0;
  }

  function getRunQueueLength() {
    const queue = JSON.parse(storage.get('runQueue'));
    return queue.length;
  }

  function getNextMsg() {
    const queue = JSON.parse(storage.get('runQueue'));
    const msg = queue.shift();
    storage.set('runQueue', JSON.stringify(queue));
    return msg;
  }

  function getVatIDForName(name) {
    insist(name === `${name}`, `${name} is not a string`);
    const k = `vat.name.${name}`;
    if (!storage.has(k)) {
      throw new Error(`vat name ${name} must exist, but doesn't`);
    }
    return storage.get(k);
  }

  function provideVatIDForName(name) {
    insist(name === `${name}`);
    const k = `vat.name.${name}`;
    if (!storage.has(k)) {
      const nextID = Nat(Number(storage.get(`vat.nextID`)));
      storage.set(`vat.nextID`, `${nextID + 1}`);
      storage.set(k, makeVatID(nextID));
      const names = JSON.parse(storage.get('vat.names'));
      names.push(name);
      storage.set('vat.names', JSON.stringify(names));
    }
    return storage.get(k);
  }

  function provideVatKeeper(vatID) {
    insistVatID(vatID);
    if (!storage.has(`${vatID}.o.nextID`)) {
      initializeVatState(storage, vatID);
    }
    if (!ephemeral.vatKeepers.has(vatID)) {
      const vk = makeVatKeeper(
        storage,
        vatID,
        addKernelObject,
        addKernelPromise,
      );
      ephemeral.vatKeepers.set(vatID, vk);
    }
    return ephemeral.vatKeepers.get(vatID);
  }

  function getAllVatIDs() {
    const nextID = Nat(Number(storage.get(`vat.nextID`)));
    const vatIDs = [];
    for (let i = 1; i < nextID; i += 1) {
      const vatID = makeVatID(i);
      if (storage.has(`${vatID}.o.nextID`)) {
        vatIDs.push(vatID);
      }
    }
    return harden(vatIDs);
  }

  function getAllVatNames() {
    const names = JSON.parse(storage.get('vat.names'));
    return harden(names.sort());
  }

  function getDeviceIDForName(name) {
    insist(name === `${name}`);
    const k = `device.name.${name}`;
    if (!storage.has(k)) {
      throw new Error(`device name ${name} must exist, but doesn't`);
    }
    return storage.get(k);
  }

  function provideDeviceIDForName(name) {
    insist(name === `${name}`);
    const k = `device.name.${name}`;
    if (!storage.has(k)) {
      const nextID = Nat(Number(storage.get(`device.nextID`)));
      storage.set(`device.nextID`, `${nextID + 1}`);
      storage.set(k, makeDeviceID(nextID));
      const names = JSON.parse(storage.get('device.names'));
      names.push(name);
      storage.set('device.names', JSON.stringify(names));
    }
    return storage.get(k);
  }

  function provideDeviceKeeper(deviceID) {
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
    const nextID = Nat(Number(storage.get(`device.nextID`)));
    const deviceIDs = [];
    for (let i = 1; i < nextID; i += 1) {
      const deviceID = makeDeviceID(i);
      if (storage.has(`${deviceID}.o.nextID`)) {
        deviceIDs.push(deviceID);
      }
    }
    return harden(deviceIDs);
  }

  function getAllDeviceNames() {
    const names = JSON.parse(storage.get('device.names'));
    return harden(names.sort());
  }

  // used for persistence. This returns a JSON-serialized string, suitable to
  // be passed back into makeKernelKeeper() as 'initialState'.
  function getState() {
    return storage.serialize();
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
      const dk = provideDeviceKeeper(deviceID);
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

    const nextPromiseID = Nat(Number(storage.get('kp.nextID')));
    for (let i = 0; i < nextPromiseID; i += 1) {
      const kpid = makeKernelSlot('promise', i);
      if (hasKernelPromise(kpid)) {
        promises.push({ id: kpid, ...getKernelPromise(kpid) });
      }
    }
    promises.sort((a, b) => compareStrings(a.id, b.id));

    const runQueue = JSON.parse(storage.get('runQueue'));

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

    ownerOfKernelObject,
    ownerOfKernelDevice,

    addKernelPromise,
    getKernelPromise,
    hasKernelPromise,
    fulfillKernelPromiseToPresence,
    fulfillKernelPromiseToData,
    rejectKernelPromise,
    addMessageToPromiseQueue,
    addSubscriberToPromise,
    setDecider,
    clearDecider,

    addToRunQueue,
    isRunQueueEmpty,
    getRunQueueLength,
    getNextMsg,

    getVatIDForName,
    provideVatIDForName,
    provideVatKeeper,
    getAllVatNames,

    getDeviceIDForName,
    provideDeviceIDForName,
    provideDeviceKeeper,
    getAllDeviceNames,

    getState,
    dump,
  });
}
