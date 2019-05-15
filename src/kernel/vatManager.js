import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function makeVatManager(vatID, syscallManager, setup, helpers) {
  const {
    kdebug,
    createPromiseWithDecider,
    send,
    kernelPromises,
    runQueue,
    fulfillToData,
    fulfillToPresence,
    reject,
    log,
    process,
    invoke,
  } = syscallManager;

  // We use vat-centric terminology here, so "inbound" means "into a vat",
  // generally from the kernel. We also have "comms vats" which use special
  // device access to interact with remote machines: messages from those
  // remote machines are "inbound" into the comms vats. Conversely "outbound"
  // means "out of a vat", usually into the local kernel, but we also use
  // "outbound" to describe the messages a comms vat is sending over a socket
  // or other communications channel.

  // The mapInbound() function is used to translate slot references on the
  // vat->kernel pathway. mapOutbound() is used for kernel->vat.

  // The terms "import" and "export" are also vat-centric. "import" means
  // something a Vat has imported (from the kernel). Imports are tracked in a
  // kernel-side table for each Vat, which is populated by the kernel as a
  // message is delivered. Each import is represented inside the Vat as a
  // Presence (at least when using liveSlots).

  // "exports" are callable objects inside the Vat which it has made
  // available to the kernel (so that other vats can invoke it). The exports
  // table is managed by userspace code inside the vat. The kernel tables map
  // one vat's import IDs to a pair of (exporting vat, vat's export-id) in
  // `vats[vatid].imports.outbound[importID]`. To make sure we use the same
  // importID each time, we also need to keep a reverse table:
  // `vats[vatid].imports.inbound` maps the (exporting-vat, export-id) back
  // to the importID.

  // Comms vats will have their own internal tables to track references
  // shared with other machines. These will have mapInbound/mapOutbound too.
  // A message arriving on a communication channel will pass through the
  // comms vat's mapInbound to figure out which "machine export" is the
  // target, which maps to a "vat import" (coming from the kernel). The
  // arguments might also be machine exports (for arguments that are "coming
  // home"), or more commonly will be new machine imports (for arguments that
  // point to other machines, usually the sending machine). The machine
  // imports will be presented to the kernel as exports of the comms vat.

  // 'id' is always a non-negative integer (a Nat)
  // 'slot' is a type(string)+id, plus maybe a vatid (string)
  // * 'relative slot' lacks a vatid because it is implicit
  //    used in syscall.send and dispatch.deliver
  // * 'absolute slot' includes an explicit vatid
  //    used in kernel's runQueue
  // 'slots' is an array of 'slot', in send/deliver
  // 'slotIndex' is an index into 'slots', used in serialized JSON

  // key = `${type}.${toVatID}.${slotID}`
  // tables = { imports: { inbound[key] = importID,
  //                       outbound[importID] = slot, },
  //            nextImportID,
  //            promises: { inbound[kernelPromiseID] = id,
  //                        outbound[id] = kernelPromiseID, },
  //            nextPromiseID,
  //            resolvers: { inbound[kernelPromiseID] = id,
  //                         outbound[id] = kernelPromiseID, },
  //            nextResolverID,
  //          }

  // per-vat translation tables
  const tables = {
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

    nextDeviceImportID: 40,
    deviceImports: harden({
      outbound: new Map(),
      inbound: new Map(),
    }),
  };

  function allocatePromiseID() {
    const i = tables.nextPromiseID;
    tables.nextPromiseID += 1;
    return i;
  }

  function allocateResolverID() {
    const i = tables.nextResolverID;
    tables.nextResolverID += 1;
    return i;
  }

  function allocateDeviceImportID() {
    const i = tables.nextDeviceImportID;
    tables.nextDeviceImportID += 1;
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

  function mapOutbound(slot) {
    // kdebug(`mapOutbound ${JSON.stringify(slot)}`);
    if (slot.type === 'export') {
      // one of our exports, so just make the vatID explicit
      Nat(slot.id);
      return { type: 'export', vatID, id: slot.id };
    }

    if (slot.type === 'import') {
      // an import from somewhere else, so look in the sending Vat's table to
      // translate into absolute form
      Nat(slot.id);
      return tables.imports.outbound.get(slot.id);
    }

    if (slot.type === 'deviceImport') {
      Nat(slot.id);
      return tables.deviceImports.outbound.get(slot.id);
    }

    if (slot.type === 'promise') {
      Nat(slot.id);
      if (!tables.promises.outbound.has(slot.id)) {
        throw new Error(`unknown promise slot '${slot.id}'`);
      }
      return { type: 'promise', id: tables.promises.outbound.get(slot.id) };
    }

    if (slot.type === 'resolver') {
      Nat(slot.id);
      if (!tables.resolvers.outbound.has(slot.id)) {
        throw new Error(`unknown resolver slot '${slot.id}'`);
      }
      return { type: 'resolver', id: tables.resolvers.outbound.get(slot.id) };
    }

    throw Error(`unknown slot.type in '${JSON.stringify(slot)}'`);
  }

  function allocateImportIndex() {
    const i = tables.nextImportID;
    tables.nextImportID = i + 1;
    return i;
  }

  // mapInbound: convert from absolute slot to forVatID-relative slot. This
  // is used when building the arguments for dispatch.deliver.
  function mapInbound(slot) {
    kdebug(`mapInbound for ${vatID} of ${JSON.stringify(slot)}`);

    if (slot.type === 'export') {
      const { vatID: fromVatID, id } = slot;
      Nat(id);

      if (vatID === fromVatID) {
        // this is returning home, so it's one of the target's exports
        return { type: 'export', id };
      }

      const m = tables.imports;
      const key = `${slot.type}.${fromVatID}.${id}`; // ugh javascript
      if (!m.inbound.has(key)) {
        // must add both directions
        const newSlotID = Nat(allocateImportIndex());
        // kdebug(` adding ${newSlotID}`);
        m.inbound.set(key, newSlotID);
        m.outbound.set(
          newSlotID,
          harden({ type: 'export', vatID: fromVatID, id }), // TODO just 'slot'?
        );
      }
      return { type: 'import', id: m.inbound.get(key) };
    }

    if (slot.type === 'device') {
      const { deviceName, id } = slot;
      Nat(id);

      const m = tables.deviceImports;
      const key = `${slot.type}.${deviceName}.${id}`; // ugh javascript
      if (!m.inbound.has(key)) {
        // must add both directions
        const newSlotID = Nat(allocateDeviceImportID());
        // kdebug(` adding ${newSlotID}`);
        m.inbound.set(key, newSlotID);
        m.outbound.set(newSlotID, harden(slot));
      }
      return { type: 'deviceImport', id: m.inbound.get(key) };
    }

    if (slot.type === 'promise') {
      const kernelPromiseID = slot.id;
      Nat(kernelPromiseID);
      const m = tables.promises;
      if (!m.inbound.has(kernelPromiseID)) {
        const promiseID = Nat(allocatePromiseID());
        m.inbound.set(kernelPromiseID, promiseID);
        m.outbound.set(promiseID, kernelPromiseID);
      }
      return { type: 'promise', id: m.inbound.get(kernelPromiseID) };
    }

    if (slot.type === 'resolver') {
      const kernelPromiseID = slot.id;
      Nat(kernelPromiseID);
      const m = tables.resolvers;
      if (!m.inbound.has(kernelPromiseID)) {
        const resolverID = Nat(allocateResolverID());
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

  let inReplay = false;
  const transcript = [];
  let playbackSyscalls;

  let currentEntry;
  function transcriptStartDispatch(d) {
    currentEntry = { d, syscalls: [] };
  }
  function transcriptAddSyscall(d, response) {
    if (currentEntry) {
      currentEntry.syscalls.push({ d, response });
    }
  }
  function transcriptFinishDispatch() {
    transcript.push(currentEntry);
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSend(targetSlot, method, argsString, vatSlots) {
    if (targetSlot.type === undefined) {
      throw new Error(
        `targetSlot isn't really a slot ${JSON.stringify(targetSlot)}`,
      );
    }
    if (targetSlot.type === 'export') {
      // Disable send-to-self for now. It might be useful in the future, but
      // I doubt it, and we can prevent some confusion by flagging a specific
      // error here. See issue #43 for details.
      throw new Error(`send() is calling itself, see issue #43`);
    }
    const target = mapOutbound(targetSlot);
    if (!target) {
      throw Error(
        `unable to find target for ${vatID}/${targetSlot.type}-${
          targetSlot.id
        }`,
      );
    }
    kdebug(
      `syscall[${vatID}].send(vat:${JSON.stringify(
        targetSlot,
      )}=ker:${JSON.stringify(target)}).${method}`,
    );
    const slots = vatSlots.map(slot => mapOutbound(slot));
    // who will decide the answer? If the message is being queued for a
    // promise, then the kernel will decide (when the answer gets
    // resolved). If it is going to a specific export, the exporting vat
    // gets to decide.
    let decider;
    if (target.type === 'export') {
      decider = target.vatID;
    }
    kdebug(`  ^target is ${JSON.stringify(target)}`);
    const kernelPromiseID = createPromiseWithDecider(decider);
    const msg = {
      method,
      argsString,
      slots,
      kernelResolverID: kernelPromiseID,
    };
    send(target, msg);
    const p = mapInbound({
      type: 'promise',
      id: kernelPromiseID,
    });
    return p.id; // relative to caller
  }

  function doCreatePromise() {
    const kernelPromiseID = createPromiseWithDecider(vatID);
    const p = mapInbound({
      type: 'promise',
      id: kernelPromiseID,
    });
    const r = mapInbound({
      type: 'resolver',
      id: kernelPromiseID,
    });
    kdebug(
      `syscall[${vatID}].createPromise -> (vat:p${p.id}/r${
        r.id
      }=ker:${kernelPromiseID})`,
    );
    return harden({ promiseID: p.id, resolverID: r.id });
  }

  function doSubscribe(promiseID) {
    const { id } = mapOutbound({
      type: 'promise',
      id: promiseID,
    });
    kdebug(`syscall[${vatID}].subscribe(vat:${promiseID}=ker:${id})`);
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelPromises.get(id);

    /*
    kdebug(`  decider is ${p.decider} in ${JSON.stringify(p)}`);
    if (p.subscribers.size === 0 && p.decider !== undefined) {
      runQueue.push({
        type: 'subscribe',
        vatID: p.decider,
        kernelPromiseID: id,
      });
    } */

    if (p.state === 'unresolved') {
      p.subscribers.add(vatID);
      // otherwise it's already resolved, you probably want to know how
    } else if (p.state === 'fulfilledToPresence') {
      runQueue.push({
        type: 'notifyFulfillToPresence',
        vatID,
        kernelPromiseID: id,
      });
    } else if (p.state === 'fulfilledToData') {
      runQueue.push({
        type: 'notifyFulfillToData',
        vatID,
        kernelPromiseID: id,
      });
    } else if (p.state === 'rejected') {
      runQueue.push({
        type: 'notifyReject',
        vatID,
        kernelPromiseID: id,
      });
    } else {
      throw new Error(`unknown p.state '${p.state}'`);
    }
  }

  /*
  function doRedirect(resolverID, targetPromiseID) {
    const { id } = mapOutbound({ type: 'resolver', id: resolverID });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelPromises.get(id);
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }

    let { id: targetID } = mapOutbound({ type: 'promise', id: targetPromiseID });
    if (!kernelPromises.has(targetID)) {
      throw new Error(`unknown kernelPromise id '${targetID}'`);
    }

    targetID = chaseRedirections(targetID);
    const target = kernelPromises.get(targetID);

    for (let s of p.subscribers) {
      // TODO: we need to remap their subscriptions, somehow
    }

    p.state = 'redirected';
    delete p.decider;
    const subscribers = p.subscribers;
    delete p.subscribers;
    p.redirectedTo = targetID;
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }
  } */

  function doFulfillToData(resolverID, fulfillData, vatSlots) {
    Nat(resolverID);
    const { id } = mapOutbound({
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const slots = vatSlots.map(slot => mapOutbound(slot));
    kdebug(
      `syscall[${vatID}].fulfillData(vatid=${resolverID}/kid=${id}) = ${fulfillData} v=${JSON.stringify(
        vatSlots,
      )}/k=${JSON.stringify(slots)}`,
    );
    fulfillToData(id, fulfillData, slots);
  }

  function doFulfillToPresence(resolverID, slot) {
    Nat(resolverID);
    const { id } = mapOutbound({
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }

    const targetSlot = mapOutbound(slot);
    kdebug(
      `syscall[${vatID}].fulfillToPresence(vatid=${resolverID}/kid=${id}) = vat:${JSON.stringify(
        targetSlot,
      )}=ker:${id})`,
    );
    fulfillToPresence(id, targetSlot);
  }

  function doReject(resolverID, rejectData, vatSlots) {
    Nat(resolverID);
    const { id } = mapOutbound({
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const slots = vatSlots.map(slot => mapOutbound(slot));
    kdebug(
      `syscall[${vatID}].reject(vatid=${resolverID}/kid=${id}) = ${rejectData} v=${JSON.stringify(
        vatSlots,
      )}/k=${JSON.stringify(slots)}`,
    );
    reject(id, rejectData, slots);
  }

  function doCallNow(target, method, argsString, argsSlots) {
    const dev = mapOutbound(target);
    if (dev.type !== 'device') {
      throw new Error(
        `doCallNow must target a device, not ${JSON.stringify(target)}`,
      );
    }
    const slots = argsSlots.map(slot => mapOutbound(slot));
    kdebug(
      `syscall[${vatID}].callNow(vat:device:${target.id}=ker:${JSON.stringify(
        dev,
      )}).${method}`,
    );
    const ret = invoke(dev, method, argsString, slots);
    const retSlots = ret.slots.map(slot => mapInbound(slot));
    return harden({ data: ret.data, slots: retSlots });
  }

  function replay(name, ...args) {
    const s = playbackSyscalls.shift();
    if (JSON.stringify(s.d) !== JSON.stringify([name, ...args])) {
      throw new Error(`historical inaccuracy in replay-${name}`);
    }
    return s.response;
  }

  const syscall = harden({
    send(...args) {
      const promiseID = inReplay ? replay('send', ...args) : doSend(...args);
      transcriptAddSyscall(['send', ...args], promiseID);
      return promiseID;
    },
    createPromise(...args) {
      const pr = inReplay
        ? replay('createPromise', ...args)
        : doCreatePromise(...args);
      transcriptAddSyscall(['createPromise', ...args], pr);
      return pr;
    },
    subscribe(...args) {
      transcriptAddSyscall(['subscribe', ...args]);
      return inReplay ? replay('subscribe', ...args) : doSubscribe(...args);
    },
    fulfillToData(...args) {
      transcriptAddSyscall(['fulfillToData', ...args]);
      return inReplay
        ? replay('fulfillToData', ...args)
        : doFulfillToData(...args);
    },
    fulfillToPresence(...args) {
      transcriptAddSyscall(['fulfillToPresence', ...args]);
      return inReplay
        ? replay('fulfillToPresence', ...args)
        : doFulfillToPresence(...args);
    },
    reject(...args) {
      transcriptAddSyscall(['reject', ...args]);
      return inReplay ? replay('reject', ...args) : doReject(...args);
    },

    callNow(...args) {
      const ret = inReplay ? replay('callNow', ...args) : doCallNow(...args);
      transcriptAddSyscall(['callNow', ...args], ret);
      return ret;
    },

    log(str) {
      log.push(`${str}`);
    },
  });

  let useTranscript = true;
  const state = harden({
    // if userspace calls activate(), their dispatch() is a pure function
    // function of the state object, and we don't need to manage checkpoints
    // or transcripts, just the state object.
    activate() {
      useTranscript = false;
      throw new Error('state.activate() not implemented');
    },
  });

  // now build the runtime, which gives us back a dispatch function

  const dispatch = setup(syscall, state, helpers);
  if (!dispatch || dispatch.deliver === undefined) {
    throw new Error(
      `vat setup() failed to return a 'dispatch' with .deliver: ${dispatch}`,
    );
  }

  // dispatch handlers: these are used by the kernel core

  async function doProcess(d, errmsg) {
    transcriptStartDispatch(d);
    return process(
      () => dispatch[d[0]](...d.slice(1)),
      () => transcriptFinishDispatch(),
      err => console.log(`${errmsg}: ${err}`, err),
    );
  }

  async function processOneMessage(message) {
    kdebug(`process ${JSON.stringify(message)}`);
    const { type } = message;
    if (type === 'deliver') {
      const { target, msg } = message;
      if (target.type !== 'export') {
        throw new Error(
          `processOneMessage got 'deliver' for non-export ${JSON.stringify(
            target,
          )}`,
        );
      }
      if (target.vatID !== vatID) {
        throw new Error(
          `vatManager[${vatID}] given 'deliver' for ${target.vatID}`,
        );
      }
      const inputSlots = msg.slots.map(slot => mapInbound(slot));
      const resolverID =
        msg.kernelResolverID &&
        mapInbound({ type: 'resolver', id: msg.kernelResolverID }).id;
      return doProcess(
        [
          'deliver',
          target.id,
          msg.method,
          msg.argsString,
          inputSlots,
          resolverID,
        ],
        `vat[${vatID}][${target.id}].${msg.method} dispatch failed`,
      );
    }

    /*
    if (type === 'subscribe') {
      const { kernelPromiseID, vatID } = message;
      const relativeID = mapInbound({
        type: 'resolver',
        id: kernelPromiseID,
      }).id;
      return doProcess(['subscribe', relativeID],
                       `vat[${vatID}].promise[${relativeID}] subscribe failed`);
    }
    */

    if (type === 'notifyFulfillToData') {
      const { kernelPromiseID } = message;
      const p = kernelPromises.get(kernelPromiseID);
      const relativeID = mapInbound({
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slots = p.fulfillSlots.map(slot => mapInbound(slot));
      return doProcess(
        ['notifyFulfillToData', relativeID, p.fulfillData, slots],
        `vat[${vatID}].promise[${relativeID}] fulfillToData failed`,
      );
    }

    if (type === 'notifyFulfillToPresence') {
      const { kernelPromiseID } = message;
      const p = kernelPromises.get(kernelPromiseID);
      const relativeID = mapInbound({
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slot = mapInbound(p.fulfillSlot);
      return doProcess(
        ['notifyFulfillToPresence', relativeID, slot],
        `vat[${vatID}].promise[${relativeID}] fulfillToPresence failed`,
      );
    }

    if (type === 'notifyReject') {
      const { kernelPromiseID } = message;
      const p = kernelPromises.get(kernelPromiseID);
      const relativeID = mapInbound({
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slots = p.rejectSlots.map(slot => mapInbound(slot));
      return doProcess(
        ['notifyReject', relativeID, p.rejectData, slots],
        `vat[${vatID}].promise[${relativeID}] reject failed`,
      );
    }

    throw new Error(`unknown message type '${type}'`);
  }

  function loadManagerState(vatData) {
    if (
      tables.imports.outbound.size ||
      tables.imports.inbound.size ||
      tables.promises.inbound.size ||
      tables.promises.inbound.size ||
      tables.resolvers.inbound.size ||
      tables.resolvers.inbound.size
    ) {
      throw new Error(`vat[$vatID] is not empty, cannot loadState`);
    }
    tables.nextImportID = vatData.nextImportID;
    vatData.imports.outbound.forEach(kv =>
      tables.imports.outbound.set(kv[0], kv[1]),
    );
    vatData.imports.inbound.forEach(kv =>
      tables.imports.inbound.set(kv[0], kv[1]),
    );

    tables.nextPromiseID = vatData.nextPromiseID;
    vatData.promises.outbound.forEach(kv =>
      tables.promises.outbound.set(kv[0], kv[1]),
    );
    vatData.promises.inbound.forEach(kv =>
      tables.promises.inbound.set(kv[0], kv[1]),
    );

    tables.nextResolverID = vatData.nextResolverID;
    vatData.resolvers.outbound.forEach(kv =>
      tables.resolvers.outbound.set(kv[0], kv[1]),
    );
    vatData.resolvers.inbound.forEach(kv =>
      tables.resolvers.inbound.set(kv[0], kv[1]),
    );
  }

  async function loadState(savedState) {
    if (!useTranscript) {
      throw new Error("userspace doesn't do transcripts");
    }

    inReplay = true;
    for (let i = 0; i < savedState.transcript.length; i += 1) {
      const t = savedState.transcript[i];
      playbackSyscalls = Array.from(t.syscalls);
      // eslint-disable-next-line no-await-in-loop
      await doProcess(t.d, 'errmsg');
    }
    inReplay = false;
  }

  function getManagerState() {
    return {
      nextImportID: tables.nextImportID,
      imports: {
        outbound: Array.from(tables.imports.outbound.entries()),
        inbound: Array.from(tables.imports.inbound.entries()),
      },

      nextPromiseID: tables.nextPromiseID,
      promises: {
        outbound: Array.from(tables.promises.outbound.entries()),
        inbound: Array.from(tables.promises.inbound.entries()),
      },

      nextResolverID: tables.nextResolverID,
      resolvers: {
        outbound: Array.from(tables.resolvers.outbound.entries()),
        inbound: Array.from(tables.resolvers.inbound.entries()),
      },
    };
  }

  function getCurrentState() {
    return { transcript: Array.from(transcript) };
  }

  function dumpTables() {
    const res = [];
    tables.imports.outbound.forEach((target, slot) => {
      res.push([vatID, 'import', slot, target.type, target.vatID, target.id]);
    });

    tables.promises.outbound.forEach((kernelPromiseID, id) => {
      res.push([vatID, 'promise', id, kernelPromiseID]);
    });

    tables.resolvers.outbound.forEach((kernelPromiseID, id) => {
      res.push([vatID, 'resolver', id, kernelPromiseID]);
    });
    kdebug(`vatMAnager.dumpTables ${JSON.stringify(res)}`);
    return harden(res);
  }

  const manager = {
    mapInbound,
    mapOutbound,
    dumpTables,
    loadManagerState,
    loadState,
    processOneMessage,
    getManagerState,
    getCurrentState,
  };
  return manager;
}
