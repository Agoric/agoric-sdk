import harden from '@agoric/harden';
import { assert, details } from '@agoric/assert';
import djson from './djson';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { insistVatType, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';
import { kdebug, legibilizeMessageArgs } from './kdebug';

export default function makeVatManager(
  vatID,
  syscallManager,
  setup,
  helpers,
  kernelKeeper,
  vatKeeper,
  vatPowers,
) {
  const { waitUntilQuiescent, endOfCrankMeterTask } = syscallManager;

  // We use vat-centric terminology here, so "inbound" means "into a vat",
  // generally from the kernel. We also have "comms vats" which use special
  // device access to interact with remote machines: messages from those
  // remote machines are "inbound" into the comms vats. Conversely "outbound"
  // means "out of a vat", usually into the local kernel, but we also use
  // "outbound" to describe the messages a comms vat is sending over a socket
  // or other communications channel.

  // The mapVatSlotToKernelSlot() function is used to translate slot references
  // on the vat->kernel pathway. mapKernelToVatSlot() is used for kernel->vat.

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
    assert(`${vatSlot}` === vatSlot, 'non-string vatSlot');
    return vatKeeper.mapVatSlotToKernelSlot(vatSlot);
  }

  // mapInbound: e.g. arguments of dispatch.deliver()
  function mapKernelSlotToVatSlot(kernelSlot) {
    assert(`${kernelSlot}` === kernelSlot, 'non-string kernelSlot');
    const vatSlot = vatKeeper.mapKernelSlotToVatSlot(kernelSlot);
    return vatSlot;
  }

  let inReplay = false;
  let playbackSyscalls;

  let currentEntry;
  function transcriptStartDispatch(d) {
    currentEntry = {
      d,
      syscalls: [],
      crankNumber: kernelKeeper.getCrankNumber(),
    };
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

  function deleteCListEntryIfEasy(kpid, vpid, kernelData) {
    let idx = 0;
    for (const slot of kernelData.slots) {
      const { type } = parseKernelSlot(slot);
      if (type === 'promise') {
        kdebug(
          `Unable to delete ${vatID} clist entry ${kpid}<=>${vpid} because slot[${idx}]===${slot} is a promise`,
        );
        return;
      }
      idx += 1;
    }
    vatKeeper.deleteCListEntry(kpid, vpid);
  }

  // syscall handlers: these are wrapped by the 'syscall' object and made
  // available to userspace

  function doSend(targetSlot, method, args, resultSlot) {
    assert(`${targetSlot}` === targetSlot, 'non-string targetSlot');
    insistCapData(args);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallSend');
    // TODO: disable send-to-self for now, qv issue #43
    const target = mapVatSlotToKernelSlot(targetSlot);
    const argList = legibilizeMessageArgs(args).join(', ');
    // prettier-ignore
    kdebug(`syscall[${vatID}].send(vat:${targetSlot}=ker:${target}).${method}(${argList})`);
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
      assert(
        p.state === 'unresolved',
        details`send() result ${result} is already resolved`,
      );
      assert(
        p.decider === vatID,
        details`send() result ${result} is decided by ${p.decider} not ${vatID}`,
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
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallSubscribe');
    syscallManager.subscribe(vatID, id);
  }

  function doFulfillToPresence(promiseID, slot) {
    insistVatType('promise', promiseID);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallFulfillToPresence');
    const kpid = mapVatSlotToKernelSlot(promiseID);
    const targetSlot = mapVatSlotToKernelSlot(slot);
    kdebug(
      `syscall[${vatID}].fulfillToPresence(${promiseID} / ${kpid}) = ${slot} / ${targetSlot})`,
    );
    vatKeeper.deleteCListEntry(kpid, promiseID);
    syscallManager.fulfillToPresence(vatID, kpid, targetSlot);
  }

  function doFulfillToData(promiseID, data) {
    insistVatType('promise', promiseID);
    insistCapData(data);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallFulfillToData');
    const kpid = mapVatSlotToKernelSlot(promiseID);
    const kernelSlots = data.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...data, slots: kernelSlots });
    kdebug(
      `syscall[${vatID}].fulfillData(${promiseID}/${kpid}) = ${
        data.body
      } ${JSON.stringify(data.slots)}/${JSON.stringify(kernelSlots)}`,
    );
    deleteCListEntryIfEasy(kpid, promiseID, kernelData);
    syscallManager.fulfillToData(vatID, kpid, kernelData);
  }

  function doReject(promiseID, data) {
    insistVatType('promise', promiseID);
    insistCapData(data);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallReject');
    const kpid = mapVatSlotToKernelSlot(promiseID);
    const kernelSlots = data.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...data, slots: kernelSlots });
    kdebug(
      `syscall[${vatID}].reject(${promiseID}/${kpid}) = ${
        data.body
      } ${JSON.stringify(data.slots)}/${JSON.stringify(kernelSlots)}`,
    );
    deleteCListEntryIfEasy(kpid, promiseID, kernelData);
    syscallManager.reject(vatID, kpid, kernelData);
  }

  function doCallNow(target, method, args) {
    insistCapData(args);
    const dev = mapVatSlotToKernelSlot(target);
    const { type } = parseKernelSlot(dev);
    if (type !== 'device') {
      throw new Error(`doCallNow must target a device, not ${dev}`);
    }
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallCallNow');
    const kernelSlots = args.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...args, slots: kernelSlots });
    // prettier-ignore
    kdebug(`syscall[${vatID}].callNow(${target}/${dev}).${method}(${JSON.stringify(args)})`);
    const ret = syscallManager.invoke(dev, method, kernelData);
    const retSlots = ret.slots.map(slot => mapKernelSlotToVatSlot(slot));
    return harden({ ...ret, slots: retSlots });
  }

  let replayAbandonShip;
  function replay(name, ...args) {
    const s = playbackSyscalls.shift();
    if (djson.stringify(s.d) !== djson.stringify([name, ...args])) {
      console.log(`anachrophobia strikes vat ${vatID}`);
      console.log(`expected:`, djson.stringify(s.d));
      console.log(`got     :`, djson.stringify([name, ...args]));
      replayAbandonShip = new Error(`historical inaccuracy in replay-${name}`);
      throw replayAbandonShip;
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
  const dispatch = setup(syscall, state, helpers, vatPowers);
  if (!dispatch || dispatch.deliver === undefined) {
    throw new Error(
      `vat setup() failed to return a 'dispatch' with .deliver: ${dispatch}`,
    );
  }

  // dispatch handlers: these are used by the kernel core

  /**
   * Run a function, returning a promise that waits for the promise queue to be
   * empty before resolving.
   *
   * @param f  The function to run
   * @param errmsg  Tag string to be associated with the error message that gets
   *     logged if `f` rejects.
   *
   * The kernel uses `runAndWait` to wait for the vat to become quiescent (that
   * is, with nothing remaining on the promise queue) after a dispatch call.
   * Since the vat is never given direct access to the timer or IO queues (i.e.,
   * it can't call setImmediate, setInterval, or setTimeout), once the promise
   * queue is empty, the vat has lost "agency" (the ability to initiate further
   * execution).  The kernel *does not* wait for the dispatch handler's return
   * promise to resolve, since a malicious or erroneous vat might fail to do
   * so, and the kernel must be defensive against this.
   */
  function runAndWait(f, errmsg) {
    Promise.resolve()
      .then(f)
      .then(undefined, err => console.log(`doProcess: ${errmsg}:`, err));
    return waitUntilQuiescent();
  }

  async function doProcess(dispatchRecord, errmsg) {
    const dispatchOp = dispatchRecord[0];
    const dispatchArgs = dispatchRecord.slice(1);
    transcriptStartDispatch(dispatchRecord);
    await runAndWait(() => dispatch[dispatchOp](...dispatchArgs), errmsg);
    // TODO: if the vat is metered, and requested death-before-confusion,
    // then find the relevant meter, check whether it's exhausted, and react
    // somehow
    endOfCrankMeterTask();

    // TODO: if the dispatch failed, and we choose to destroy the vat, change
    // what we do with the transcript here.
    transcriptFinishDispatch();
  }

  function vatStats() {
    return vatKeeper.vatStats();
  }

  async function deliverOneMessage(target, msg) {
    insistMessage(msg);
    const targetSlot = mapKernelSlotToVatSlot(target);
    const { type } = parseVatSlot(targetSlot);
    if (type === 'object') {
      assert(parseVatSlot(targetSlot).allocatedByVat, 'deliver() to wrong vat');
    } else if (type === 'promise') {
      const p = kernelKeeper.getKernelPromise(target);
      assert(p.decider === vatID, 'wrong decider');
    }
    const inputSlots = msg.args.slots.map(slot => mapKernelSlotToVatSlot(slot));
    let resultSlot = null;
    if (msg.result) {
      insistKernelType('promise', msg.result);
      const p = kernelKeeper.getKernelPromise(msg.result);
      assert(
        p.state === 'unresolved',
        details`result ${msg.result} already resolved`,
      );
      assert(
        !p.decider,
        details`result ${msg.result} already has decider ${p.decider}`,
      );
      resultSlot = vatKeeper.mapKernelSlotToVatSlot(msg.result);
      insistVatType('promise', resultSlot);
      kernelKeeper.setDecider(msg.result, vatID);
    }
    kernelKeeper.incStat('dispatches');
    kernelKeeper.incStat('dispatchDeliver');
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
    assert(kp.state !== 'unresolved', details`spurious notification ${kpid}`);
    if (kp.state === 'fulfilledToPresence') {
      const vpid = mapKernelSlotToVatSlot(kpid);
      const slot = mapKernelSlotToVatSlot(kp.slot);
      vatKeeper.deleteCListEntry(kpid, vpid);
      kernelKeeper.incStat('dispatches');
      kernelKeeper.incStat('dispatchNotifyFulfillToPresence');
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
      deleteCListEntryIfEasy(kpid, vpid, kp.data);
      kernelKeeper.incStat('dispatches');
      kernelKeeper.incStat('dispatchNotifyFulfillToData');
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
      deleteCListEntryIfEasy(kpid, vpid, kp.data);
      kernelKeeper.incStat('dispatches');
      kernelKeeper.incStat('dispatchReject');
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
      if (replayAbandonShip) {
        // We really failed to start.
        throw replayAbandonShip;
      }
      playbackSyscalls = Array.from(t.syscalls);
      // We really don't care about "failed replays" because they're just
      // exceptions that have been raised in a normal event.
      //
      // If we really fail, replayAbandonShip is set.
      // eslint-disable-next-line no-await-in-loop
      await doProcess(t.d, null);
    }

    if (replayAbandonShip) {
      // We really failed to start.
      throw replayAbandonShip;
    }
    inReplay = false;
  }

  const manager = {
    mapKernelSlotToVatSlot,
    mapVatSlotToKernelSlot,
    deliverOneMessage,
    deliverOneNotification,
    replayTranscript,
    vatStats,
  };
  return manager;
}
