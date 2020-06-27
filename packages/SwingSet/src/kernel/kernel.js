import harden from '@agoric/harden';
import { makeMarshal, Remotable, getInterfaceOf } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';
import { makeMeter } from '@agoric/transform-metering';
import makeVatManager from './vatManager';
import { makeLiveSlots } from './liveSlots';
import { makeDeviceSlots } from './deviceSlots';
import makeDeviceManager from './deviceManager';
import { wrapStorage } from './state/storageWrapper';
import makeKernelKeeper from './state/kernelKeeper';
import { kdebug, kdebugEnable, legibilizeMessageArgs } from './kdebug';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { makeVatSlot, parseVatSlot } from '../parseVatSlots';
import { insistStorageAPI } from '../storageAPI';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';
import { insistDeviceID, insistVatID } from './id';
import { makeMessageResult } from './messageResult';
import { makeDynamicVatCreator } from './dynamicVat';

function abbreviateReviver(_, arg) {
  if (typeof arg === 'string' && arg.length >= 40) {
    // truncate long strings
    return `${arg.slice(0, 15)}...${arg.slice(arg.length - 15)}`;
  }
  return arg;
}

export default function buildKernel(kernelEndowments) {
  const {
    waitUntilQuiescent,
    hostStorage,
    vatEndowments,
    vatAdminVatSetup,
    vatAdminDevSetup,
    replaceGlobalMeter,
    transformMetering,
    transformTildot,
  } = kernelEndowments;
  insistStorageAPI(hostStorage);
  const { enhancedCrankBuffer, commitCrank } = wrapStorage(hostStorage);
  const kernelKeeper = makeKernelKeeper(enhancedCrankBuffer);

  // It is important that tameMetering() was called by application startup,
  // before install-ses. We expect the controller to run tameMetering() again
  // (and rely upon its only-once behavior) to get the control facet
  // (replaceGlobalMeter), and pass it to us through kernelEndowments.

  // TODO: be more clever. Only refill meters that were touched. Use a
  // WeakMap. Drop meters that vats forget. Minimize the fast path. Then wrap
  // more (encapsulate importBundle?) and provide a single sensible thing to
  // vats.
  let complainedAboutGlobalMetering = false;
  const allRefillers = new Set(); // refill() functions
  function makeGetMeter(options = {}) {
    const { refillEachCrank = true, refillIfExhausted = true } = options;

    if (!replaceGlobalMeter && !complainedAboutGlobalMetering) {
      console.error(
        `note: makeGetMeter() cannot enable global metering, app must import @agoric/install-metering-and-ses`,
      );
      // to fix this, your application program must
      // `import('@agoric/install-metering-and-ses')` instead of
      // `import('@agoric/install-ses')`
      complainedAboutGlobalMetering = true;
    }

    // zoe's importBundle(dapp-encouragement contract) causes babel to use
    // about 5.4M computrons and 6.4M allocatrons (total 11.8M) in a single
    // crank, so the default of 1e7 is insufficient
    const FULL = 1e8;
    const { meter, refillFacet } = makeMeter({
      budgetAllocate: FULL,
      budgetCompute: FULL,
    });
    function refill() {
      // console.error(`-- METER REFILL`);
      // console.error(`   allocate used: ${FULL - refillFacet.getAllocateBalance()}`);
      // console.error(`   compute used : ${FULL - refillFacet.getComputeBalance()}`);
      if (meter.isExhausted() && !refillIfExhausted) {
        return;
      }
      refillFacet.allocate();
      refillFacet.compute();
      refillFacet.stack();
    }
    if (refillEachCrank) {
      allRefillers.add(refill);
    }
    let meterUsed = false; // mostly for testing
    function getMeter(dontReplaceGlobalMeter = false) {
      meterUsed = true;
      if (replaceGlobalMeter && !dontReplaceGlobalMeter) {
        replaceGlobalMeter(meter);
      }
      return meter;
    }
    function resetMeterUsed() {
      meterUsed = false;
    }
    function getMeterUsed() {
      return meterUsed;
    }
    function isExhausted() {
      return meter.isExhausted();
    }

    // TODO: this will evolve. For now, we let the caller refill the meter as
    // much as they want, although only tests will do this (normal vats will
    // just rely on refillEachCrank). As this matures, vats will only be able
    // to refill a meter by transferring credits from some other meter, so
    // their total usage limit remains unchanged.
    return harden({
      getMeter,
      isExhausted,
      resetMeterUsed,
      getMeterUsed,
      refillFacet,
      getAllocateBalance: refillFacet.getAllocateBalance,
      getComputeBalance: refillFacet.getComputeBalance,
      getCombinedBalance: refillFacet.getCombinedBalance,
    });
  }
  harden(makeGetMeter);

  function endOfCrankMeterTask() {
    if (replaceGlobalMeter) {
      replaceGlobalMeter(null);
    }
    for (const refiller of allRefillers) {
      refiller();
    }
  }
  harden(endOfCrankMeterTask);

  function runWithoutGlobalMeter(f, ...args) {
    if (!replaceGlobalMeter) {
      return f(...args);
    }
    const oldMeter = replaceGlobalMeter(null);
    try {
      return f(...args);
    } finally {
      replaceGlobalMeter(oldMeter);
    }
  }

  let started = false;
  // this holds externally-added vats, which are present at startup, but not
  // vats that are added later from within the kernel
  const genesisVats = new Map(); // name -> { setup, options }
  // we name this 'genesisDevices' for parallelism, but actually all devices
  // must be present at genesis
  const genesisDevices = new Map(); // name -> { setup, options }

  const ephemeral = {
    vats: new Map(), // vatID -> { manager, enablePipelining }
    devices: new Map(), // deviceID -> { manager }
    log: [],
  };

  const pendingMessageResults = new Map(); // kpid -> messageResult

  // runQueue entries are {type, vatID, more..}. 'more' depends on type:
  // * deliver: target, msg
  // * notifyFulfillToData/notifyFulfillToPresence/notifyReject:
  //   kernelPromiseID

  // in the kernel table, promises and resolvers are both indexed by the same
  // value. kernelPromises[promiseID] = { decider, subscribers }

  function send(target, msg) {
    parseKernelSlot(target);
    insistMessage(msg);
    const m = harden({ type: 'send', target, msg });
    kernelKeeper.incrementRefCount(target, `enq|msg|t`);
    kernelKeeper.incrementRefCount(msg.result, `enq|msg|r`);
    let idx = 0;
    for (const argSlot of msg.args.slots) {
      kernelKeeper.incrementRefCount(argSlot, `enq|msg|s${idx}`);
      idx += 1;
    }
    kernelKeeper.addToRunQueue(m);
  }

  function notify(vatID, kpid) {
    const m = harden({ type: 'notify', vatID, kpid });
    kernelKeeper.incrementRefCount(kpid, `enq|notify`);
    kernelKeeper.addToRunQueue(m);
  }

  function makeError(s) {
    // TODO: create a @qclass=error, once we define those
    // or maybe replicate whatever happens with {}.foo()
    // or 3.foo() etc: "TypeError: {}.foo is not a function"
    return harden({ body: JSON.stringify(s), slots: [] });
  }

  function notifySubscribersAndQueue(kpid, resolvingVatID, subscribers, queue) {
    insistKernelType('promise', kpid);
    for (const vatID of subscribers) {
      if (vatID !== resolvingVatID) {
        notify(vatID, kpid);
      }
    }
    // re-deliver msg to the now-settled promise, which will forward or
    // reject depending on the new state of the promise
    for (const msg of queue) {
      // todo: this is slightly lazy, sending the message back to the same
      // promise that just got resolved. When this message makes it to the
      // front of the run-queue, we'll look up the resolution. Instead, we
      // could maybe look up the resolution *now* and set the correct target
      // early. Doing that might make it easier to remove the Promise Table
      // entry earlier.
      send(kpid, msg);
    }
  }

  function invoke(deviceSlot, method, args) {
    insistKernelType('device', deviceSlot);
    insistCapData(args);
    const deviceID = kernelKeeper.ownerOfKernelDevice(deviceSlot);
    insistDeviceID(deviceID);
    const dev = ephemeral.devices.get(deviceID);
    if (!dev) {
      throw new Error(`unknown deviceRef ${deviceSlot}`);
    }
    return dev.manager.invoke(deviceSlot, method, args);
  }

  function subscribe(vatID, kpid) {
    insistVatID(vatID);
    const p = kernelKeeper.getKernelPromise(kpid);
    if (p.state === 'unresolved') {
      kernelKeeper.addSubscriberToPromise(kpid, vatID);
    } else {
      // otherwise it's already resolved, you probably want to know how
      notify(vatID, kpid);
    }
  }

  function getResolveablePromise(kpid, resolvingVatID) {
    insistKernelType('promise', kpid);
    insistVatID(resolvingVatID);
    const p = kernelKeeper.getKernelPromise(kpid);
    assert(p.state === 'unresolved', details`${kpid} was already resolved`);
    assert(
      p.decider === resolvingVatID,
      details`${kpid} is decided by ${p.decider}, not ${resolvingVatID}`,
    );
    return p;
  }

  function notePendingMessageResolution(kpid, status, resolution) {
    const result = pendingMessageResults.get(kpid);
    pendingMessageResults.delete(kpid);
    result.noteResolution(status, resolution);
  }

  function fulfillToPresence(vatID, kpid, targetSlot) {
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    insistKernelType('object', targetSlot);
    const p = getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    kernelKeeper.fulfillKernelPromiseToPresence(kpid, targetSlot);
    notifySubscribersAndQueue(kpid, vatID, subscribers, queue);
    // todo: some day it'd be nice to delete the promise table entry now. To
    // do that correctly, we must make sure no vats still hold pointers to
    // it, which means vats must drop their refs when they get notified about
    // the resolution ("you knew it was resolved, you shouldn't be sending
    // any more messages to it, send them to the resolution instead"), and we
    // must wait for those notifications to be delivered.
    if (pendingMessageResults.has(kpid)) {
      const data = {
        body: '{"@qclass":"slot",index:0}',
        slots: [targetSlot],
      };
      notePendingMessageResolution(kpid, 'fulfilled', data);
    }
  }

  function fulfillToData(vatID, kpid, data) {
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    insistCapData(data);
    const p = getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    let idx = 0;
    for (const dataSlot of data.slots) {
      kernelKeeper.incrementRefCount(dataSlot, `fulfill|s${idx}`);
      idx += 1;
    }
    kernelKeeper.fulfillKernelPromiseToData(kpid, data);
    notifySubscribersAndQueue(kpid, vatID, subscribers, queue);
    if (pendingMessageResults.has(kpid)) {
      notePendingMessageResolution(kpid, 'fulfilled', data);
    }
  }

  function reject(vatID, kpid, data) {
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    insistCapData(data);
    const p = getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    let idx = 0;
    for (const dataSlot of data.slots) {
      kernelKeeper.incrementRefCount(dataSlot, `reject|s${idx}`);
      idx += 1;
    }
    kernelKeeper.rejectKernelPromise(kpid, data);
    notifySubscribersAndQueue(kpid, vatID, subscribers, queue);
    if (pendingMessageResults.has(kpid)) {
      notePendingMessageResolution(kpid, 'rejected', data);
    }
  }

  // The 'vatPowers' are given to vats as arguments of setup(). They
  // represent controlled authorities that come from the kernel but that do
  // not go through the syscall mechanism (so they aren't included in the
  // replay transcript), so they must not be particularly stateful. If any of
  // them behave differently from one invocation to the next, the vat code
  // which uses it will not be a deterministic function of the transcript,
  // breaking our orthogonal-persistence model. They can have access to
  // state, but they must not let it influence the data they return to the
  // vat.

  // These will eventually be provided by the in-worker supervisor instead.

  // We need to give the vat the correct Remotable and getKernelPromise so
  // that they can access our own @agoric/marshal, not a separate instance in
  // a bundle. TODO: ideally the powerless ones (Remotable, getInterfaceOf,
  // maybe transformMetering) are imported by the vat, not passed in an
  // argument. The powerful one (makeGetMeter) should only be given to the
  // root object, to share with (or withhold from) other objects as it sees
  // fit.
  const vatPowers = harden({
    Remotable,
    getInterfaceOf,
    makeGetMeter,
    transformMetering: (...args) =>
      runWithoutGlobalMeter(transformMetering, ...args),
    transformTildot: (...args) =>
      runWithoutGlobalMeter(transformTildot, ...args),
  });

  // dynamic vats don't get control over their own metering
  const dynamicVatPowers = harden({
    Remotable,
    getInterfaceOf,
    transformTildot: (...args) =>
      runWithoutGlobalMeter(transformTildot, ...args),
  });

  const syscallManager = harden({
    kdebug,
    send,
    invoke,
    subscribe,
    fulfillToPresence,
    fulfillToData,
    reject,
    waitUntilQuiescent,
    endOfCrankMeterTask,
  });

  function vatNameToID(name) {
    const vatID = kernelKeeper.getVatIDForName(name);
    insistVatID(vatID);
    return vatID;
  }

  function deviceNameToID(name) {
    const deviceID = kernelKeeper.getDeviceIDForName(name);
    insistDeviceID(deviceID);
    return deviceID;
  }

  function addImport(forVatID, what) {
    if (!started) {
      throw new Error('must do kernel.start() before addImport()');
      // because otherwise we can't get the vatManager
    }
    insistVatID(forVatID);
    const kernelSlot = `${what}`;
    parseKernelSlot(what);
    const vat = ephemeral.vats.get(forVatID);
    return vat.manager.mapKernelSlotToVatSlot(kernelSlot);
  }

  function addExport(fromVatID, what) {
    if (!started) {
      throw new Error('must do kernel.start() before addExport()');
      // because otherwise we can't get the vatManager
    }
    insistVatID(fromVatID);
    const vatSlot = `${what}`;
    parseVatSlot(vatSlot);
    const vat = ephemeral.vats.get(fromVatID);
    return vat.manager.mapVatSlotToKernelSlot(vatSlot);
  }

  // If `kernelPanic` is set to non-null, vat execution code will throw it as an
  // error at the first opportunity
  let kernelPanic = null;

  function panic(problem) {
    console.error(`##### KERNEL PANIC: ${problem} #####`);
    kernelPanic = new Error(`kernel panic ${problem}`);
  }

  function queueToExport(vatID, vatSlot, method, args, policy = 'ignore') {
    // queue a message on the end of the queue, with 'absolute' kernelSlots.
    // Use 'step' or 'run' to execute it
    vatID = `${vatID}`;
    insistVatID(vatID);
    vatSlot = `${vatSlot}`;
    parseVatSlot(vatSlot);
    method = `${method}`;
    // we can't use insistCapData() here: .slots are from the controller's
    // Realm, not the kernel Realm, so it's the wrong kind of Array
    assert(
      args.slots !== undefined,
      details`args not capdata, no .slots: ${args}`,
    );
    // now we must translate it into a kernel-realm object/array
    args = harden({
      body: `${args.body}`,
      slots: Array.from(args.slots).map(s => `${s}`),
    });
    if (!started) {
      throw new Error('must do kernel.start() before queueToExport()');
    }
    insistCapData(args);
    args.slots.forEach(s => parseKernelSlot(s)); // typecheck

    const resultPromise = kernelKeeper.addKernelPromise();
    const [resultRead, resultWrite] = makeMessageResult(method, policy, panic);
    pendingMessageResults.set(resultPromise, resultWrite);

    const msg = harden({ method, args, result: resultPromise });
    const kernelSlot = addExport(vatID, vatSlot);
    send(kernelSlot, msg);
    return resultRead;
  }

  async function deliverToVat(vatID, target, msg) {
    insistMessage(msg);
    const vat = ephemeral.vats.get(vatID);
    assert(vat, details`unknown vatID ${vatID}`);
    try {
      await vat.manager.deliverOneMessage(target, msg);
    } catch (e) {
      // log so we get a stack trace
      console.error(`error in kernel.deliver:`, e);
      throw e;
    }
  }

  function getKernelResolveablePromise(kpid) {
    insistKernelType('promise', kpid);
    const p = kernelKeeper.getKernelPromise(kpid);
    assert(p.state === 'unresolved', details`${kpid} was already resolved`);
    assert(!p.decider, details`${kpid} is decided by ${p.decider}, not kernel`);
    return p;
  }

  function deliverToError(kpid, errorData) {
    // todo: see if this can be merged with reject()
    insistCapData(errorData);
    const p = getKernelResolveablePromise(kpid);
    const { subscribers, queue } = p;
    kernelKeeper.rejectKernelPromise(kpid, errorData);
    notifySubscribersAndQueue(kpid, undefined, subscribers, queue);
  }

  async function deliverToTarget(target, msg) {
    insistMessage(msg);
    const { type } = parseKernelSlot(target);
    if (type === 'object') {
      const vatID = kernelKeeper.ownerOfKernelObject(target);
      insistVatID(vatID);
      await deliverToVat(vatID, target, msg);
    } else if (type === 'promise') {
      const kp = kernelKeeper.getKernelPromise(target);
      if (kp.state === 'fulfilledToPresence') {
        await deliverToTarget(kp.slot, msg);
      } else if (kp.state === 'redirected') {
        // await deliverToTarget(kp.redirectTarget, msg); // probably correct
        throw new Error('not implemented yet');
      } else if (kp.state === 'fulfilledToData') {
        if (msg.result) {
          const s = `data is not callable, has no method ${msg.method}`;
          await deliverToError(msg.result, makeError(s));
        }
        // todo: maybe log error?
      } else if (kp.state === 'rejected') {
        // TODO would it be simpler to redirect msg.kpid to kp?
        if (msg.result) {
          await deliverToError(msg.result, kp.data);
        }
      } else if (kp.state === 'unresolved') {
        if (!kp.decider) {
          kernelKeeper.addMessageToPromiseQueue(target, msg);
        } else {
          insistVatID(kp.decider);
          const vat = ephemeral.vats.get(kp.decider);
          if (vat.enablePipelining) {
            await deliverToVat(kp.decider, target, msg);
          } else {
            kernelKeeper.addMessageToPromiseQueue(target, msg);
          }
        }
      } else {
        throw new Error(`unknown kernelPromise state '${kp.state}'`);
      }
    } else {
      throw Error(`unable to send() to slot.type ${type}`);
    }
  }

  async function processNotify(message) {
    const { vatID, kpid } = message;
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    const vat = ephemeral.vats.get(vatID);
    assert(vat, details`unknown vatID ${vatID}`);
    const p = kernelKeeper.getKernelPromise(kpid);
    try {
      await vat.manager.deliverOneNotification(kpid, p);
    } catch (e) {
      // log so we get a stack trace
      console.error(`error in kernel.processNotify:`, e);
      throw e;
    }
  }

  function legibilizeMessage(message) {
    if (message.type === 'send') {
      const msg = message.msg;
      const argList = legibilizeMessageArgs(msg.args).join(', ');
      const result = msg.result ? msg.result : 'null';
      return `@${message.target} <- ${msg.method}(${argList}) : @${result}`;
    } else if (message.type === 'notify') {
      return `notify(vatID: ${message.vatID}, kpid: @${message.kpid})`;
    } else {
      return `unknown message type ${message.type}`;
    }
  }

  let processQueueRunning;
  async function processQueueMessage(message) {
    kdebug(`processQ ${JSON.stringify(message)}`);
    kdebug(legibilizeMessage(message));
    if (processQueueRunning) {
      console.error(`We're currently already running at`, processQueueRunning);
      throw Error(`Kernel reentrancy is forbidden`);
    }
    try {
      processQueueRunning = Error('here');
      if (message.type === 'send') {
        kernelKeeper.decrementRefCount(message.target, `deq|msg|t`);
        kernelKeeper.decrementRefCount(message.msg.result, `deq|msg|r`);
        let idx = 0;
        for (const argSlot of message.msg.args.slots) {
          kernelKeeper.decrementRefCount(argSlot, `deq|msg|s${idx}`);
          idx += 1;
        }
        await deliverToTarget(message.target, message.msg);
      } else if (message.type === 'notify') {
        kernelKeeper.decrementRefCount(message.kpid, `deq|notify`);
        await processNotify(message);
      } else {
        throw Error(`unable to process message.type ${message.type}`);
      }
      kernelKeeper.purgeDeadKernelPromises();
      kernelKeeper.saveStats();
      commitCrank();
      kernelKeeper.incrementCrankNumber();
    } finally {
      processQueueRunning = undefined;
    }
  }

  function validateVatSetupFn(setup) {
    harden(setup);
    // 'setup' must be an in-realm function. This test guards against
    // accidents, but not against malice. MarkM thinks there is no reliable
    // way to test this.
    if (!(setup instanceof Function)) {
      throw Error('setup is not an in-realm function');
    }
  }

  function addGenesisVat(name, setup, options = {}) {
    name = `${name}`;
    // for now, we guard against 'options' by treating it as JSON-able data
    options = JSON.parse(JSON.stringify(options));
    // todo: consider having vats indicate 'enablePipelining' during setup(),
    // rather than using options= during kernel.addGenesisVat()
    const knownOptions = new Set(['enablePipelining']);
    for (const k of Object.getOwnPropertyNames(options)) {
      if (!knownOptions.has(k)) {
        throw new Error(`unknown option ${k}`);
      }
    }

    if (started) {
      throw new Error(`addGenesisVat() cannot be called after kernel.start`);
    }
    if (genesisVats.has(name)) {
      throw new Error(`vatID ${name} already added`);
    }
    genesisVats.set(name, { setup, options });
  }

  function addGenesisDevice(name, setup, endowments) {
    console.debug(`kernel.addDevice(${name})`);
    name = `${name}`;
    harden(setup);
    if (!(setup instanceof Function)) {
      throw Error('setup is not an in-realm function');
    }
    if (started) {
      throw new Error(`addDevice() cannot be called after kernel.start`);
    }
    if (genesisDevices.has(name)) {
      throw new Error(`deviceName ${name} already added`);
    }
    genesisDevices.set(name, { setup, endowments });
  }

  function makeVatRootObjectSlot() {
    return makeVatSlot('object', true, 0);
  }

  function callBootstrap(bootstrapVatID, argvString) {
    // we invoke obj[0].bootstrap with an object that contains 'vats' and
    // 'argv'.
    insistVatID(bootstrapVatID);
    const argv = JSON.parse(`${argvString}`);
    // each key of 'vats' will be serialized as a reference to its obj0
    const vrefs = new Map();
    const vatObj0s = {};
    const vatSlot = makeVatRootObjectSlot();
    kernelKeeper.getAllVatNames().forEach(name => {
      const vatID = kernelKeeper.getVatIDForName(name);
      const { manager } = ephemeral.vats.get(vatID);
      // we happen to give _bootstrap to itself, because unit tests that
      // don't have any other vats (bootstrap-only configs) then get a
      // non-empty object as vatObj0s, since an empty object would be
      // serialized as pass-by-presence. It wouldn't make much sense for the
      // bootstrap object to call itself, though.
      const vref = harden({
        toString() {
          return name;
        },
      }); // marker
      vatObj0s[name] = vref;
      const kernelSlot = manager.mapVatSlotToKernelSlot(vatSlot);
      vrefs.set(vref, kernelSlot);
      console.debug(`adding vref ${name} [${vatID}]`);
    });

    const drefs = new Map();
    // we cannot serialize empty objects as pass-by-copy, because we decided
    // to make them pass-by-presence for use as EQ-able markers (eg for
    // Purses). So if we don't have any devices defined, we must add a dummy
    // entry to this object so it will serialize as pass-by-copy. We can
    // remove the dummy entry after we add the 'addVat' device
    const deviceObj0s = { _dummy: 'dummy' };
    kernelKeeper.getAllDeviceNames().forEach(name => {
      const deviceID = kernelKeeper.getDeviceIDForName(name);
      const { manager } = ephemeral.devices.get(deviceID);
      const dref = harden({});
      deviceObj0s[name] = dref;
      const devSlot = makeVatSlot('device', true, 0);
      const kernelSlot = manager.mapDeviceSlotToKernelSlot(devSlot);
      drefs.set(dref, kernelSlot);
      console.debug(`adding dref ${name} [${deviceID}]`);
    });
    if (Object.getOwnPropertyNames(deviceObj0s) === 0) {
      throw new Error('pass-by-copy rules require at least one device');
    }

    function convertValToSlot(val) {
      if (vrefs.has(val)) {
        return vrefs.get(val);
      }
      if (drefs.has(val)) {
        return drefs.get(val);
      }
      console.error(`oops ${val}`, val);
      throw Error('bootstrap got unexpected pass-by-presence');
    }

    const m = makeMarshal(convertValToSlot);
    const args = harden([argv, vatObj0s, deviceObj0s]);
    // queueToExport() takes kernel-refs (ko+NN, kd+NN) in s.slots
    const rootSlot = makeVatRootObjectSlot();
    return queueToExport(
      bootstrapVatID,
      rootSlot,
      'bootstrap',
      m.serialize(args),
      'panic',
    );
  }

  function addVatManager(vatID, name, setup, options = {}) {
    const { enablePipelining = false } = options;
    validateVatSetupFn(setup);
    const helpers = harden({
      vatID: name, // TODO: rename to 'name', update vats to match
      makeLiveSlots,
      log(...args) {
        const rendered = args.map(arg =>
          typeof arg === 'string'
            ? arg
            : JSON.stringify(arg, abbreviateReviver),
        );
        ephemeral.log.push(rendered.join(''));
      },
    });
    // XXX why does 'helpers' exist as a separate bucket of stuff instead of as
    // just more params to makeVatManager?

    // the vatManager invokes setup() to build the userspace image
    const manager = makeVatManager(
      vatID,
      syscallManager,
      setup,
      helpers,
      kernelKeeper,
      kernelKeeper.allocateVatKeeperIfNeeded(vatID),
      vatPowers,
    );
    ephemeral.vats.set(
      vatID,
      harden({
        manager,
        enablePipelining: Boolean(enablePipelining),
      }),
    );
  }

  const createVatDynamically = makeDynamicVatCreator({
    allocateUnusedVatID: kernelKeeper.allocateUnusedVatID,
    vatNameToID,
    vatEndowments,
    dynamicVatPowers,
    addVatManager,
    addExport,
    queueToExport,
  });

  function buildDeviceManager(deviceID, name, setup, endowments) {
    const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
    const helpers = harden({
      name,
      makeDeviceSlots,
      log(str) {
        ephemeral.log.push(`${str}`);
      },
    });

    return makeDeviceManager(
      name,
      syscallManager,
      setup,
      helpers,
      endowments,
      deviceKeeper,
    );
  }

  function collectVatStats(vatID) {
    insistVatID(vatID);
    const vatManager = ephemeral.vats.get(vatID).manager;
    return vatManager.vatStats();
  }

  async function start(bootstrapVatName, argvString) {
    if (started) {
      throw new Error('kernel.start already called');
    }
    started = true;
    const wasInitialized = kernelKeeper.getInitialized();
    console.debug(`wasInitialized = ${wasInitialized}`);

    // if the state is not yet initialized, populate the starting state
    if (!wasInitialized) {
      kernelKeeper.createStartingKernelState();
    }

    // TESTONLY: we condition on vatAdminVatSetup and vatAdminDevSetup because
    // some kernel tests don't care about vats and devices and so don't
    // initialize properly. We should fix those tests.
    if (vatAdminVatSetup) {
      genesisVats.set('vatAdmin', { setup: vatAdminVatSetup, options: {} });
    }

    // instantiate all vats
    for (const name of genesisVats.keys()) {
      const { setup, options } = genesisVats.get(name);
      const vatID = kernelKeeper.allocateVatIDForNameIfNeeded(name);
      console.debug(`Assigned VatID ${vatID} for genesis vat ${name}`);
      addVatManager(vatID, name, setup, options);
    }

    if (vatAdminDevSetup) {
      const params = {
        setup: vatAdminDevSetup,
        endowments: {
          create: createVatDynamically,
          stats: collectVatStats,
          /* terminate */
        },
      };
      genesisDevices.set('vatAdmin', params);
    }

    // instantiate all devices
    for (const name of genesisDevices.keys()) {
      const { setup, endowments: devEndowments } = genesisDevices.get(name);
      const deviceID = kernelKeeper.allocateDeviceIDForNameIfNeeded(name);
      console.debug(`Assigned DeviceID ${deviceID} for genesis device ${name}`);
      ephemeral.devices.set(deviceID, {
        manager: buildDeviceManager(deviceID, name, setup, devEndowments),
      });
    }

    // And enqueue the bootstrap() call. If we're reloading from an
    // initialized state vector, this call will already be in the bootstrap
    // vat's transcript, so we don't re-queue it.
    let bootstrapResult = null;
    if (!wasInitialized && bootstrapVatName) {
      const bootstrapVatID = vatNameToID(bootstrapVatName);
      console.debug(`=> queueing bootstrap()`);
      bootstrapResult = callBootstrap(bootstrapVatID, argvString);
    }

    // if it *was* initialized, replay the transcripts
    if (wasInitialized) {
      console.info('Replaying SwingSet transcripts');
      const oldLength = kernelKeeper.getRunQueueLength();
      for (const vatID of ephemeral.vats.keys()) {
        console.debug(`Replaying transcript of vatID ${vatID}`);
        const vat = ephemeral.vats.get(vatID);
        // eslint-disable-next-line no-await-in-loop
        await vat.manager.replayTranscript();
        console.debug(`finished replaying vatID ${vatID} transcript `);
      }
      const newLength = kernelKeeper.getRunQueueLength();
      if (newLength !== oldLength) {
        throw new Error(
          `replayTranscript added run-queue entries, wasn't supposed to`,
        );
      }
      kernelKeeper.loadStats();
    }

    kernelKeeper.setInitialized();
    kernelKeeper.saveStats();
    commitCrank(); // commit "crank 0"
    kernelKeeper.incrementCrankNumber();
    return bootstrapResult;
  }

  async function step() {
    if (kernelPanic) {
      throw kernelPanic;
    }
    if (!started) {
      throw new Error('must do kernel.start() before step()');
    }
    // process a single message
    if (!kernelKeeper.isRunQueueEmpty()) {
      await processQueueMessage(kernelKeeper.getNextMsg());
      if (kernelPanic) {
        throw kernelPanic;
      }
      return 1;
    } else {
      return 0;
    }
  }

  async function run() {
    if (kernelPanic) {
      throw kernelPanic;
    }
    if (!started) {
      throw new Error('must do kernel.start() before run()');
    }
    let count = 0;
    while (!kernelKeeper.isRunQueueEmpty()) {
      // eslint-disable-next-line no-await-in-loop
      await processQueueMessage(kernelKeeper.getNextMsg());
      if (kernelPanic) {
        throw kernelPanic;
      }
      count += 1;
    }
    return count;
  }

  const kernel = harden({
    // these are meant for the controller
    addGenesisVat,
    addGenesisDevice,
    start,

    step,
    run,

    // the rest are for testing and debugging

    log(str) {
      ephemeral.log.push(`${str}`);
    },

    getStats() {
      return kernelKeeper.getStats();
    },
    dump() {
      // note: dump().log is not deterministic, since log() does not go
      // through the syscall interface (and we replay transcripts one vat at
      // a time, so any log() calls that were interleaved during their
      // original execution will be sorted by vat in the replace). Logs are
      // not kept in the persistent state, only in ephemeral state.
      return { log: ephemeral.log, ...kernelKeeper.dump() };
    },
    kdebugEnable,

    addImport,
    addExport,
    vatNameToID,
    deviceNameToID,
    queueToExport,
  });

  return kernel;
}
