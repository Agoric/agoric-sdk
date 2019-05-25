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

  function createStartingKernelState() {
    kvstore.set('log', []);
    kvstore.set('vats', makeExternalKVStore(pathToRoot, external));
    kvstore.set('devices', makeExternalKVStore(pathToRoot, external));
    kvstore.set('runQueue', []);
    kvstore.set('kernelPromises', makeExternalKVStore(pathToRoot, external));
    kvstore.set('nextPromiseIndex', 40);
  }

  // used by loading state only
  function loadNextPromiseIndex(id) {
    kvstore.set('nextPromiseIndex', id);
  }

  // used by loading state only
  function loadKernelPromise(kernelPromiseID, kernelPromiseObj) {
    const kernelPromises = kvstore.get('kernelPromises');
    kernelPromises.set(kernelPromiseID, kernelPromiseObj);
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
    kernelPromises.set(kernelPromiseID, kernelPromiseObj);
    return kernelPromiseID;
  }

  function getKernelPromise(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const p = kernelPromises.get(kernelPromiseID);
    if (p === undefined) {
      throw new Error(`unknown kernelPromise id '${kernelPromiseID}'`);
    }
    return p;
  }

  function hasKernelPromise(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    return kernelPromises.has(kernelPromiseID);
  }

  function deleteKernelPromiseData(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(kernelPromiseID);
    delete kernelPromise.subscribers;
    delete kernelPromise.decider;
    delete kernelPromise.queue;
    // re-save
    kernelPromises.set(kernelPromiseID, kernelPromise);
  }

  function updateKernelPromise(kernelPromiseID, kernelPromise) {
    const kernelPromises = kvstore.get('kernelPromises');
    kernelPromises.set(kernelPromiseID, kernelPromise);
  }

  function addSubscriberToPromise(kernelPromiseID, vatID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(kernelPromiseID);
    const subscribersSet = new Set(kernelPromise.subscribers);
    subscribersSet.add(vatID);
    kernelPromise.subscribers = Array.from(subscribersSet);
    // re-save
    kernelPromises.set(kernelPromiseID, kernelPromise);
  }

  function getSubscribers(kernelPromiseID) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(kernelPromiseID);
    return new Set(kernelPromise.subscribers);
  }

  function loadSubscribers(kernelPromiseID, subscribersArray) {
    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromise = kernelPromises.get(kernelPromiseID);
    kernelPromise.subscribers = subscribersArray;
    // resave
    kernelPromises.set(kernelPromiseID, kernelPromise);
  }

  function addToRunQueue(msg) {
    console.log(msg);
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

  function log(msg) {
    const kvstoreLog = kvstore.get('log');
    kvstoreLog.push(msg); // template literal barrier in kernel.js
    kvstore.set('log', kvstoreLog);
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
      const vatTable = { vatID, state: vatKeeper.getCurrentState() };
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
    const kvstoreLog = kvstore.get('log');

    return {
      vatTables,
      kernelTable,
      promises,
      runQueue,
      log: kvstoreLog,
    };
  }

  function getState() {
    // return a JSON-serializable data structure which can be passed back
    // into kernel.loadState() to replay the transcripts and bring all vats
    // back to their earlier configuration

    // TODO: sort the tables to minimize the delta when a turn only changes
    // a little bit. In the long run, we'll expose a mutation-sensing tree
    // to the vats, so we can identify directly what they looked at and
    // what they changed. For now, we just assume they look at and modify
    // everything

    const vatTables = {};
    const vats = kvstore.get('vats');

    for (const vatEntry of vats.entries()) {
      const { key: vatID, value: vatkvstore } = vatEntry;
      const vatKeeper = makeVatKeeper(vatkvstore);

      vatTables[vatID] = { state: vatKeeper.getCurrentState() };
      Object.assign(vatTables[vatID], vatKeeper.getManagerState());
    }

    const deviceState = {};

    const devices = kvstore.get('devices');

    for (const { key: deviceName, value: devicekvstore } of devices.entries()) {
      const deviceKeeper = makeDeviceKeeper(devicekvstore);
      deviceState[deviceName] = deviceKeeper.getCurrentState();
    }

    const promises = [];

    const kernelPromises = kvstore.get('kernelPromises');

    for (const { key: id, value: p } of kernelPromises.entries()) {
      const kp = { id };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      const subscribers = getSubscribers(kp.id); // an array
      if (subscribers) {
        kp.subscribers = subscribers;
      }
      promises.push(kp);
    }

    const runQueue = kvstore.get('runQueue');
    const nextPromiseIndex = kvstore.get('nextPromiseIndex');

    return {
      vats: vatTables,
      devices: deviceState,
      runQueue,
      promises,
      nextPromiseIndex,
    };
  }

  async function loadState(newState) {
    // discard our previous state: assume that no vats have been allowed to
    // run yet
    if (!isRunQueueEmpty()) {
      throw new Error(`cannot loadState: runQueue is not empty`);
    }

    for (const vatID of Object.getOwnPropertyNames(newState.vats)) {
      const vatData = newState.vats[vatID];
      // for now, you can only load the state of vats which were present at
      // startup. In the future we'll have dynamically-created vats
      if (!hasVat(vatID)) {
        throw new Error('dynamically-created vats not yet supported');
      }
      const vatkvstore = getVat(vatID);
      const vatKeeper = makeVatKeeper(vatkvstore);

      // this shouldn't be doing any syscalls, which is good because we
      // haven't wired anything else up yet
      // eslint-disable-next-line no-await-in-loop
      // await vatKeeper.loadState(vatData.state);
      vatKeeper.loadManagerState(vatData);
    }

    for (const deviceName of Object.getOwnPropertyNames(newState.devices)) {
      const deviceData = newState.devices[deviceName];
      const devicekvstore = getDevice(deviceName);
      const deviceKeeper = makeDeviceKeeper(devicekvstore);
      deviceKeeper.loadManagerState(deviceData);
    }

    newState.runQueue.forEach(q => addToRunQueue(q));

    newState.promises.forEach(kp => {
      const p = {};
      Object.getOwnPropertyNames(kp).forEach(name => {
        // eslint-disable-next-line no-empty
        if (name === 'id') {
        } else if (name === 'subscribers') {
          loadSubscribers(kp.id, kp.subscribers); // an array
        } else {
          p[name] = kp[name];
        }
      });
      loadKernelPromise(kp.id, p);
    });
    loadNextPromiseIndex(newState.nextPromiseIndex);
  }

  return harden({
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
    getState,
    loadState,
    log,
  });
}

export default makeKernelKeeper;
