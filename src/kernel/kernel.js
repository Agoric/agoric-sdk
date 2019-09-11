import harden from '@agoric/harden';
import { QCLASS, makeMarshal } from '@agoric/marshal';

import { makeLiveSlots } from './liveSlots';
import { makeDeviceSlots } from './deviceSlots';
import makePromise from '../makePromise';
import makeVatManager from './vatManager';
import makeDeviceManager from './deviceManager';
import makeKernelKeeper from './state/kernelKeeper';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { makeVatSlot } from '../parseVatSlots';
import { insist } from '../insist';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';

function abbreviateReviver(_, arg) {
  if (typeof arg === 'string' && arg.length >= 40) {
    // truncate long strings
    return `${arg.slice(0, 15)}...${arg.slice(arg.length - 15)}`;
  }
  return arg;
}

export default function buildKernel(kernelEndowments, initialState = '{}') {
  const { setImmediate } = kernelEndowments;

  const kernelKeeper = makeKernelKeeper(initialState);

  let started = false;
  // this holds externally-added vats, which are present at startup, but not
  // vats that are added later from within the kernel
  const genesisVats = new Map(); // vatID -> { setup, options }
  // we name this 'genesisDevices' for parallelism, but actually all devices
  // must be present at genesis
  const genesisDevices = new Map();

  const ephemeral = {
    vats: new Map(),
    devices: new Map(),
    log: [],
  };

  const enableKDebug = false;
  function kdebug(...args) {
    if (enableKDebug) {
      console.log(...args);
    }
  }

  let running = false;

  // runQueue entries are {type, vatID, more..}. 'more' depends on type:
  // * deliver: target, msg
  // * notifyFulfillToData/notifyFulfillToPresence/notifyReject:
  //   kernelPromiseID

  // in the kernel table, promises and resolvers are both indexed by the same
  // value. kernelPromises[promiseID] = { decider, subscribers }

  function makeError(s) {
    // TODO: create a @qclass=error, once we define those
    // or maybe replicate whatever happens with {}.foo()
    // or 3.foo() etc: "TypeError: {}.foo is not a function"
    return harden({ body: JSON.stringify(s), slots: [] });
  }

  function notifySubscribersAndQueue(kpid, subscribers, queue) {
    insistKernelType('promise', kpid);
    for (const vatID of subscribers) {
      kernelKeeper.addToRunQueue(
        harden({
          type: 'notify',
          vatID,
          kpid,
        }),
      );
    }
    // re-deliver msg to the now-settled promise, which will forward or
    // reject depending on the new state of the promise
    for (const msg of queue) {
      insistMessage(msg);
      // todo: this is slightly lazy, sending the message back to the same
      // promise that just got resolved. When this message makes it to the
      // front of the run-queue, we'll look up the resolution. Instead, we
      // could maybe look up the resolution *now* and set the correct target
      // early. Doing that might make it easier to remove the Promise Table
      // entry earlier.
      kernelKeeper.addToRunQueue(
        harden({
          type: 'send',
          target: kpid,
          msg,
        }),
      );
    }
  }

  async function process(f, then, logerr) {
    // the delivery might cause some number of (native) Promises to be
    // created and resolved, so we use the IO queue to detect when the
    // Promise queue is empty. The IO queue (setImmediate and setTimeout) is
    // lower-priority than the Promise queue on browsers and Node 11, but on
    // Node 10 it is higher. So this trick requires Node 11.
    // https://jsblog.insiderattack.net/new-changes-to-timers-and-microtasks-from-node-v11-0-0-and-above-68d112743eb3

    const { p: queueEmptyP, res } = makePromise();
    setImmediate(() => res());

    // protect f() with promise/then
    Promise.resolve()
      .then(f)
      .then(undefined, logerr);
    await queueEmptyP;
    then();
  }

  function send(target, msg) {
    parseKernelSlot(target);
    insistMessage(msg);
    const m = harden({ type: 'send', target, msg });
    kernelKeeper.addToRunQueue(m);
  }

  function invoke(deviceSlot, method, args) {
    insistKernelType('device', deviceSlot);
    insistCapData(args);
    const deviceName = kernelKeeper.ownerOfKernelDevice(deviceSlot);
    const dev = ephemeral.devices.get(deviceName);
    if (!dev) {
      throw new Error(`unknown deviceRef ${deviceSlot}`);
    }
    return dev.manager.invoke(deviceSlot, method, args);
  }

  function subscribe(vatID, kpid) {
    const p = kernelKeeper.getKernelPromise(kpid);
    if (p.state === 'unresolved') {
      kernelKeeper.addSubscriberToPromise(kpid, vatID);
    } else {
      // otherwise it's already resolved, you probably want to know how
      const m = harden({ type: 'notify', vatID, kpid });
      kernelKeeper.addToRunQueue(m);
    }
  }

  function getResolveablePromise(kpid, resolvingVatID) {
    insistKernelType('promise', kpid);
    const p = kernelKeeper.getKernelPromise(kpid);
    insist(p.state === 'unresolved', `${kpid} was already resolved`);
    insist(
      p.decider === resolvingVatID,
      `${kpid} is decided by ${p.decider}, not ${resolvingVatID}`,
    );
    return p;
  }

  function fulfillToPresence(vatID, kpid, targetSlot) {
    const p = getResolveablePromise(kpid, vatID);
    const { type } = parseKernelSlot(targetSlot);
    insist(
      type === 'object',
      `fulfillToPresence() must fulfill to object, not ${type}`,
    );
    const { subscribers, queue } = p;
    kernelKeeper.fulfillKernelPromiseToPresence(kpid, targetSlot);
    notifySubscribersAndQueue(kpid, subscribers, queue);
    // todo: some day it'd be nice to delete the promise table entry now. To
    // do that correctly, we must make sure no vats still hold pointers to
    // it, which means vats must drop their refs when they get notified about
    // the resolution ("you knew it was resolved, you shouldn't be sending
    // any more messages to it, send them to the resolution instead"), and we
    // must wait for those notifications to be delivered.
  }

  function fulfillToData(vatID, kpid, data) {
    insistCapData(data);
    const p = getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    kernelKeeper.fulfillKernelPromiseToData(kpid, data);
    notifySubscribersAndQueue(kpid, subscribers, queue);
  }

  function reject(vatID, kpid, data) {
    insistCapData(data);
    const p = getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    kernelKeeper.rejectKernelPromise(kpid, data);
    notifySubscribersAndQueue(kpid, subscribers, queue);
  }

  const syscallManager = {
    kdebug,
    process,
    send,
    invoke,
    subscribe,
    fulfillToPresence,
    fulfillToData,
    reject,
  };

  function addImport(forVatID, what) {
    const kernelSlot = `${what}`;
    if (!started) {
      throw new Error('must do kernel.start() before addImport()');
      // because otherwise we can't get the vatManager
    }
    const vat = ephemeral.vats.get(`${forVatID}`);
    return vat.manager.mapKernelSlotToVatSlot(kernelSlot);
  }

  function addExport(fromVatID, what) {
    const vatSlot = `${what}`;
    if (!started) {
      throw new Error('must do kernel.start() before addExport()');
      // because otherwise we can't get the vatManager
    }
    const vat = ephemeral.vats.get(fromVatID);
    return vat.manager.mapVatSlotToKernelSlot(vatSlot);
  }

  function queueToExport(vatID, vatSlot, method, args) {
    // queue a message on the end of the queue, with 'absolute' kernelSlots.
    // Use 'step' or 'run' to execute it
    vatID = `${vatID}`;
    vatSlot = `${vatSlot}`;
    method = `${method}`;
    // we can't use insistCapData() here: .slots are from the controller's
    // Realm, not the kernel Realm, so it's the wrong kind of Array
    insist(args.slots !== undefined, `args not capdata, no .slots: ${args}`);
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
    // we use result=null because this will be json stringified
    const msg = harden({ method, args, result: null });
    insistMessage(msg);
    const kernelSlot = addExport(vatID, vatSlot);
    kernelKeeper.addToRunQueue(
      harden({
        type: 'send',
        target: kernelSlot,
        msg,
      }),
    );
  }

  async function deliverToVat(vatID, target, msg) {
    insistMessage(msg);
    const vat = ephemeral.vats.get(vatID);
    insist(vat, `unknown vatID ${vatID}`);
    try {
      await vat.manager.deliverOneMessage(target, msg);
    } catch (e) {
      // log so we get a stack trace
      console.log(`error in kernel.deliver: ${e} ${e.message}`, e);
      throw e;
    }
  }

  function getKernelResolveablePromise(kpid) {
    insistKernelType('promise', kpid);
    const p = kernelKeeper.getKernelPromise(kpid);
    insist(p.state === 'unresolved', `${kpid} was already resolved`);
    insist(!p.decider, `${kpid} is decided by ${p.decider}, not kernel`);
    return p;
  }

  function deliverToError(kpid, errorData) {
    // todo: see if this can be merged with reject()
    insistCapData(errorData);
    const p = getKernelResolveablePromise(kpid);
    const { subscribers, queue } = p;
    kernelKeeper.rejectKernelPromise(kpid, errorData);
    notifySubscribersAndQueue(kpid, subscribers, queue);
  }

  async function deliverToTarget(target, msg) {
    insistMessage(msg);
    const { type } = parseKernelSlot(target);
    if (type === 'object') {
      const vatID = kernelKeeper.ownerOfKernelObject(target);
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
    const vat = ephemeral.vats.get(vatID);
    insist(vat, `unknown vatID ${vatID}`);
    const p = kernelKeeper.getKernelPromise(kpid);
    try {
      await vat.manager.deliverOneNotification(kpid, p);
    } catch (e) {
      // log so we get a stack trace
      console.log(`error in kernel.processNotify: ${e} ${e.message}`, e);
      throw e;
    }
  }

  async function processQueueMessage(message) {
    kdebug(`processQ ${JSON.stringify(message)}`);
    if (message.type === 'send') {
      await deliverToTarget(message.target, message.msg);
    } else if (message.type === 'notify') {
      await processNotify(message);
    } else {
      throw Error(`unable to process message.type ${message.type}`);
    }
  }

  function callBootstrap(vatID, argvString) {
    // we invoke obj[0].bootstrap with an object that contains 'vats' and
    // 'argv'.
    const argv = JSON.parse(`${argvString}`);
    // each key of 'vats' will be serialized as a reference to its obj0
    const vrefs = new Map();
    const vatObj0s = {};
    kernelKeeper.getAllVatNames().forEach(name => {
      const targetVatID = name;
      const vatManager = ephemeral.vats.get(targetVatID).manager;
      // we happen to give _bootstrap to itself, because unit tests that
      // don't have any other vats (bootstrap-only configs) then get a
      // non-empty object as vatObj0s, since an empty object would be
      // serialized as pass-by-presence. It wouldn't make much sense for the
      // bootstrap object to call itself, though.
      const vref = harden({
        toString() {
          return targetVatID;
        },
      }); // marker
      vatObj0s[targetVatID] = vref;
      const vatSlot = makeVatSlot('object', true, 0);
      const kernelSlot = vatManager.mapVatSlotToKernelSlot(vatSlot);
      vrefs.set(vref, kernelSlot);
      console.log(`adding vref ${targetVatID}`);
    });

    const drefs = new Map();
    // we cannot serialize empty objects as pass-by-copy, because we decided
    // to make them pass-by-presence for use as EQ-able markers (eg for
    // Purses). So if we don't have any devices defined, we must add a dummy
    // entry to this object so it will serialize as pass-by-copy. We can
    // remove the dummy entry after we add the 'addVat' device
    const deviceObj0s = { _dummy: 'dummy' };
    kernelKeeper.getAllDeviceNames().forEach(deviceName => {
      const deviceManager = ephemeral.devices.get(deviceName).manager;
      const dref = harden({});
      deviceObj0s[deviceName] = dref;
      const devSlot = makeVatSlot('device', true, 0);
      const kernelSlot = deviceManager.mapDeviceSlotToKernelSlot(devSlot);
      drefs.set(dref, kernelSlot);
      console.log(`adding dref ${deviceName}`);
    });
    if (Object.getOwnPropertyNames(deviceObj0s) === 0) {
      throw new Error('pass-by-copy rules require at least one device');
    }

    function serializeSlot(ref, slots, slotMap) {
      if (!slotMap.has(ref)) {
        const slotIndex = slots.length;
        if (vrefs.has(ref)) {
          slots.push(vrefs.get(ref));
          slotMap.set(ref, slotIndex);
        } else if (drefs.has(ref)) {
          slots.push(drefs.get(ref));
          slotMap.set(ref, slotIndex);
        } else {
          console.log(`oops ${ref}`, ref);
          throw Error('bootstrap got unexpected pass-by-presence');
        }
      }
      const slotIndex = slotMap.get(ref);
      return harden({ [QCLASS]: 'slot', index: slotIndex });
    }
    const m = makeMarshal(serializeSlot);
    const args = harden([argv, vatObj0s, deviceObj0s]);
    // queueToExport() takes kernel-refs (ko+NN, kd+NN) in s.slots
    const boot0 = makeVatSlot('object', true, 0);
    queueToExport(vatID, boot0, 'bootstrap', m.serialize(args));
  }

  async function start(bootstrapVatID, argvString) {
    if (started) {
      throw new Error('kernel.start already called');
    }
    started = true;
    const wasInitialized = kernelKeeper.getInitialized();
    console.log(`wasInitialized = ${wasInitialized}`);

    // if the state is not yet initialized, populate the starting state
    if (!wasInitialized) {
      kernelKeeper.createStartingKernelState();
    }

    // instantiate all vats and devices
    for (const vatID of genesisVats.keys()) {
      const { setup, options } = genesisVats.get(vatID);
      const helpers = harden({
        vatID,
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

      const vatKeeper = wasInitialized
        ? kernelKeeper.getVat(vatID)
        : kernelKeeper.createVat(vatID);

      // the vatManager invokes setup() to build the userspace image
      const manager = makeVatManager(
        vatID,
        syscallManager,
        setup,
        helpers,
        kernelKeeper,
        vatKeeper,
      );
      ephemeral.vats.set(
        vatID,
        harden({
          manager,
          enablePipelining: Boolean(options.enablePipelining),
        }),
      );
    }

    for (const name of genesisDevices.keys()) {
      const { setup, endowments } = genesisDevices.get(name);
      const helpers = harden({
        name,
        makeDeviceSlots,
        log(str) {
          ephemeral.log.push(`${str}`);
        },
      });

      const deviceKeeper = wasInitialized
        ? kernelKeeper.getDevice(name)
        : kernelKeeper.createDevice(name);

      const manager = makeDeviceManager(
        name,
        syscallManager,
        setup,
        helpers,
        endowments,
        deviceKeeper,
      );
      // the vat record is not hardened: it holds mutable next-ID values
      ephemeral.devices.set(name, {
        manager,
      });
    }

    // and enqueue the bootstrap() call
    if (!wasInitialized && ephemeral.vats.has(bootstrapVatID)) {
      console.log(`=> queueing bootstrap()`);
      callBootstrap(bootstrapVatID, argvString);
    }

    // if it *was* initialized, replay the transcripts
    if (wasInitialized) {
      const oldLength = kernelKeeper.getRunQueueLength();
      for (const vat of ephemeral.vats.values()) {
        // eslint-disable-next-line no-await-in-loop
        await vat.manager.replayTranscript();
      }
      const newLength = kernelKeeper.getRunQueueLength();
      if (newLength !== oldLength) {
        throw new Error(
          `replayTranscript added run-queue entries, wasn't supposed to`,
        );
      }
    }

    kernelKeeper.setInitialized();
  }

  const kernel = harden({
    addGenesisVat(vatID0, setup, options = {}) {
      const vatID = `${vatID0}`;
      harden(setup);
      // 'setup' must be an in-realm function. This test guards against
      // accidents, but not against malice. MarkM thinks there is no reliable
      // way to test this.
      if (!(setup instanceof Function)) {
        throw Error('setup is not an in-realm function');
      }
      // for now, we guard against 'options' by treating it as JSON-able data
      options = JSON.parse(JSON.stringify(options));
      // todo: consider having vats indicate 'enablePipelining' during
      // setup(), rather than using options= during kernel.addVat()
      const knownOptions = new Set(['enablePipelining']);
      for (const k of Object.getOwnPropertyNames(options)) {
        if (!knownOptions.has(k)) {
          throw new Error(`unknown option ${k}`);
        }
      }

      if (started) {
        throw new Error(`addGenesisVat() cannot be called after kernel.start`);
      }
      if (genesisVats.has(vatID)) {
        throw new Error(`vatID ${vatID} already added`);
      }
      genesisVats.set(vatID, { setup, options });
    },

    addGenesisDevice(deviceName, setup, endowments) {
      console.log(`kernel.addDevice(${deviceName})`);
      harden(setup);
      if (!(setup instanceof Function)) {
        throw Error('setup is not an in-realm function');
      }
      if (started) {
        throw new Error(`addDevice() cannot be called after kernel.start`);
      }
      if (genesisDevices.has(deviceName)) {
        throw new Error(`deviceName ${deviceName} already added`);
      }
      genesisDevices.set(deviceName, { setup, endowments });
    },

    addImport,
    addExport,

    log(str) {
      ephemeral.log.push(`${str}`);
    },

    getState() {
      return kernelKeeper.getState();
    },

    dump() {
      const stateDump = kernelKeeper.dump();
      // note: dump().log is not deterministic, since log() does not go
      // through the syscall interface (and we replay transcripts one vat at
      // a time, so any log() calls that were interleaved during their
      // original execution will be sorted by vat in the replace). Logs are
      // not kept in the persistent state, only in ephemeral state.
      stateDump.log = ephemeral.log;
      return stateDump;
    },

    start,

    async run() {
      if (!started) {
        throw new Error('must do kernel.start() before run()');
      }
      // process all messages, until syscall.pause() is invoked
      running = true;
      while (running && !kernelKeeper.isRunQueueEmpty()) {
        // eslint-disable-next-line no-await-in-loop
        await processQueueMessage(kernelKeeper.getNextMsg());
      }
    },

    async step() {
      if (!started) {
        throw new Error('must do kernel.start() before step()');
      }
      // process a single message
      if (!kernelKeeper.isRunQueueEmpty()) {
        await processQueueMessage(kernelKeeper.getNextMsg());
      }
    },

    queueToExport,
  });

  return kernel;
}
