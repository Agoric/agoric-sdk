import harden from '@agoric/harden';
import djson from './djson';
import { insist } from '../insist';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';

export default function makeVatManager(
  vatID,
  syscallManager,
  setup,
  helpers,
  kernelKeeper,
  vatKeeper,
) {
  const { kdebug, process } = syscallManager;

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

  function doSend(targetSlot, method, args, resultSlot) {
    insist(`${targetSlot}` === targetSlot, 'non-string targetSlot');
    insistCapData(args);
    // TODO: disable send-to-self for now, qv issue #43
    const target = mapVatSlotToKernelSlot(targetSlot);
    kdebug(`syscall[${vatID}].send(vat:${targetSlot}=ker:${target}).${method}`);
    const kernelSlots = args.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelArgs = harden({ ...args, slots: kernelSlots });
    let result = null;
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
      kernelKeeper.clearDecider(result);
      // resolution authority now held by run-queue
    }

    const msg = harden({
      method,
      args: kernelArgs,
      result,
    });
    insistMessage(msg);
    syscallManager.send(target, msg);
  }

  function doSubscribe(promiseID) {
    const id = mapVatSlotToKernelSlot(promiseID);
    kdebug(`syscall[${vatID}].subscribe(vat:${promiseID}=ker:${id})`);
    if (!kernelKeeper.hasKernelPromise(id)) {
      throw new Error(`unknown kernelPromise id '${id}'`);
    }
    syscallManager.subscribe(vatID, id);
  }

  function doFulfillToPresence(promiseID, slot) {
    insistVatType('promise', promiseID);
    const kpid = mapVatSlotToKernelSlot(promiseID);
    const targetSlot = mapVatSlotToKernelSlot(slot);
    kdebug(
      `syscall[${vatID}].fulfillToPresence(${promiseID / kpid}) = ${slot /
        targetSlot})`,
    );
    syscallManager.fulfillToPresence(vatID, kpid, targetSlot);
  }

  function doFulfillToData(promiseID, data) {
    insistVatType('promise', promiseID);
    insistCapData(data);
    const kpid = mapVatSlotToKernelSlot(promiseID);
    const kernelSlots = data.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...data, slots: kernelSlots });
    kdebug(
      `syscall[${vatID}].fulfillData(${promiseID}/${kpid}) = ${
        data.body
      } ${JSON.stringify(data.slots)}/${JSON.stringify(kernelSlots)}`,
    );
    syscallManager.fulfillToData(vatID, kpid, kernelData);
  }

  function doReject(promiseID, data) {
    insistVatType('promise', promiseID);
    insistCapData(data);
    const kpid = mapVatSlotToKernelSlot(promiseID);
    const kernelSlots = data.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...data, slots: kernelSlots });
    kdebug(
      `syscall[${vatID}].reject(${promiseID}/${kpid}) = ${
        data.body
      } ${JSON.stringify(data.slots)}/${JSON.stringify(kernelSlots)}`,
    );
    syscallManager.reject(vatID, kpid, kernelData);
  }

  function doCallNow(target, method, args) {
    insistCapData(args);
    const dev = mapVatSlotToKernelSlot(target);
    const { type } = parseKernelSlot(dev);
    if (type !== 'device') {
      throw new Error(`doCallNow must target a device, not ${dev}`);
    }
    const kernelSlots = args.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...args, slots: kernelSlots });
    kdebug(`syscall[${vatID}].callNow(${target}/${dev}).${method}`);
    const ret = syscallManager.invoke(dev, method, kernelData);
    const retSlots = ret.slots.map(slot => mapKernelSlotToVatSlot(slot));
    return harden({ ...ret, slots: retSlots });
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
      transcriptAddSyscall(['send', ...args], null);
      return inReplay ? replay('send', ...args) : doSend(...args);
    },
    subscribe(...args) {
      transcriptAddSyscall(['subscribe', ...args], null);
      return inReplay ? replay('subscribe', ...args) : doSubscribe(...args);
    },
    fulfillToData(...args) {
      transcriptAddSyscall(['fulfillToData', ...args], null);
      return inReplay
        ? replay('fulfillToData', ...args)
        : doFulfillToData(...args);
    },
    fulfillToPresence(...args) {
      transcriptAddSyscall(['fulfillToPresence', ...args], null);
      return inReplay
        ? replay('fulfillToPresence', ...args)
        : doFulfillToPresence(...args);
    },
    reject(...args) {
      transcriptAddSyscall(['reject', ...args], null);
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

  async function deliverOneMessage(target, msg) {
    insistMessage(msg);
    const targetSlot = mapKernelSlotToVatSlot(target);
    if (targetSlot.type === 'object') {
      insist(parseVatSlot(targetSlot).allocatedByVat, `deliver() to wrong vat`);
    } else if (targetSlot.type === 'promise') {
      const p = kernelKeeper.getKernelPromise(target);
      insist(p.decider === vatID, `wrong decider`);
    }
    const inputSlots = msg.args.slots.map(slot => mapKernelSlotToVatSlot(slot));
    let resultSlot = null;
    if (msg.result) {
      insistKernelType('promise', msg.result);
      const p = kernelKeeper.getKernelPromise(msg.result);
      insist(p.state === 'unresolved', `result ${msg.result} already resolved`);
      insist(
        !p.decider,
        `result ${msg.result} already has decider ${p.decider}`,
      );
      resultSlot = vatKeeper.mapKernelSlotToVatSlot(msg.result);
      insistVatType('promise', resultSlot);
      kernelKeeper.setDecider(msg.result, vatID);
    }
    await doProcess(
      [
        'deliver',
        targetSlot,
        msg.method,
        harden({ ...msg.args, slots: inputSlots }),
        resultSlot,
      ],
      `vat[${vatID}][${targetSlot}].${msg.method} dispatch failed`,
    );
  }

  async function deliverOneNotification(kpid, kp) {
    insist(kp.state !== 'unresolved', `spurious notification ${kpid}`);
    if (kp.state === 'fulfilledToPresence') {
      const vpid = mapKernelSlotToVatSlot(kpid);
      const slot = mapKernelSlotToVatSlot(kp.slot);
      await doProcess(
        ['notifyFulfillToPresence', vpid, slot],
        `vat[${vatID}].promise[${vpid}] fulfillToPresence failed`,
      );
    } else if (kp.state === 'redirected') {
      throw new Error('not implemented yet');
    } else if (kp.state === 'fulfilledToData') {
      const vpid = mapKernelSlotToVatSlot(kpid);
      const vatData = harden({
        ...kp.data,
        slots: kp.data.slots.map(slot => mapKernelSlotToVatSlot(slot)),
      });
      await doProcess(
        ['notifyFulfillToData', vpid, vatData],
        `vat[${vatID}].promise[${vpid}] fulfillToData failed`,
      );
    } else if (kp.state === 'rejected') {
      const vpid = mapKernelSlotToVatSlot(kpid);
      const vatData = harden({
        ...kp.data,
        slots: kp.data.slots.map(slot => mapKernelSlotToVatSlot(slot)),
      });
      await doProcess(
        ['notifyReject', vpid, vatData],
        `vat[${vatID}].promise[${vpid}] reject failed`,
      );
    } else {
      throw new Error(`unknown kernelPromise state '${kp.state}'`);
    }
  }

  async function replayTranscript() {
    if (!useTranscript) {
      throw new Error("userspace doesn't do transcripts");
    }

    inReplay = true;
    for (const t of vatKeeper.getTranscript()) {
      playbackSyscalls = Array.from(t.syscalls);
      // eslint-disable-next-line no-await-in-loop
      await doProcess(t.d, 'errmsg');
    }
    inReplay = false;
  }

  const manager = {
    mapKernelSlotToVatSlot,
    mapVatSlotToKernelSlot,
    deliverOneMessage,
    deliverOneNotification,
    replayTranscript,
  };
  return manager;
}
