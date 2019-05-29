import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import makeVatKeeper from './state/vatKeeper';

export default function makeVatManager(
  vatID,
  syscallManager,
  setup,
  helpers,
  vatKVStore,
) {
  const {
    kdebug,
    createPromiseWithDecider,
    send,
    fulfillToData,
    fulfillToPresence,
    reject,
    process,
    invoke,
    kernelKeeper,
  } = syscallManager;

  kernelKeeper.addVat(vatID, vatKVStore);

  const vatKeeper = makeVatKeeper(kernelKeeper.getVat(vatID));

  // We use vat-centric terminology here, so "inbound" means "into a vat",
  // generally from the kernel. We also have "comms vats" which use special
  // device access to interact with remote machines: messages from those
  // remote machines are "inbound" into the comms vats. Conversely "outbound"
  // means "out of a vat", usually into the local kernel, but we also use
  // "outbound" to describe the messages a comms vat is sending over a socket
  // or other communications channel.

  // The mapVatSlotToKernelSlot() function is used to translate slot references on the
  // vat->kernel pathway. mapKernelToVatSlot() is used for kernel->vat.

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

  // vatSlot to kernelSlot
  // mapOutbound
  function mapVatSlotToKernelSlot(vatSlot) {
    vatKeeper.insistVatSlot(vatSlot);
    const { type, id } = vatSlot;

    if (type === 'export') {
      // one of our exports, so just make the vatID explicit
      return { type: 'export', vatID, id };
    }

    return vatKeeper.mapVatSlotToKernelSlot(vatSlot);
  }

  // kernelSlot to VatSlot
  // mapInbound: convert from absolute slot to forVatID-relative slot. This
  // is used when building the arguments for dispatch.deliver.

  function mapKernelSlotToVatSlot(kernelSlot) {
    kdebug(
      `mapKernelSlotToVatSlot for ${vatID} of ${JSON.stringify(kernelSlot)}`,
    );

    if (Object.getPrototypeOf(kernelSlot) !== Object.getPrototypeOf({})) {
      throw new Error(
        `hey, mapInbound given wrong-realm slot ${JSON.stringify(kernelSlot)}`,
      );
    }

    vatKeeper.insistKernelSlot(kernelSlot);

    if (kernelSlot.type === 'export') {
      const { vatID: fromVatID, id } = kernelSlot;

      if (vatID === fromVatID) {
        // this is returning home, so it's one of the target's exports
        return { type: 'export', id };
      }
    }

    return vatKeeper.mapKernelSlotToVatSlot(kernelSlot);
  }

  let inReplay = false;
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
    vatKeeper.addToTranscript(currentEntry);
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

    const target = mapVatSlotToKernelSlot(targetSlot);

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
    const slots = vatSlots.map(slot => mapVatSlotToKernelSlot(slot));
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
    const p = mapKernelSlotToVatSlot({
      type: 'promise',
      id: kernelPromiseID,
    });
    return p.id; // relative to caller
  }

  function doCreatePromise() {
    const kernelPromiseID = createPromiseWithDecider(vatID);
    const p = mapKernelSlotToVatSlot({
      type: 'promise',
      id: kernelPromiseID,
    });
    const r = mapKernelSlotToVatSlot({
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
    const { id } = mapVatSlotToKernelSlot({
      type: 'promise',
      id: promiseID,
    });
    kdebug(`syscall[${vatID}].subscribe(vat:${promiseID}=ker:${id})`);
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelKeeper.getKernelPromise(id);

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
      kernelKeeper.addSubscriberToPromise(id, vatID);
      // otherwise it's already resolved, you probably want to know how
    } else if (p.state === 'fulfilledToPresence') {
      kernelKeeper.addToRunQueue({
        type: 'notifyFulfillToPresence',
        vatID,
        kernelPromiseID: id,
      });
    } else if (p.state === 'fulfilledToData') {
      kernelKeeper.addToRunQueue({
        type: 'notifyFulfillToData',
        vatID,
        kernelPromiseID: id,
      });
    } else if (p.state === 'rejected') {
      kernelKeeper.addToRunQueue({
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
    const { id } = mapVatSlotToKernelSlot({ type: 'resolver', id: resolverID });
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelKeeper.getKernelPromise(id);
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }

    let { id: targetID } = mapVatSlotToKernelSlot({ type: 'promise', id: targetPromiseID });
    if (!kernelKeeper.hasKernelPromise(targetID)) {
      throw new Error(`unknown kernelPromise id '${targetID}'`);
    }

    targetID = chaseRedirections(targetID);
    const target = kernelKeeper.getKernelPromise(targetID);

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
    const { id } = mapVatSlotToKernelSlot({
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const slots = vatSlots.map(slot => mapVatSlotToKernelSlot(slot));
    kdebug(
      `syscall[${vatID}].fulfillData(vatid=${resolverID}/kid=${id}) = ${fulfillData} v=${JSON.stringify(
        vatSlots,
      )}/k=${JSON.stringify(slots)}`,
    );
    fulfillToData(id, fulfillData, slots);
  }

  function doFulfillToPresence(resolverID, slot) {
    Nat(resolverID);
    const { id } = mapVatSlotToKernelSlot({
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }

    const targetSlot = mapVatSlotToKernelSlot(slot);
    kdebug(
      `syscall[${vatID}].fulfillToPresence(vatid=${resolverID}/kid=${id}) = vat:${JSON.stringify(
        targetSlot,
      )}=ker:${id})`,
    );
    fulfillToPresence(id, targetSlot);
  }

  function doReject(resolverID, rejectData, vatSlots) {
    Nat(resolverID);
    const { id } = mapVatSlotToKernelSlot({
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const slots = vatSlots.map(slot => mapVatSlotToKernelSlot(slot));
    kdebug(
      `syscall[${vatID}].reject(vatid=${resolverID}/kid=${id}) = ${rejectData} v=${JSON.stringify(
        vatSlots,
      )}/k=${JSON.stringify(slots)}`,
    );
    reject(id, rejectData, slots);
  }

  function doCallNow(target, method, argsString, argsSlots) {
    const dev = mapVatSlotToKernelSlot(target);
    if (dev.type !== 'device') {
      throw new Error(
        `doCallNow must target a device, not ${JSON.stringify(target)}`,
      );
    }
    const slots = argsSlots.map(slot => mapVatSlotToKernelSlot(slot));
    kdebug(
      `syscall[${vatID}].callNow(vat:device:${target.id}=ker:${JSON.stringify(
        dev,
      )}).${method}`,
    );
    const ret = invoke(dev, method, argsString, slots);
    const retSlots = ret.slots.map(slot => mapKernelSlotToVatSlot(slot));
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
      kernelKeeper.log(str);
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

  function doProcess(d, errmsg) {
    transcriptStartDispatch(d);
    return process(
      () => dispatch[d[0]](...d.slice(1)),
      () => transcriptFinishDispatch(),
      err => console.log(`doProcess: ${errmsg}: ${err}`, err),
    );
  }

  function processOneMessage(message) {
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
      const inputSlots = msg.slots.map(slot => mapKernelSlotToVatSlot(slot));
      const resolverID =
        msg.kernelResolverID &&
        mapKernelSlotToVatSlot({ type: 'resolver', id: msg.kernelResolverID })
          .id;
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
      const relativeID = mapKernelSlotToVatSlot({
        type: 'resolver',
        id: kernelPromiseID,
      }).id;
      return doProcess(['subscribe', relativeID],
                       `vat[${vatID}].promise[${relativeID}] subscribe failed`);
    }
    */

    if (type === 'notifyFulfillToData') {
      const { kernelPromiseID } = message;
      const p = kernelKeeper.getKernelPromise(kernelPromiseID);
      const relativeID = mapKernelSlotToVatSlot({
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slots = p.fulfillSlots.map(slot => mapKernelSlotToVatSlot(slot));
      return doProcess(
        ['notifyFulfillToData', relativeID, p.fulfillData, slots],
        `vat[${vatID}].promise[${relativeID}] fulfillToData failed`,
      );
    }

    if (type === 'notifyFulfillToPresence') {
      const { kernelPromiseID } = message;
      const p = kernelKeeper.getKernelPromise(kernelPromiseID);
      const relativeID = mapKernelSlotToVatSlot({
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slot = mapKernelSlotToVatSlot(p.fulfillSlot);
      return doProcess(
        ['notifyFulfillToPresence', relativeID, slot],
        `vat[${vatID}].promise[${relativeID}] fulfillToPresence failed`,
      );
    }

    if (type === 'notifyReject') {
      const { kernelPromiseID } = message;
      const p = kernelKeeper.getKernelPromise(kernelPromiseID);
      const relativeID = mapKernelSlotToVatSlot({
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slots = p.rejectSlots.map(slot => mapKernelSlotToVatSlot(slot));
      return doProcess(
        ['notifyReject', relativeID, p.rejectData, slots],
        `vat[${vatID}].promise[${relativeID}] reject failed`,
      );
    }

    throw new Error(`unknown message type '${type}'`);
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

  const manager = {
    mapKernelSlotToVatSlot,
    mapVatSlotToKernelSlot,
    dumpState: vatKeeper.dumpState,
    loadManagerState: vatKeeper.loadManagerState,
    loadState,
    processOneMessage,
    getManagerState: vatKeeper.getManagerState,
    getCurrentState: vatKeeper.getCurrentState,
  };
  return manager;
}
