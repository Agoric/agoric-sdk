import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { makeLiveSlots } from './liveSlots';
import { QCLASS, makeMarshal } from './marshal';
import makePromise from './makePromise';
import makeVatManager from './vatManager';

export default function buildKernel(kernelEndowments) {
  const { setImmediate } = kernelEndowments;

  const enableKDebug = false;
  function kdebug(...args) {
    if (enableKDebug) {
      console.log(...args);
    }
  }
  const log = [];

  let running = false;

  // 'id' is always a non-negative integer (a Nat)
  // 'slot' is a type(string)+id, plus maybe a vatid (string)
  // * 'relative slot' lacks a vatid because it is implicit
  //    used in syscall.send and dispatch.deliver
  // * 'absolute slot' includes an explicit vatid
  //    used in kernel's runQueue
  // 'slots' is an array of 'slot', in send/deliver
  // 'slotIndex' is an index into 'slots', used in serialized JSON

  // key = `${type}.${toVatID}.${slotID}`
  // vats[vatid] = { imports: { inbound[key] = importID,
  //                            outbound[importID] = slot, },
  //                 nextImportID,
  //                 promises: { inbound[kernelPromiseID] = id,
  //                             outbound[id] = kernelPromiseID, },
  //                 nextPromiseID,
  //                 resolvers: { inbound[kernelPromiseID] = id,
  //                              outbound[id] = kernelPromiseID, },
  //                 nextResolverID,
  //               }
  const vats = harden(new Map());

  // runQueue entries are {type, vatID, more..}. 'more' depends on type:
  // * deliver: target, msg
  // * notifyFulfillToData/notifyFulfillToTarget/notifyReject: kernelPromiseID
  const runQueue = [];

  // in the kernel table, promises and resolvers are both indexed by the same
  // value. kernelPromises[promiseID] = { decider, subscribers }
  const kernelPromises = harden(new Map());
  let nextPromiseIndex = 40;

  function getVat(vatID) {
    const vat = vats.get(vatID);
    if (vat === undefined) {
      throw new Error(`unknown vatID '${vatID}'`);
    }
    return vat;
  }

  function allocateKernelPromiseIndex() {
    const i = nextPromiseIndex;
    nextPromiseIndex += 1;
    return i;
  }

  function allocatePromiseIDForVat(vat) {
    const i = vat.nextPromiseID;
    vat.nextPromiseID += 1;
    return i;
  }

  function allocateResolverIDForVat(vat) {
    const i = vat.nextResolverID;
    vat.nextResolverID += 1;
    return i;
  }

  // we define three types of slot identifiers: inbound, neutral, outbound
  // * outbound is what syscall.send(slots=) contains, it is always scoped to
  //   the sending vat, and the values are {type, id}. 'type' is either
  //   'import' ("my import") or 'export'. Message targets are always imports.
  // * middle is stored in runQueue, and contains {type: export, vatID, slotID}
  // * inbound is passed into deliver(slots=), is always scoped to the
  //   receiving/target vat, and the values are {type, id} where 'type' is
  //   either 'export' (for arguments coming back home) or 'import' for
  //   arguments from other vats
  //
  // * To convert outbound->middle, we look up imports in kernelSlots, and
  //   just append the sending vatID to exports
  //
  // * To convert middle->inbound, we set attach type='export' when the vatID
  //   matches that of the receiving vat, and we look up the others in
  //   kernelSlots (adding one if necessary) to deliver type='import'

  // mapOutbound: convert fromVatID-relative slot to absolute slot. fromVatID
  // just did syscall.send and referenced 'slot' (in an argument, or as the
  // target of a send), what are they talking about?

  function mapOutbound(fromVatID, slot) {
    // kdebug(`mapOutbound ${JSON.stringify(slot)}`);
    const vat = getVat(fromVatID);

    if (slot.type === 'export') {
      // one of fromVatID's exports, so just make the vatID explicit
      Nat(slot.id);
      return { type: 'export', vatID: fromVatID, id: slot.id };
    }

    if (slot.type === 'import') {
      // an import from somewhere else, so look in the sending Vat's table to
      // translate into absolute form
      Nat(slot.id);
      return vat.imports.outbound.get(slot.id);
    }

    if (slot.type === 'promise') {
      Nat(slot.id);
      if (!vat.promises.outbound.has(slot.id)) {
        throw new Error(`unknown promise slot '${slot.id}'`);
      }
      return { type: 'promise', id: vat.promises.outbound.get(slot.id) };
    }

    if (slot.type === 'resolver') {
      Nat(slot.id);
      if (!vat.resolvers.outbound.has(slot.id)) {
        throw new Error(`unknown resolver slot '${slot.id}'`);
      }
      return { type: 'resolver', id: vat.resolvers.outbound.get(slot.id) };
    }

    throw Error(`unknown slot.type '${slot.type}'`);
  }

  function allocateImportIndex(vatID) {
    const vat = getVat(vatID);
    const i = vat.nextImportID;
    vat.nextImportID = i + 1;
    return i;
  }

  // mapInbound: convert from absolute slot to forVatID-relative slot. This
  // is used when building the arguments for dispatch.deliver.
  function mapInbound(forVatID, slot) {
    // kdebug(`mapInbound for ${forVatID} of ${slot}`);
    const vat = getVat(forVatID);

    if (slot.type === 'export') {
      const { vatID, id } = slot;
      Nat(id);

      if (vatID === forVatID) {
        // this is returning home, so it's one of the target's exports
        return { type: 'export', id };
      }

      const m = vat.imports;
      const key = `${slot.type}.${vatID}.${id}`; // ugh javascript
      if (!m.inbound.has(key)) {
        // must add both directions
        const newSlotID = Nat(allocateImportIndex(forVatID));
        // kdebug(` adding ${newSlotID}`);
        m.inbound.set(key, newSlotID);
        m.outbound.set(newSlotID, harden({ type: 'export', vatID, id }));
      }
      return { type: 'import', id: m.inbound.get(key) };
    }

    if (slot.type === 'promise') {
      const kernelPromiseID = slot.id;
      Nat(kernelPromiseID);
      const m = vat.promises;
      if (!m.inbound.has(kernelPromiseID)) {
        const promiseID = Nat(allocatePromiseIDForVat(vat));
        m.inbound.set(kernelPromiseID, promiseID);
        m.outbound.set(promiseID, kernelPromiseID);
      }
      return { type: 'promise', id: m.inbound.get(kernelPromiseID) };
    }

    if (slot.type === 'resolver') {
      const kernelPromiseID = slot.id;
      Nat(kernelPromiseID);
      const m = vat.resolvers;
      if (!m.inbound.has(kernelPromiseID)) {
        const resolverID = Nat(allocateResolverIDForVat(vat));
        kdebug(
          ` mapInbound allocating resID ${resolverID} for kpid ${kernelPromiseID}`,
        );
        m.inbound.set(kernelPromiseID, resolverID);
        m.outbound.set(resolverID, kernelPromiseID);
      }
      return { type: 'resolver', id: m.inbound.get(kernelPromiseID) };
    }

    throw Error(`unknown type '${slot.type}'`);
  }

  /*
  function chaseRedirections(promiseID) {
    let targetID = Nat(promiseID);
    while (true) {
      const p = kernelPromises.get(targetID);
      if (p.state === 'redirected') {
        targetID = Nat(p.redirectedTo);
        continue;
      }
      return targetID;
    }
  }
  */

  function createPromiseWithDecider(deciderVatID) {
    // deciderVatID can be undefined if the promise is "owned" by the kernel
    // (pipelining)
    const kernelPromiseID = allocateKernelPromiseIndex();
    // we don't harden the kernel promise record because it is mutable: it
    // can be replaced when syscall.redirect/fulfill/reject is called
    kernelPromises.set(kernelPromiseID, {
      state: 'unresolved',
      decider: deciderVatID,
      subscribers: new Set(),
      queue: [],
    });
    return kernelPromiseID;
  }

  function makeError(s) {
    // TODO: create a @qclass=error, once we define those
    // or maybe replicate whatever happens with {}.foo()
    // or 3.foo() etc
    return s;
  }

  function send(target, msg) {
    if (target.type === 'export') {
      runQueue.push({ type: 'deliver', vatID: target.vatID, target, msg });
    } else if (target.type === 'promise') {
      const kp = kernelPromises.get(target.id);
      if (kp.state === 'unresolved') {
        kp.queue.push(msg);
      } else if (kp.state === 'fulfilledToData') {
        const s = `data is not callable, has no method ${msg.method}`;
        // eslint-disable-next-line no-use-before-define
        reject(msg.kernelPromiseID, makeError(s), []);
      } else if (kp.state === 'fulfilledToTarget') {
        send(kp.fulfillSlot, msg);
      } else if (kp.state === 'rejected') {
        // TODO would it be simpler to redirect msg.kernelPromiseID to kp?
        // eslint-disable-next-line no-use-before-define
        reject(msg.kernelPromiseID, kp.rejectData, kp.rejectSlots);
      } else if (kp.state === 'redirected') {
        // TODO: shorten as we go
        send({ type: 'promise', id: kp.redirectedTo });
      } else {
        throw new Error(`unknown kernelPromise state '${kp.state}'`);
      }
    } else {
      throw Error(`unable to send() to slot.type ${target.slot}`);
    }
  }

  function notifySubscribersAndQueue(id, p, type) {
    const pslot = { type: 'promise', id };
    for (const subscriberVatID of p.subscribers) {
      runQueue.push({ type, vatID: subscriberVatID, kernelPromiseID: id });
    }
    // re-deliver msg to the now-settled promise, which will forward or
    // reject depending on the new state of the promise
    for (const msg of p.queue) {
      send(pslot, msg);
      // now that we know where the messages can be sent, we know to whom we
      // must subscribe to satisfy their resolvers. This wasn't working
      // correctly, so instead liveSlots just assumes that it must tell the
      // kernel about the resolution for resolver it hears about
      /*
      runQueue.push({
        type: 'subscribe',
        vatID: XXX,
        kernelPromiseID: msg.kernelResolverID,
      }); */
    }
  }

  function fulfillToTarget(id, targetSlot) {
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelPromises.get(id);
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }
    if (targetSlot.type !== 'export') {
      throw new Error(
        `fulfillToTarget() must fulfill to export, not ${targetSlot.type}`,
      );
    }

    p.state = 'fulfilledToTarget';
    p.fulfillSlot = targetSlot;
    notifySubscribersAndQueue(id, p, 'notifyFulfillToTarget');
    delete p.subscribers;
    delete p.decider;
    delete p.queue;
  }

  function fulfillToData(id, data, slots) {
    kdebug(`fulfillToData[${id}] -> ${data} ${JSON.stringify(slots)}`);
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelPromises.get(id);
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }

    p.state = 'fulfilledToData';
    p.fulfillData = data;
    p.fulfillSlots = slots;
    notifySubscribersAndQueue(id, p, 'notifyFulfillToData');
    delete p.subscribers;
    delete p.decider;
    delete p.queue;
  }

  function reject(id, val, valSlots) {
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelPromises.get(id);
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }
    p.state = 'rejected';
    p.rejectData = val;
    p.rejectSlots = valSlots;
    notifySubscribersAndQueue(id, p, 'notifyReject');
    delete p.subscribers;
    delete p.decider;
    delete p.queue;
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

  const syscallManager = {
    kdebug,
    mapOutbound,
    mapInbound,
    createPromiseWithDecider,
    send,
    kernelPromises,
    runQueue,
    fulfillToData,
    fulfillToTarget,
    reject,
    log,
    process,
  };

  function addVat(vatID, setup) {
    if (vats.has(vatID)) {
      throw new Error(`already have a vat named '${vatID}'`);
    }
    const helpers = harden({
      vatID,
      makeLiveSlots,
      log(str) {
        log.push(`${str}`);
      },
    });
    // the vatManager invokes setup() to build the userspace image
    const manager = makeVatManager(vatID, syscallManager, setup, helpers);
    // the vat record is not hardened: it holds mutable next-ID values
    vats.set(vatID, {
      id: vatID,
      manager,
      imports: harden({
        outbound: new Map(),
        inbound: new Map(),
      }),
      // make these IDs start at different values to detect errors better
      nextImportID: 10,
      promises: harden({
        outbound: new Map(),
        inbound: new Map(),
      }),
      nextPromiseID: 20,
      resolvers: harden({
        outbound: new Map(),
        inbound: new Map(),
      }),
      nextResolverID: 30,
    });
  }

  function addImport(forVatID, what) {
    return mapInbound(forVatID, what);
  }

  function mapQueueSlotToKernelRealm(s) {
    if (s.type === 'export') {
      return harden({
        type: `${s.type}`,
        vatID: `${s.vatID}`,
        id: Nat(s.id),
      });
    }
    throw Error(`unrecognized type '${s.type}'`);
  }

  function queueToExport(vatID, facetID, method, argsString, slots = []) {
    // queue a message on the end of the queue, with 'absolute' slots. Use
    // 'step' or 'run' to execute it
    runQueue.push(
      harden({
        vatID: `${vatID}`,
        type: 'deliver',
        target: {
          type: 'export',
          vatID: `${vatID}`,
          id: Nat(facetID),
        },
        msg: {
          method: `${method}`,
          argsString: `${argsString}`,
          // queue() is exposed to the controller's realm, so we must translate
          // each slot into a kernel-realm object/array
          slots: Array.from(slots.map(mapQueueSlotToKernelRealm)),
          kernelResolverID: undefined,
        },
      }),
    );
  }

  function processQueueMessage(message) {
    kdebug(`processQ ${JSON.stringify(message)}`);
    const vat = vats.get(message.vatID);
    if (vat === undefined) {
      throw new Error(
        `unknown vatID in target ${JSON.stringify(
          message,
        )}, have ${JSON.stringify(Array.from(vats.keys()))}`,
      );
    }
    const { manager } = vat;
    return manager.processOneMessage(message);
  }

  function callBootstrap(vatID, argvString) {
    const argv = JSON.parse(`${argvString}`);
    // each key of 'vats' will be serialized as a reference to its obj0
    const vrefs = new Map();
    const vatObj0s = {};
    Array.from(vats.entries()).forEach(e => {
      const targetVatID = e[0];
      // we happen to give _bootstrap to itself, because unit tests that
      // don't have any other vats (bootstrap-only configs) then get a
      // non-empty object as vatObj0s, since an empty object would be
      // serialized as pass-by-presence. It wouldn't make much sense for the
      // bootstrap object to call itself, though.
      const vref = harden({}); // marker
      vatObj0s[targetVatID] = vref;
      vrefs.set(vref, { type: 'export', vatID: targetVatID, id: 0 });
    });

    function serializeSlot(vref, slots, slotMap) {
      if (!vrefs.has(vref)) {
        console.log(`oops ${vref}`, vref);
        throw Error('bootstrap got unexpected pass-by-presence');
      }
      if (!slotMap.has(vref)) {
        const slotIndex = slots.length;
        slots.push(vrefs.get(vref));
        slotMap.set(vref, slotIndex);
      }
      const slotIndex = slotMap.get(vref);
      return harden({ [QCLASS]: 'slot', index: slotIndex });
    }
    const m = makeMarshal(serializeSlot);
    const s = m.serialize(harden({ args: [argv, vatObj0s] }));
    // queueToExport() takes 'neutral' { type: export, vatID, slotID } objects in s.slots
    queueToExport(vatID, 0, 'bootstrap', s.argsString, s.slots);
  }

  function dump() {
    const vatTables = [];
    const kernelTable = [];

    vats.forEach((vat, vatID) => {
      // TODO: find some way to expose the liveSlots internal tables, the
      // kernel doesn't see them
      const vatTable = { vatID, state: vat.manager.getCurrentState() };
      vatTables.push(vatTable);

      vat.imports.outbound.forEach((target, slot) => {
        kernelTable.push([
          vatID,
          'import',
          slot,
          target.type,
          target.vatID,
          target.id,
        ]);
      });

      vat.promises.outbound.forEach((kernelPromiseID, id) => {
        kernelTable.push([vatID, 'promise', id, kernelPromiseID]);
      });

      vat.resolvers.outbound.forEach((kernelPromiseID, id) => {
        kernelTable.push([vatID, 'resolver', id, kernelPromiseID]);
      });
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
    kernelPromises.forEach((p, id) => {
      const kp = { id };
      Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
      if ('subscribers' in p) {
        kp.subscribers = Array.from(p.subscribers); // turn Set into Array
      }
      promises.push(kp);
    });

    return { vatTables, kernelTable, promises, runQueue, log };
  }

  const kernel = harden({
    addVat(vatID, setup) {
      harden(setup);
      // 'setup' must be an in-realm function. This test guards against
      // accidents, but not against malice. MarkM thinks there is no reliable
      // way to test this.
      if (!(setup instanceof Function)) {
        throw Error('setup is not an in-realm function');
      }
      addVat(`${vatID}`, setup);
    },

    callBootstrap,

    addImport,

    log(str) {
      log.push(`${str}`);
    },

    dump,

    async run() {
      // process all messages, until syscall.pause() is invoked
      running = true;
      while (running && runQueue.length) {
        // eslint-disable-next-line no-await-in-loop
        await processQueueMessage(runQueue.shift());
      }
    },

    async drain() {
      // process all existing messages, but stop before processing new ones
      running = true;
      let remaining = runQueue.length;
      while (running && remaining) {
        // eslint-disable-next-line no-await-in-loop
        await processQueueMessage(runQueue.shift());
        remaining -= 1;
      }
    },

    async step() {
      // process a single message
      if (runQueue.length) {
        await processQueueMessage(runQueue.shift());
      }
    },

    getState() {
      // return a JSON-serializable data structure which can be passed back
      // into kernel.loadState() to replay the transcripts and bring all vats
      // back to their earlier configuration

      // TODO: sort the tables to minimize the delta when a turn only changes
      // a little bit. In the long run, we'll expose a mutation-sensing tree
      // to the vats, so we can identify directly what they looked at and
      // what they changed. For now, we just assume they look at and modify
      // everything

      const vatTables = {};
      vats.forEach((vat, vatID) => {
        vatTables[vatID] = {
          nextImportID: vat.nextImportID,
          imports: {
            outbound: Array.from(vat.imports.outbound.entries()),
            inbound: Array.from(vat.imports.inbound.entries()),
          },

          nextPromiseID: vat.nextPromiseID,
          promises: {
            outbound: Array.from(vat.promises.outbound.entries()),
            inbound: Array.from(vat.promises.inbound.entries()),
          },

          nextResolverID: vat.nextResolverID,
          resolvers: {
            outbound: Array.from(vat.resolvers.outbound.entries()),
            inbound: Array.from(vat.resolvers.inbound.entries()),
          },

          state: vat.manager.getCurrentState(),
        };
      });

      const promises = [];
      kernelPromises.forEach((p, id) => {
        const kp = { id };
        Object.defineProperties(kp, Object.getOwnPropertyDescriptors(p));
        if ('subscribers' in p) {
          kp.subscribers = Array.from(p.subscribers); // turn Set into Array
        }
        promises.push(kp);
      });

      return {
        vats: vatTables,
        runQueue,
        promises,
        nextPromiseIndex,
      };
    },

    async loadState(state) {
      // discard our previous state: assume that no vats have been allowed to
      // run yet
      if (runQueue.length) {
        throw new Error(`cannot loadState: runQueue is not empty`);
      }

      for (const vatID of Object.getOwnPropertyNames(state.vats)) {
        const vatData = state.vats[vatID];
        // for now, you can only load the state of vats which were present at
        // startup. In the future we'll have dynamically-created vats
        if (!vats.has(vatID)) {
          throw new Error('dynamically-created vats not yet supported');
        }
        const vat = vats.get(vatID);
        if (
          vat.imports.outbound.size ||
          vat.imports.inbound.size ||
          vat.promises.inbound.size ||
          vat.promises.inbound.size ||
          vat.resolvers.inbound.size ||
          vat.resolvers.inbound.size
        ) {
          throw new Error(`vat[$vatID] is not empty, cannot loadState`);
        }

        vat.nextImportID = vatData.nextImportID;
        vatData.imports.outbound.forEach(kv =>
          vat.imports.outbound.set(kv[0], kv[1]),
        );
        vatData.imports.inbound.forEach(kv =>
          vat.imports.inbound.set(kv[0], kv[1]),
        );

        vat.nextPromiseID = vatData.nextPromiseID;
        vatData.promises.outbound.forEach(kv =>
          vat.promises.outbound.set(kv[0], kv[1]),
        );
        vatData.promises.inbound.forEach(kv =>
          vat.promises.inbound.set(kv[0], kv[1]),
        );

        vat.nextResolverID = vatData.nextResolverID;
        vatData.resolvers.outbound.forEach(kv =>
          vat.resolvers.outbound.set(kv[0], kv[1]),
        );
        vatData.resolvers.inbound.forEach(kv =>
          vat.resolvers.inbound.set(kv[0], kv[1]),
        );

        // this shouldn't be doing any syscalls, which is good because we
        // haven't wired anything else up yet
        // eslint-disable-next-line no-await-in-loop
        await vat.manager.loadState(vatData.state);
      }

      state.runQueue.forEach(q => runQueue.push(q));

      state.promises.forEach(kp => {
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
        kernelPromises.set(kp.id, p);
      });
      // eslint-disable-next-line prefer-destructuring
      nextPromiseIndex = state.nextPromiseIndex;
    },

    queueToExport,
  });

  return kernel;
}
