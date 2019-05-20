import harden from '@agoric/harden';

function makeKernelState() {
  const state = {
    log: [],
    vats: harden(new Map()),
    devices: harden(new Map()),
    runQueue: [],
    kernelPromises: harden(new Map()),
    nextPromiseIndex: 40,
  };

  function getNextPromiseIndex() {
    const id = state.nextPromiseIndex;
    state.nextPromiseIndex += 1;
    return id;
  }

  function setNextPromiseIndex(id) {
    state.nextPromiseIndex = id;
  }

  function addKernelPromise(kernelPromiseID, kernelPromiseObj) {
    state.kernelPromises.set(kernelPromiseID, kernelPromiseObj);
  }

  function getKernelPromise(kernelPromiseID) {
    const p = state.kernelPromises.get(kernelPromiseID);
    if (p === undefined) {
      throw new Error(`unknown kernelPromise id '${kernelPromiseID}'`);
    }
    return p;
  }

  function hasKernelPromise(kernelPromiseID) {
    return state.kernelPromises.has(kernelPromiseID);
  }

  function addToRunQueue(msg) {
    state.runQueue.push(msg);
  }

  function addDevice(deviceName, deviceObj) {
    state.devices.set(deviceName, deviceObj);
  }

  function getDevice(deviceName) {
    return state.devices.get(deviceName);
  }

  function hasDevice(deviceName) {
    return state.devices.has(deviceName);
  }

  function addVat(vatID, vatObj) {
    state.vats.set(vatID, vatObj);
  }

  function hasVat(vatID) {
    return state.vats.has(vatID);
  }

  function getVat(vatID) {
    return state.vats.get(vatID);
  }

  function getAllVatNames() {
    return state.vats.keys();
  }

  function getAllVats() {
    return state.vats.entries();
  }

  function getAllDevices() {
    return state.devices.entries();
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

  function log(msg) {
    state.log.push(`${msg}`);
  }

  function dump() {
    const vatTables = [];
    const kernelTable = [];

    state.vats.forEach((vat, vatID) => {
      // TODO: find some way to expose the liveSlots internal tables, the
      // kernel doesn't see them
      const vatTable = { vatID, state: vat.manager.getCurrentState() };
      vatTables.push(vatTable);
      vat.manager.dumpState(vatID).forEach(e => kernelTable.push(e));
    });

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
    state.kernelPromises.forEach((p, id) => {
      const kp = { id };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      if ('subscribers' in p) {
        kp.subscribers = Array.from(p.subscribers); // turn Set into Array
      }
      promises.push(kp);
    });

    return {
      vatTables,
      kernelTable,
      promises,
      runQueue: state.runQueue,
      log: state.log,
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
    state.vats.forEach((vat, vatID) => {
      vatTables[vatID] = { state: vat.manager.getCurrentState() };
      Object.assign(vatTables[vatID], vat.manager.getManagerState());
    });

    const deviceState = {};
    state.devices.forEach((d, deviceName) => {
      deviceState[deviceName] = d.manager.getCurrentState();
    });

    const promises = [];
    state.kernelPromises.forEach((p, id) => {
      const kp = { id };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      if ('subscribers' in p) {
        kp.subscribers = Array.from(p.subscribers); // turn Set into Array
      }
      promises.push(kp);
    });

    return {
      vats: vatTables,
      devices: deviceState,
      runQueue: state.runQueue,
      promises,
      nextPromiseIndex: state.nextPromiseIndex,
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
      addKernelPromise(kp.id, p);
    });
    setNextPromiseIndex(newState.nextPromiseIndex);
  }

  return harden({
    getNextPromiseIndex,
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
    getAllVats,
    getAllDevices,
    isRunQueueEmpty,
    getRunQueueLength,
    getNextMsg,
    setNextPromiseIndex,
    getState,
    loadState,
    log,
  });
}

export default makeKernelState;
