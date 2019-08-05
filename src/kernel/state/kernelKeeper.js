import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import makeVatKeeper from './vatKeeper';
import makeDeviceKeeper from './deviceKeeper';

// This holds all the kernel state, including that of each Vat and Device, in
// a single JSON-serializable object. At any moment (well, really only
// between turns) we might be asked for it as a string. This same string may
// be used as the 'initialState' argument of some future makeKernelKeeper()
// call, and that future instance should behave identically to this one.

function makeKernelKeeper(initialState) {
  const state = JSON.parse(`${initialState}`);

  function getInitialized() {
    return state.hasOwnProperty('initialized');
  }

  function setInitialized() {
    state.initialized = true;
  }

  function createStartingKernelState() {
    state.vats = {};
    state.devices = {};
    state.runQueue = [];
    state.kernelPromises = {};
    state.nextPromiseIndex = 40;
  }


  function addKernelPromise(deciderVatID) {
    function allocateNextPromiseIndex() {
      const id = state.nextPromiseIndex;
      state.nextPromiseIndex = id + 1;
      return id;
    }
    const kernelPromiseID = allocateNextPromiseIndex();

    const kernelPromiseObj = {
      state: 'unresolved',
      decider: deciderVatID,
      queue: [],
      subscribers: [],
    };

    state.kernelPromises[kernelPromiseID] = kernelPromiseObj;
    return kernelPromiseID;
  }

  function getKernelPromise(kernelPromiseID) {
    const p = state.kernelPromises[Nat(kernelPromiseID)];
    if (p === undefined) {
      throw new Error(`unknown kernelPromise id '${kernelPromiseID}'`);
    }
    return p;
  }

  function hasKernelPromise(kernelPromiseID) {
    return state.kernelPromises.hasOwnProperty(Nat(kernelPromiseID));
  }

  function deleteKernelPromiseData(kernelPromiseID) {
    delete state.kernelPromises[Nat(kernelPromiseID)];
  }

  function addSubscriberToPromise(kernelPromiseID, vatID) {
    const p = state.kernelPromises[Nat(kernelPromiseID)];
    if (p === undefined) {
      throw new Error(`unknown kernelPromise id '${kernelPromiseID}'`);
    }
    const s = p.subscribers;
    const subscribersSet = new Set(s.subscribers);
    subscribersSet.add(vatID);
    p.subscribersSet = Array.from(subscribersSet);
  }

  function getSubscribers(kernelPromiseID) {
    const p = state.kernelPromises[Nat(kernelPromiseID)];
    return new Set(p.subscribers);
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
    return makeVatKeeper(vatState);
  }

  function createVat(vatID) {
    if (vatID in state.vats) {
      throw new Error(`vatID '${vatID}' already exists in state.vats`);
    }
    const vatState = {};
    state.vats[`${vatID}`] = vatState;
    const vk = makeVatKeeper(vatState);
    vk.createStartingVatState();
    return vk;
  }

  function getAllVatNames() {
    return Object.getOwnPropertyNames(state.vats);
  }


  // deviceID must already exist
  function getDevice(deviceID) {
    const deviceState = state.devices[deviceID];
    if (deviceState === undefined) {
      throw new Error(`unknown deviceID id '${deviceID}'`);
    }
    return makeDeviceKeeper(deviceState);
  }

  function createDevice(deviceID) {
    if (deviceID in state.devices) {
      throw new Error(`deviceID '${deviceID}' already exists in state.devices`);
    }
    const deviceState = {};
    state.devices[`${deviceID}`] = deviceState;
    const dk = makeDeviceKeeper(deviceState);
    dk.createStartingDeviceState();
    return dk;
  }

  function getAllDeviceNames() {
    return Object.getOwnPropertyNames(state.devices);
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

    const vats = state.vats;

    for (const vatID of Object.getOwnPropertyNames(vats)) {
      const vk = getVat(vatID);

      // TODO: find some way to expose the liveSlots internal tables, the
      // kernel doesn't see them
      const vatTable = {
        vatID,
        state: { transcript: vk.getTranscript() },
      };
      vatTables.push(vatTable);
      vk.dumpState(vatID).forEach(e => kernelTable.push(e));
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

    const kernelPromises = state.kernelPromises;
    Object.getOwnPropertyNames(kernelPromises).forEach(id => {
      const p = kernelPromises[id];
      const kp = { id: Number(id) };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      const subscribers = getSubscribers(kp.id);
      if (subscribers) {
        kp.subscribers = Array.from(subscribers);
      }
      promises.push(kp);
    });

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

    addKernelPromise,
    getKernelPromise,
    hasKernelPromise,
    deleteKernelPromiseData,
    addSubscriberToPromise,
    getSubscribers,

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
