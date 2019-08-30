import harden from '@agoric/harden';
import djson from './djson';
import { insist } from './insist';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../vats/parseVatSlots';

export default function makeVatManager(
  vatID,
  syscallManager,
  setup,
  helpers,
  vatKeeper,
) {
  const {
    kdebug,
    send,
    fulfillToData,
    fulfillToPresence,
    reject,
    process,
    invoke,
    kernelKeeper,
  } = syscallManager;

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
  // one vat's import IDs (o-NN) to a kernel object ID (koNN) in the
  // vatKeeper's state.vatSlotToKernelSlot table. To make sure we use the
  // same importID each time, we also need to keep a reverse table:
  // kernelSlotToVatSlot maps them back.

  // Comms vats will have their own internal tables to track references
  // shared with other machines. These will have mapInbound/mapOutbound too.
  // A message arriving on a communication channel will pass through the
  // comms vat's mapInbound to figure out which "machine export" is the
  // target, which maps to a "vat import" (coming from the kernel). The
  // arguments might also be machine exports (for arguments that are "coming
  // home"), or more commonly will be new machine imports (for arguments that
  // point to other machines, usually the sending machine). The machine
  // imports will be presented to the kernel as exports of the comms vat.

  // The vat sees "vat slots" (object references) as the arguments of
  // syscall/dispatch functions. These take on the following forms (where
  // "NN" is an integer):

  // o+NN : an object ref allocated by this Vat, hence an export
  // o-NN : an object ref allocated by the kernel, an imported object
  // p-NN : a promise ref allocated by the kernel
  // p+NN : (todo) a promise ref allocated by this vat
  // d-NN : a device ref allocated by the kernel, imported

  // Within the kernel, we use "kernel slots", with the following forms:

  // koNN : an object reference
  // kpNN : a promise reference
  // kdNN : a device reference

  // The vatManager is responsible for translating vat slots into kernel
  // slots on the outbound (syscall) path, and kernel slots back into vat
  // slots on the inbound (dispatch) path.

  // mapOutbound: e.g. arguments of syscall.send()
  function mapVatSlotToKernelSlot(vatSlot) {
    insist(`${vatSlot}` === vatSlot, 'non-string vatSlot');
    return vatKeeper.mapVatSlotToKernelSlot(vatSlot);
  }

  // mapInbound: e.g. arguments of dispatch.deliver()
  function mapKernelSlotToVatSlot(kernelSlot) {
    insist(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    kdebug(
      `mapKernelSlotToVatSlot for ${vatID} of ${JSON.stringify(kernelSlot)}`,
    );
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
    if (!inReplay) {
      vatKeeper.addToTranscript(currentEntry);
    }
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSend(targetSlot, method, argsString, vatSlots, resultSlot) {
    insist(`${targetSlot}` === targetSlot, 'non-string targetSlot');
    // TODO: disable send-to-self for now, qv issue #43
    const target = mapVatSlotToKernelSlot(targetSlot);
    kdebug(`syscall[${vatID}].send(vat:${targetSlot}=ker:${target}).${method}`);
    const slots = vatSlots.map(slot => mapVatSlotToKernelSlot(slot));
    let result;
    if (resultSlot) {
      insistVatType('promise', resultSlot);
      result = mapVatSlotToKernelSlot(resultSlot);
      insistKernelType('promise', result);
      // The promise must be unresolved, and this Vat must be the decider.
      // The most common case is that 'resultSlot' is a new exported promise
      // (p+NN). But it might be a previously-imported promise (p-NN) that
      // they got in a deliver() call, which gave them resolution authority.
      const p = kernelKeeper.getKernelPromise(result);
      insist(
        p.state === 'unresolved',
        `send() result ${result} is already resolved`,
      );
      insist(
        p.decider === vatID,
        `send() result ${result} is decided by ${p.decider} not ${vatID}`,
      );
      p.decider = undefined; // resolution authority now held by run-queue
    }

    const msg = {
      method,
      argsString,
      slots,
      result,
    };
    send(target, msg);
  }

  function doSubscribe(promiseID) {
    const id = mapVatSlotToKernelSlot(promiseID);
    kdebug(`syscall[${vatID}].subscribe(vat:${promiseID}=ker:${id})`);
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    const p = kernelKeeper.getKernelPromise(id);

    /*
    // Originally the kernel didn't subscribe to a vat's promise until some
    // other vat had subscribed to the kernel's promise. That proved too hard
    // to manage, so now the kernel always subscribes to every vat promise.
    // This code was to handle the original behavior but has bitrotted
    // because it is unused.
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

  function doFulfillToData(promiseID, fulfillData, vatSlots) {
    insistVatType('promise', promiseID);
    const kp = mapVatSlotToKernelSlot(promiseID);
    insistKernelType('promise', kp);
    insist(kernelKeeper.hasKernelPromise(kp), `unknown kernelPromise '${kp}'`);
    const p = kernelKeeper.getKernelPromise(kp);
    insist(p.state === 'unresolved', `${kp} was already resolved`);
    insist(
      p.decider === vatID,
      `${kp} is decided by ${p.decider}, not ${vatID}`,
    );

    const slots = vatSlots.map(slot => mapVatSlotToKernelSlot(slot));
    kdebug(
      `syscall[${vatID}].fulfillData(${promiseID}/${kp}) = ${fulfillData} ${JSON.stringify(
        vatSlots,
      )}/${JSON.stringify(slots)}`,
    );
    fulfillToData(kp, fulfillData, slots);
  }

  function doFulfillToPresence(promiseID, slot) {
    insistVatType('promise', promiseID);
    const kp = mapVatSlotToKernelSlot(promiseID);
    insistKernelType('promise', kp);
    insist(kernelKeeper.hasKernelPromise(kp), `unknown kernelPromise '${kp}'`);
    const p = kernelKeeper.getKernelPromise(kp);
    insist(p.state === 'unresolved', `${kp} was already resolved`);
    insist(
      p.decider === vatID,
      `${kp} is decided by ${p.decider}, not ${vatID}`,
    );

    const targetSlot = mapVatSlotToKernelSlot(slot);
    kdebug(
      `syscall[${vatID}].fulfillToPresence(${promiseID}/${kp}) = ${slot}/${targetSlot})`,
    );
    fulfillToPresence(kp, targetSlot);
  }

  function doReject(promiseID, rejectData, vatSlots) {
    insistVatType('promise', promiseID);
    const kp = mapVatSlotToKernelSlot(promiseID);
    insistKernelType('promise', kp);
    insist(kernelKeeper.hasKernelPromise(kp), `unknown kernelPromise '${kp}'`);
    const p = kernelKeeper.getKernelPromise(kp);
    insist(p.state === 'unresolved', `${kp} was already resolved`);
    insist(
      p.decider === vatID,
      `${kp} is decided by ${p.decider}, not ${vatID}`,
    );

    const slots = vatSlots.map(slot => mapVatSlotToKernelSlot(slot));
    kdebug(
      `syscall[${vatID}].reject(${promiseID}/${kp}) = ${rejectData} ${JSON.stringify(
        vatSlots,
      )}/${JSON.stringify(slots)}`,
    );
    reject(kp, rejectData, slots);
  }

  function doCallNow(target, method, argsString, argsSlots) {
    const dev = mapVatSlotToKernelSlot(target);
    const { type } = parseKernelSlot(dev);
    if (type !== 'device') {
      throw new Error(`doCallNow must target a device, not ${dev}`);
    }
    const slots = argsSlots.map(slot => mapVatSlotToKernelSlot(slot));
    kdebug(`syscall[${vatID}].callNow(${target}/${dev}).${method}`);
    const ret = invoke(dev, method, argsString, slots);
    const retSlots = ret.slots.map(slot => mapKernelSlotToVatSlot(slot));
    return harden({ data: ret.data, slots: retSlots });
  }

  function replay(name, ...args) {
    const s = playbackSyscalls.shift();
    if (djson.stringify(s.d) !== djson.stringify([name, ...args])) {
      console.log(`anachrophobia strikes vat ${vatID}`);
      console.log(`expected:`, djson.stringify(s.d));
      console.log(`got     :`, djson.stringify([name, ...args]));
      throw new Error(`historical inaccuracy in replay-${name}`);
    }
    return s.response;
  }

  const syscall = harden({
    send(...args) {
      const promiseID = inReplay ? replay('send', ...args) : doSend(...args);
      // todo: remove return value
      transcriptAddSyscall(['send', ...args], promiseID);
      return promiseID;
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
    const dispatchOp = d[0];
    const dispatchArgs = d.slice(1);
    transcriptStartDispatch(d);
    return process(
      () => dispatch[dispatchOp](...dispatchArgs),
      () => transcriptFinishDispatch(),
      err => console.log(`doProcess: ${errmsg}: ${err}`, err),
    );
  }

  function processOneMessage(message) {
    kdebug(`process ${JSON.stringify(message)}`);
    const { type } = message;
    if (type === 'deliver') {
      // console.log(`   process ${vatID} ${message.msg.method}() -> result=${message.msg.result}`);
      const { target, msg } = message;
      // temporary, until we allow delivery of pipelined messages to vats
      // which have opted-in
      insistKernelType('object', target);
      const targetSlot = mapKernelSlotToVatSlot(target);
      insist(parseVatSlot(targetSlot).allocatedByVat, `deliver() to wrong vat`);
      const inputSlots = msg.slots.map(slot => mapKernelSlotToVatSlot(slot));
      let resultSlot;
      if (msg.result) {
        insistKernelType('promise', msg.result);
        const p = kernelKeeper.getKernelPromise(msg.result);
        insist(
          p.state === 'unresolved',
          `result ${msg.result} already resolved`,
        );
        insist(
          !p.decider,
          `result ${msg.result} already has decider ${p.decider}`,
        );
        resultSlot = vatKeeper.mapKernelSlotToVatSlot(msg.result);
        insistVatType('promise', resultSlot);
        p.decider = vatID;
      }
      return doProcess(
        [
          'deliver',
          targetSlot,
          msg.method,
          msg.argsString,
          inputSlots,
          resultSlot,
        ],
        `vat[${vatID}][${targetSlot}].${msg.method} dispatch failed`,
      );
    }

    if (type === 'notifyFulfillToData') {
      const { kernelPromiseID } = message;
      const kp = kernelKeeper.getKernelPromise(kernelPromiseID);
      const vpid = mapKernelSlotToVatSlot(kernelPromiseID);
      const slots = kp.fulfillSlots.map(slot => mapKernelSlotToVatSlot(slot));
      // console.log(`     ${vatID} ${message.type} ${message.kernelPromiseID}`, kp.fulfillData, kp.fulfillSlots);
      return doProcess(
        ['notifyFulfillToData', vpid, kp.fulfillData, slots],
        `vat[${vatID}].promise[${vpid}] fulfillToData failed`,
      );
    }

    if (type === 'notifyFulfillToPresence') {
      const { kernelPromiseID } = message;
      const kp = kernelKeeper.getKernelPromise(kernelPromiseID);
      const vpid = mapKernelSlotToVatSlot(kernelPromiseID);
      const slot = mapKernelSlotToVatSlot(kp.fulfillSlot);
      // console.log(`     ${vatID} ${message.type} ${message.kernelPromiseID}`, kp.fulfillSlot);
      return doProcess(
        ['notifyFulfillToPresence', vpid, slot],
        `vat[${vatID}].promise[${vpid}] fulfillToPresence failed`,
      );
    }

    if (type === 'notifyReject') {
      const { kernelPromiseID } = message;
      const kp = kernelKeeper.getKernelPromise(kernelPromiseID);
      const vpid = mapKernelSlotToVatSlot(kernelPromiseID);
      const slots = kp.rejectSlots.map(slot => mapKernelSlotToVatSlot(slot));
      return doProcess(
        ['notifyReject', vpid, kp.rejectData, slots],
        `vat[${vatID}].promise[${vpid}] reject failed`,
      );
    }

    throw new Error(`unknown message type '${type}'`);
  }

  async function replayTranscript() {
    if (!useTranscript) {
      throw new Error("userspace doesn't do transcripts");
    }

    const transcript = vatKeeper.getTranscript();
    inReplay = true;
    for (let i = 0; i < transcript.length; i += 1) {
      const t = transcript[i];
      playbackSyscalls = Array.from(t.syscalls);
      // eslint-disable-next-line no-await-in-loop
      await doProcess(t.d, 'errmsg');
    }
    inReplay = false;
  }

  const manager = {
    mapKernelSlotToVatSlot,
    mapVatSlotToKernelSlot,
    processOneMessage,
    replayTranscript,
  };
  return manager;
}
