import harden from '@agoric/harden';
import makeVatKeeper from './vatKeeper';
import makeDeviceKeeper from './deviceKeeper';

function makeKernelKeeper(kvstore) {
  // kvstore has set, get, has, delete methods
  // set (key []byte, value []byte)
  // get (key []byte)  => value []byte
  // has (key []byte) => exists bool
  // delete (key []byte)
  // iterator, reverseIterator

  // used by loading state only
  function loadNextPromiseIndex(id) {
    kvstore.set('nextPromiseIndex', id);
  }

  // used by loading state only
  function loadKernelPromise(kernelPromiseID, kernelPromiseObj) {
    const kernelPromises = kvstore.get('kernelPromises');
    kernelPromises.set(kernelPromiseID, kernelPromiseObj);
  }

  function addKernelPromise(kernelPromiseObj) {
    function allocateNextPromiseIndex() {
      const id = kvstore.get('nextPromiseIndex');
      kvstore.set('nextPromiseIndex', id + 1);
      return id;
    }
    const kernelPromiseID = allocateNextPromiseIndex();
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

  function addToRunQueue(msg) {
    const runQueue = kvstore.get('runQueue');
    runQueue.push(msg);
  }

  function addDevice(deviceName, deviceObj) {
    const devices = kvstore.get('devices');
    devices.set(deviceName, deviceObj);
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
    return runQueue.shift();
  }

  function log(msg) {
    const kvstoreLog = kvstore.get('log');
    kvstoreLog.push(msg); // template literal barrier in kernel.js
  }

  // used for debugging and tests
  function dump() {
    const vatTables = [];
    const kernelTable = [];

    const vats = kvstore.get('vats');

    const iter = vats.iterator();

    for (const vatEntry of iter) {
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
    kernelPromises.entries().forEach((p, id) => {
      const kp = { id };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      if ('subscribers' in p) {
        kp.subscribers = Array.from(p.subscribers); // turn Set into Array
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

    const vatIter = vats.iterator();

    for (const vatEntry of vatIter) {
      const { key: vatID, value: vatkvstore } = vatEntry;
      const vatKeeper = makeVatKeeper(vatkvstore);

      vatTables[vatID] = { state: vatKeeper.getCurrentState() };
      Object.assign(vatTables[vatID], vatKeeper.getManagerState());
    }

    const deviceState = {};

    const devices = kvstore.get('devices');
    const deviceIter = devices.iterator();

    for (const { key: deviceName, value: devicekvstore } of deviceIter) {
      const deviceKeeper = makeDeviceKeeper(devicekvstore);
      deviceState[deviceName] = deviceKeeper.getCurrentState();
    }

    const promises = [];

    const kernelPromises = kvstore.get('kernelPromises');
    const kernelPromiseIter = kernelPromises.iterator();

    for (const { key: id, value: p } of kernelPromiseIter) {
      const kp = { id };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      if ('subscribers' in p) {
        kp.subscribers = Array.from(p.subscribers); // turn Set into Array
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
      const vat = getVat(vatID);
      // this shouldn't be doing any syscalls, which is good because we
      // haven't wired anything else up yet
      // eslint-disable-next-line no-await-in-loop
      await vat.manager.loadState(vatData.state);
      vat.manager.loadManagerState(vatData);
    }

    for (const deviceName of Object.getOwnPropertyNames(newState.devices)) {
      const deviceData = newState.devices[deviceName];
      const device = getDevice(deviceName);
      device.manager.loadState(deviceData);
    }

    newState.runQueue.forEach(q => addToRunQueue(q));

    newState.promises.forEach(kp => {
      const p = {};
      Object.getOwnPropertyNames(kp).forEach(name => {
        // eslint-disable-next-line no-empty
        if (name === 'id') {
        } else if (name === 'subscribers') {
          p.subscribers = new Set(kp.subscribers);
        } else {
          p[name] = kp[name];
        }
      });
      loadKernelPromise(kp.id, p);
    });
    loadNextPromiseIndex(newState.nextPromiseIndex);
  }

  return harden({
    addKernelPromise,
    getKernelPromise,
    hasKernelPromise,
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
