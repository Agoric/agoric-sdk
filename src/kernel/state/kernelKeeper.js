import harden from '@agoric/harden';
import { initializeVatState, makeVatKeeper } from './vatKeeper';
import { initializeDeviceState, makeDeviceKeeper } from './deviceKeeper';
import { insist } from '../../insist';
import { insistKernelType, makeKernelSlot } from '../parseKernelSlots';
import { insistCapData } from '../../capdata';
import { insistVatID, insistDeviceID, makeDeviceID, makeVatID } from '../id';

// This holds all the kernel state, including that of each Vat and Device, in
// a single JSON-serializable object. At any moment (well, really only
// between turns) we might be asked for it as a string. This same string may
// be used as the 'initialState' argument of some future makeKernelKeeper()
// call, and that future instance should behave identically to this one.

// todo: this is temporary, until we replace the state object with proper
// Maps, but that requires the new state-management scheme
function hasOwnProperty(obj, name) {
  return Object.prototype.hasOwnProperty.call(obj, name);
}

function makeKernelKeeper(initialState) {
  const state = JSON.parse(`${initialState}`);

  const ephemeral = harden({
    vatKeepers: new Map(), // vatID -> vatKeeper
    deviceKeepers: new Map(), // deviceID -> deviceKeeper
  });

  function getInitialized() {
    return !!Object.getOwnPropertyDescriptor(state, 'initialized');
  }

  function setInitialized() {
    state.initialized = true;
  }

  function createStartingKernelState() {
    // TODO: fear not, all of this will be replaced by DB lookups
    state.namedVats = {}; // name -> vatID
    state.nextVatID = 1;
    state.vats = {}; // vatID -> { kernelSlotToVatSlot, transcript, .. }

    state.namedDevices = {}; // name -> deviceID
    state.devices = {}; // deviceID -> { kernelSlotToDevSlot, .. }
    state.nextDeviceID = 7;

    state.runQueue = [];
    state.kernelObjects = {}; // kernelObjects[koNN] = { owner: vatID }
    state.nextObjectIndex = 20;
    state.kernelDevices = {}; // kernelDevices[kdNN] = { owner: vatID }
    state.nextDeviceIndex = 30;
    state.kernelPromises = {}; // kernelPromises[kpNN] = {..}
    state.nextPromiseIndex = 40;
  }

  function addKernelObject(ownerID) {
    insistVatID(ownerID);
    const id = state.nextObjectIndex;
    state.nextObjectIndex = id + 1;
    const s = makeKernelSlot('object', id);
    state.kernelObjects[s] = harden({
      owner: ownerID,
    });
    return s;
  }

  function ownerOfKernelObject(kernelSlot) {
    insistKernelType('object', kernelSlot);
    return state.kernelObjects[kernelSlot].owner;
  }

  function addKernelDeviceNode(deviceID) {
    insistDeviceID(deviceID);
    const id = state.nextDeviceIndex;
    state.nextDeviceIndex = id + 1;
    const s = makeKernelSlot('device', id);
    state.kernelDevices[s] = harden({
      owner: deviceID,
    });
    return s;
  }

  function ownerOfKernelDevice(kernelSlot) {
    insistKernelType('device', kernelSlot);
    return state.kernelDevices[kernelSlot].owner;
  }

  function addKernelPromise(deciderVatID) {
    insistVatID(deciderVatID);
    const kpid = state.nextPromiseIndex;
    state.nextPromiseIndex = kpid + 1;
    const s = makeKernelSlot('promise', kpid);

    // we leave this unfrozen, because the queue and subscribers are mutable
    state.kernelPromises[s] = {
      state: 'unresolved',
      decider: deciderVatID,
      queue: [],
      subscribers: [],
    };

    return s;
  }

  function getKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    const p = state.kernelPromises[kernelSlot];
    if (p === undefined) {
      throw new Error(`unknown kernelPromise '${kernelSlot}'`);
    }
    return p;
  }

  function hasKernelPromise(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    return !!Object.getOwnPropertyDescriptor(state.kernelPromises, kernelSlot);
  }

  function fulfillKernelPromiseToPresence(kernelSlot, targetSlot) {
    insistKernelType('promise', kernelSlot);
    state.kernelPromises[kernelSlot] = harden({
      state: 'fulfilledToPresence',
      slot: targetSlot,
    });
  }

  function fulfillKernelPromiseToData(kernelSlot, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    state.kernelPromises[kernelSlot] = harden({
      state: 'fulfilledToData',
      data: capdata,
    });
  }

  function rejectKernelPromise(kernelSlot, capdata) {
    insistKernelType('promise', kernelSlot);
    insistCapData(capdata);
    state.kernelPromises[kernelSlot] = harden({
      state: 'rejected',
      data: capdata,
    });
  }

  function deleteKernelPromiseData(kernelSlot) {
    insistKernelType('promise', kernelSlot);
    delete state.kernelPromises[kernelSlot];
  }

  function addMessageToPromiseQueue(kernelSlot, msg) {
    insistKernelType('promise', kernelSlot);
    const p = state.kernelPromises[kernelSlot];
    if (p === undefined) {
      throw new Error(`unknown kernelPromise '${kernelSlot}'`);
    }
    if (p.state !== 'unresolved') {
      throw new Error(`${kernelSlot} is '${p.state}', not 'unresolved'`);
    }
    p.queue.push(msg);
  }

  function setDecider(kpid, decider) {
    insistVatID(decider);
    const p = getKernelPromise(kpid);
    insist(p.state === 'unresolved', `${kpid} was already resolved`);
    insist(!p.decider, `${kpid} has decider ${p.decider}, not empty`);
    p.decider = decider;
  }

  function clearDecider(kpid) {
    const p = getKernelPromise(kpid);
    insist(p.state === 'unresolved', `${kpid} was already resolved`);
    p.decider = undefined;
  }

  function addSubscriberToPromise(kernelSlot, vatID) {
    insistKernelType('promise', kernelSlot);
    insistVatID(vatID);
    const p = state.kernelPromises[kernelSlot];
    if (p === undefined) {
      throw new Error(`unknown kernelPromise '${kernelSlot}'`);
    }
    const subscribersSet = new Set(p.subscribers);
    subscribersSet.add(vatID);
    p.subscribers = Array.from(subscribersSet);
  }

  function addToRunQueue(msg) {
    state.runQueue.push(msg);
  }

  function isRunQueueEmpty() {
    return state.runQueue.length <= 0;
  }

  function getRunQueueLength() {
    return state.runQueue.length;
  }

  function getNextMsg() {
    return state.runQueue.shift();
  }

  function getVatIDForName(name) {
    insist(name === `${name}`, `${name} is not a string`);
    if (!hasOwnProperty(state.namedVats, name)) {
      throw new Error(`vat name ${name} must exist, but doesn't`);
    }
    return state.namedVats[name];
  }

  function provideVatIDForName(name) {
    insist(name === `${name}`);
    if (!hasOwnProperty(state.namedVats, name)) {
      const index = state.nextVatID;
      state.nextVatID += 1;
      state.namedVats[name] = makeVatID(index);
    }
    return state.namedVats[name];
  }

  function provideVatKeeper(vatID) {
    insistVatID(vatID);
    if (!hasOwnProperty(state.vats, vatID)) {
      const vatState = {};
      initializeVatState(vatID, vatState);
      state.vats[vatID] = vatState;
    }
    if (!ephemeral.vatKeepers.has(vatID)) {
      const vk = makeVatKeeper(
        state.vats[vatID],
        vatID,
        addKernelObject,
        addKernelPromise,
      );
      ephemeral.vatKeepers.set(vatID, vk);
    }
    return ephemeral.vatKeepers.get(vatID);
  }

  function getAllVatIDs() {
    return Array.from(Object.getOwnPropertyNames(state.vats)).sort();
  }

  function getAllVatNames() {
    return Array.from(Object.getOwnPropertyNames(state.namedVats)).sort();
  }

  function getDeviceIDForName(name) {
    insist(name === `${name}`);
    if (!hasOwnProperty(state.namedDevices, name)) {
      throw new Error(`device name ${name} must exist, but doesn't`);
    }
    return state.namedDevices[name];
  }

  function provideDeviceIDForName(name) {
    insist(name === `${name}`);
    if (!hasOwnProperty(state.namedDevices, name)) {
      const index = state.nextDeviceID;
      state.nextDeviceID += 1;
      state.namedDevices[name] = makeDeviceID(index);
    }
    return state.namedDevices[name];
  }

  function provideDeviceKeeper(deviceID) {
    insistDeviceID(deviceID);
    if (!hasOwnProperty(state.devices, deviceID)) {
      const deviceState = {};
      initializeDeviceState(deviceID, deviceState);
      state.devices[deviceID] = deviceState;
    }
    if (!ephemeral.deviceKeepers.has(deviceID)) {
      const dk = makeDeviceKeeper(
        state.devices[deviceID],
        deviceID,
        addKernelDeviceNode,
      );
      ephemeral.deviceKeepers.set(deviceID, dk);
    }
    return ephemeral.deviceKeepers.get(deviceID);
  }

  function getAllDeviceIDs() {
    return Array.from(Object.getOwnPropertyNames(state.devices)).sort();
  }

  function getAllDeviceNames() {
    return Array.from(Object.getOwnPropertyNames(state.namedDevices)).sort();
  }

  // used for persistence. This returns a JSON-serialized string, suitable to
  // be passed back into makeKernelKeeper() as 'initialState'.
  function getState() {
    return JSON.stringify(state);
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
        state: { transcript: vk.getTranscript() },
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

    const { kernelPromises } = state;
    Object.getOwnPropertyNames(kernelPromises).forEach(s => {
      const kp = { id: s };
      const p = kernelPromises[s];
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      if (p.subscribers) {
        kp.subscribers = Array.from(p.subscribers);
      }
      promises.push(kp);
    });
    promises.sort((a, b) => compareNumbers(a.id, b.id));

    const runQueue = Array.from(state.runQueue);

    return {
      vatTables,
      kernelTable,
      promises,
      runQueue,
    };
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
    deleteKernelPromiseData,
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

export default makeKernelKeeper;
