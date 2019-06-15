import harden from '@agoric/harden';
import makeVatKeeper from './vatKeeper';
import makeDeviceKeeper from './deviceKeeper';

function makeKernelKeeper(kvstore, pathToRoot, makeExternalKVStore, external) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

  function getInitialized() {
    return kvstore.has('initialized');
  }

  function setInitialized() {
    kvstore.set('initialized', true);
  }

  function createStartingKernelState() {
    kvstore.set('vats', makeExternalKVStore(pathToRoot, external));
    kvstore.set('devices', makeExternalKVStore(pathToRoot, external));
    kvstore.set('runQueue', []);
    kvstore.set('kernelPromises', makeExternalKVStore(pathToRoot, external));
    kvstore.set('nextPromiseIndex', 40);
  }

  function addKernelPromise(deciderVatID) {
    function allocateNextPromiseIndex() {
      const id = kvstore.get('nextPromiseIndex');
      kvstore.set('nextPromiseIndex', id + 1);
      return id;
    }
    const kernelPromiseID = allocateNextPromiseIndex();

    const kernelPromiseObj = harden({
      state: 'unresolved',
      decider: deciderVatID,
      queue: [],
      subscribers: [],
    });

    const kernelPromises = kvstore.get('kernelPromises');
    kernelPromises.set(`${kernelPromiseID}`, kernelPromiseObj);
    return kernelPromiseID;
  }

  function getKernelPromise(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const p = kernelPromises.get(`${kernelPromiseID}`);
    if (p === undefined) {
      throw new Error(`unknown kernelPromise id '${kernelPromiseID}'`);
    }
    return p;
  }

  function hasKernelPromise(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    return kernelPromises.has(`${kernelPromiseID}`);
  }

  function deleteKernelPromiseData(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(`${kernelPromiseID}`);
    delete kernelPromise.subscribers;
    delete kernelPromise.decider;
    delete kernelPromise.queue;
    // re-save
    kernelPromises.set(`${kernelPromiseID}`, kernelPromise);
  }

  function updateKernelPromise(kernelPromiseID, kernelPromise) {
    const kernelPromises = kvstore.get('kernelPromises');
    kernelPromises.set(`${kernelPromiseID}`, kernelPromise);
  }

  function addSubscriberToPromise(kernelPromiseID, vatID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(`${kernelPromiseID}`);
    const subscribersSet = new Set(kernelPromise.subscribers);
    subscribersSet.add(vatID);
    kernelPromise.subscribers = Array.from(subscribersSet);
    // re-save
    kernelPromises.set(`${kernelPromiseID}`, kernelPromise);
  }

  function getSubscribers(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(`${kernelPromiseID}`);
    return new Set(kernelPromise.subscribers);
  }

  function addToRunQueue(msg) {
    const runQueue = kvstore.get('runQueue');
    runQueue.push(msg);
    kvstore.set('runQueue', runQueue);
  }

  function addDevice(deviceName, deviceKVStore) {
    const devices = kvstore.get('devices');
    devices.set(deviceName, deviceKVStore);
  }

  function getDevice(deviceName) {
    const devices = kvstore.get('devices');
    return devices.get(deviceName);
  }

  function hasDevice(deviceName) {
    const devices = kvstore.get('devices');
    return devices.has(deviceName);
  }

  function addVat(vatID, vatObj) {
    const vats = kvstore.get('vats');
    vats.set(vatID, vatObj);
  }

  function hasVat(vatID) {
    const vats = kvstore.get('vats');
    return vats.has(vatID);
  }

  function getVat(vatID) {
    const vats = kvstore.get('vats');
    return vats.get(vatID);
  }

  function getAllVatNames() {
    const vats = kvstore.get('vats');
    return vats.keys();
  }

  function getAllDeviceNames() {
    const devices = kvstore.get('devices');
    return devices.keys();
  }

  function isRunQueueEmpty() {
    const runQueue = kvstore.get('runQueue');
    return runQueue.length <= 0;
  }

  function getRunQueueLength() {
    const runQueue = kvstore.get('runQueue');
    return runQueue.length;
  }

  function getNextMsg() {
    const runQueue = kvstore.get('runQueue');
    const msg = runQueue.shift();
    kvstore.set('runQueue', runQueue);
    return msg;
  }

  // used for debugging and tests
  function dump() {
    const vatTables = [];
    const kernelTable = [];

    const vats = kvstore.get('vats');

    for (const vatEntry of vats.entries()) {
      const { key: vatID, value: vatkvstore } = vatEntry;

      const vatKeeper = makeVatKeeper(vatkvstore);

      // TODO: find some way to expose the liveSlots internal tables, the
      // kernel doesn't see them
      const vatTable = { vatID, state: { transcript: vatKeeper.getTranscript() } };
      vatTables.push(vatTable);
      vatKeeper.dumpState(vatID).forEach(e => kernelTable.push(e));
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

    const kernelPromises = kvstore.get('kernelPromises');
    kernelPromises.entries().forEach(entry => {
      const { key: id, value: p } = entry;
      const kp = { id: Number(id) };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      const subscribers = getSubscribers(kp.id);
      if (subscribers) {
        kp.subscribers = Array.from(subscribers);
      }
      promises.push(kp);
    });

    const runQueue = kvstore.get('runQueue');

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
    updateKernelPromise,
    addSubscriberToPromise,
    getSubscribers,
    addToRunQueue,
    dump,
    addDevice,
    getDevice,
    hasDevice,
    addVat,
    hasVat,
    getVat,
    getAllVatNames,
    getAllDeviceNames,
    isRunQueueEmpty,
    getRunQueueLength,
    getNextMsg,
  });
}

export default makeKernelKeeper;
