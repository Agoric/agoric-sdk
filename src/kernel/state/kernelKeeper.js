import harden from '@agoric/harden';
import makeVatKeeper from './vatKeeper';
import makeDeviceKeeper from './deviceKeeper';
import { insistKernelType, makeKernelSlot } from '../parseKernelSlots';

// This holds all the kernel state, including that of each Vat and Device, in
// a single JSON-serializable object. At any moment (well, really only
// between turns) we might be asked for it as a string. This same string may
// be used as the 'initialState' argument of some future makeKernelKeeper()
// call, and that future instance should behave identically to this one.

function makeKernelKeeper(initialState) {
  const state = JSON.parse(`${initialState}`);

  function getInitialized() {
    return !!Object.getOwnPropertyDescriptor(state, 'initialized');
  }

  function setInitialized() {
    state.initialized = true;
  }

  function createStartingKernelState() {
    state.vats = {};
    state.devices = {};
    state.runQueue = [];
    state.kernelObjects = {}; // kernelObjects[koNN] = { owner: vatID }
    state.nextObjectIndex = 20;
    state.kernelDevices = {}; // kernelDevices[kdNN] = { owner: vatID }
    state.nextDeviceIndex = 30;
    state.kernelPromises = {}; // kernelPromises[kpNN] = {..}
    state.nextPromiseIndex = 40;
  }

  function addKernelObject(ownerVatID) {
    const id = state.nextObjectIndex;
    state.nextObjectIndex = id + 1;
    const s = makeKernelSlot('object', id);
    state.kernelObjects[s] = harden({
      owner: ownerVatID,
    });
    return s;
  }

  function ownerOfKernelObject(kernelSlot) {
    insistKernelType('object', kernelSlot);
    return state.kernelObjects[kernelSlot].owner;
  }

  function addKernelDevice(deviceName) {
    const id = state.nextDeviceIndex;
    state.nextDeviceIndex = id + 1;
    const s = makeKernelSlot('device', id);
    state.kernelDevices[s] = harden({
      owner: deviceName,
    });
    return s;
  }

  function ownerOfKernelDevice(kernelSlot) {
    insistKernelType('device', kernelSlot);
    return state.kernelDevices[kernelSlot].owner;
  }

  function addKernelPromise(deciderVatID) {
    const kernelPromiseID = state.nextPromiseIndex;
    state.nextPromiseIndex = kernelPromiseID + 1;
    const s = makeKernelSlot('promise', kernelPromiseID);

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
      fulfillSlot: targetSlot,
    });
  }

  function fulfillKernelPromiseToData(kernelSlot, data, slots) {
    insistKernelType('promise', kernelSlot);
    state.kernelPromises[kernelSlot] = harden({
      state: 'fulfilledToData',
      fulfillData: data,
      fulfillSlots: slots,
    });
  }

  function rejectKernelPromise(kernelSlot, val, valSlots) {
    insistKernelType('promise', kernelSlot);
    state.kernelPromises[kernelSlot] = harden({
      state: 'rejected',
      rejectData: val,
      rejectSlots: valSlots,
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

  function addSubscriberToPromise(kernelSlot, vatID) {
    insistKernelType('promise', kernelSlot);
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

  // vatID must already exist
  function getVat(vatID) {
    const vatState = state.vats[vatID];
    if (vatState === undefined) {
      throw new Error(`unknown vatID id '${vatID}'`);
    }
    return makeVatKeeper(vatState, vatID, addKernelObject, addKernelPromise);
  }

  function createVat(vatID) {
    vatID = `${vatID}`;
    if (vatID in state.vats) {
      throw new Error(`vatID '${vatID}' already exists in state.vats`);
    }
    const vatState = {};
    state.vats[vatID] = vatState;
    const vk = makeVatKeeper(
      vatState,
      vatID,
      addKernelObject,
      addKernelPromise,
    );
    vk.createStartingVatState();
    return vk;
  }

  function getAllVatNames() {
    return Object.getOwnPropertyNames(state.vats).sort();
  }

  // deviceID must already exist
  function getDevice(deviceID) {
    const deviceState = state.devices[deviceID];
    if (deviceState === undefined) {
      throw new Error(`unknown deviceID id '${deviceID}'`);
    }
    return makeDeviceKeeper(
      deviceState,
      deviceID,
      addKernelObject,
      addKernelDevice,
    );
  }

  function createDevice(deviceID) {
    deviceID = `${deviceID}`;
    if (deviceID in state.devices) {
      throw new Error(`deviceID '${deviceID}' already exists in state.devices`);
    }
    const deviceState = {};
    state.devices[deviceID] = deviceState;
    const dk = makeDeviceKeeper(
      deviceState,
      deviceID,
      addKernelObject,
      addKernelDevice,
    );
    dk.createStartingDeviceState();
    return dk;
  }

  function getAllDeviceNames() {
    return Object.getOwnPropertyNames(state.devices).sort();
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

    for (const vatID of getAllVatNames()) {
      const vk = getVat(vatID);

      // TODO: find some way to expose the liveSlots internal tables, the
      // kernel doesn't see them
      const vatTable = {
        vatID,
        state: { transcript: vk.getTranscript() },
      };
      vatTables.push(vatTable);
      vk.dumpState().forEach(e => kernelTable.push(e));
    }

    for (const deviceName of getAllDeviceNames()) {
      const dk = getDevice(deviceName);
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

    addToRunQueue,
    isRunQueueEmpty,
    getRunQueueLength,
    getNextMsg,

    getVat,
    createVat,
    getAllVatNames,

    getDevice,
    createDevice,
    getAllDeviceNames,

    getState,
    dump,
  });
}

export default makeKernelKeeper;
