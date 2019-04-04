import harden from '@agoric/harden';
import Nat from '@agoric/nat';

export default function makeVatManager(
  vatID,
  syscallManager,
  setup,
  helpers,
  devices,
) {
  const {
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
  } = syscallManager;

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
    const target = mapOutbound(vatID, targetSlot);
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
    const slots = vatSlots.map(slot => mapOutbound(vatID, slot));
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
    const p = mapInbound(vatID, {
      type: 'promise',
      id: kernelPromiseID,
    });
    return p.id; // relative to caller
  }

  function doCreatePromise() {
    const kernelPromiseID = createPromiseWithDecider(vatID);
    const p = mapInbound(vatID, {
      type: 'promise',
      id: kernelPromiseID,
    });
    const r = mapInbound(vatID, {
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
    const { id } = mapOutbound(vatID, {
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
    } else if (p.state === 'fulfilledToTarget') {
      runQueue.push({
        type: 'notifyFulfillToTarget',
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
    const { id } = mapOutbound(vatID, { type: 'resolver', id: resolverID });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelPromises.get(id);
    if (p.state !== 'unresolved') {
      throw new Error(`kernelPromise[${id}] is '${p.state}', not 'unresolved'`);
    }

    let { id: targetID } = mapOutbound(vatID, { type: 'promise', id: targetPromiseID });
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
    const { id } = mapOutbound(vatID, {
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const slots = vatSlots.map(slot => mapOutbound(vatID, slot));
    kdebug(
      `syscall[${vatID}].fulfillData(vatid=${resolverID}/kid=${id}) = ${fulfillData} v=${JSON.stringify(
        vatSlots,
      )}/k=${JSON.stringify(slots)}`,
    );
    fulfillToData(id, fulfillData, slots);
  }

  function doFulfillToTarget(resolverID, slot) {
    Nat(resolverID);
    const { id } = mapOutbound(vatID, {
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }

    const targetSlot = mapOutbound(vatID, slot);
    kdebug(
      `syscall[${vatID}].fulfillToTarget(vatid=${resolverID}/kid=${id}) = vat:${JSON.stringify(
        targetSlot,
      )}=ker:${id})`,
    );
    fulfillToTarget(id, targetSlot);
  }

  function doReject(resolverID, rejectData, vatSlots) {
    Nat(resolverID);
    const { id } = mapOutbound(vatID, {
      type: 'resolver',
      id: resolverID,
    });
    if (!kernelPromises.has(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const slots = vatSlots.map(slot => mapOutbound(vatID, slot));
    kdebug(
      `syscall[${vatID}].reject(vatid=${resolverID}/kid=${id}) = ${rejectData} v=${JSON.stringify(
        vatSlots,
      )}/k=${JSON.stringify(slots)}`,
    );
    reject(id, rejectData, slots);
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
    fulfillToTarget(...args) {
      transcriptAddSyscall(['fulfillToTarget', ...args]);
      return inReplay
        ? replay('fulfillToTarget', ...args)
        : doFulfillToTarget(...args);
    },
    reject(...args) {
      transcriptAddSyscall(['reject', ...args]);
      return inReplay ? replay('reject', ...args) : doReject(...args);
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

  const dispatch = setup(syscall, state, helpers, devices);

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
      const inputSlots = msg.slots.map(slot => mapInbound(vatID, slot));
      const resolverID =
        msg.kernelResolverID &&
        mapInbound(vatID, { type: 'resolver', id: msg.kernelResolverID }).id;
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
      const relativeID = mapInbound(vatID, {
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
      const relativeID = mapInbound(vatID, {
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slots = p.fulfillSlots.map(slot => mapInbound(vatID, slot));
      return doProcess(
        ['notifyFulfillToData', relativeID, p.fulfillData, slots],
        `vat[${vatID}].promise[${relativeID}] fulfillToData failed`,
      );
    }

    if (type === 'notifyFulfillToTarget') {
      const { kernelPromiseID } = message;
      const p = kernelPromises.get(kernelPromiseID);
      const relativeID = mapInbound(vatID, {
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slot = mapInbound(vatID, p.fulfillSlot);
      return doProcess(
        ['notifyFulfillToTarget', relativeID, slot],
        `vat[${vatID}].promise[${relativeID}] fulfillToTarget failed`,
      );
    }

    if (type === 'notifyReject') {
      const { kernelPromiseID } = message;
      const p = kernelPromises.get(kernelPromiseID);
      const relativeID = mapInbound(vatID, {
        type: 'promise',
        id: kernelPromiseID,
      }).id;
      const slots = p.rejectSlots.map(slot => mapInbound(vatID, slot));
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

  function getCurrentState() {
    return { transcript: Array.from(transcript) };
  }

  const manager = { loadState, processOneMessage, getCurrentState };
  return manager;
}
