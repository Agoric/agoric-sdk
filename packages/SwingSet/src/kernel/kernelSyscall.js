import { assert } from '@agoric/assert';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { insistMessage } from '../message';
import { insistCapData } from '../capdata';
import { insistDeviceID, insistVatID } from './id';

const OKNULL = harden(['ok', null]);

export function doSend(kernelKeeper, target, msg) {
  parseKernelSlot(target);
  insistMessage(msg);
  const m = harden({ type: 'send', target, msg });
  kernelKeeper.incrementRefCount(target, `enq|msg|t`);
  kernelKeeper.incrementRefCount(msg.result, `enq|msg|r`);
  kernelKeeper.incStat('syscalls');
  kernelKeeper.incStat('syscallSend');
  let idx = 0;
  for (const argSlot of msg.args.slots) {
    kernelKeeper.incrementRefCount(argSlot, `enq|msg|s${idx}`);
    idx += 1;
  }
  kernelKeeper.addToRunQueue(m);
  return OKNULL;
}

export function makeKernelSyscallHandler(tools) {
  const {
    kernelKeeper,
    ephemeral,
    notify,
    notifySubscribersAndQueue,
    resolveToError,
    setTerminationTrigger,
  } = tools;

  function send(target, msg) {
    return doSend(kernelKeeper, target, msg);
  }

  function exit(vatID, isFailure, info) {
    setTerminationTrigger(vatID, false, !!isFailure, info);
    return OKNULL;
  }

  function invoke(deviceSlot, method, args) {
    insistKernelType('device', deviceSlot);
    insistCapData(args);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallCallNow');
    const deviceID = kernelKeeper.ownerOfKernelDevice(deviceSlot);
    insistDeviceID(deviceID);
    const dev = ephemeral.devices.get(deviceID);
    if (!dev) {
      throw new Error(`unknown deviceRef ${deviceSlot}`);
    }
    const ki = harden([deviceSlot, method, args]);
    const di = dev.translators.kernelInvocationToDeviceInvocation(ki);
    const dr = dev.manager.invoke(di);
    const kr = dev.translators.deviceResultToKernelResult(dr);
    assert(kr.length === 2);
    assert(kr[0] === 'ok');
    insistCapData(kr[1]);
    return kr;
  }

  function subscribe(vatID, kpid) {
    insistVatID(vatID);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallSubscribe');
    const p = kernelKeeper.getKernelPromise(kpid);
    if (p.state === 'unresolved') {
      kernelKeeper.addSubscriberToPromise(kpid, vatID);
    } else {
      // otherwise it's already resolved, you probably want to know how
      notify(vatID, kpid);
    }
    return OKNULL;
  }

  function fulfillToPresence(vatID, kpid, targetSlot) {
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    insistKernelType('object', targetSlot);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallFulfillToPresence');
    const p = kernelKeeper.getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    kernelKeeper.fulfillKernelPromiseToPresence(kpid, targetSlot);
    notifySubscribersAndQueue(kpid, vatID, subscribers, queue);
    // todo: some day it'd be nice to delete the promise table entry now. To
    // do that correctly, we must make sure no vats still hold pointers to
    // it, which means vats must drop their refs when they get notified about
    // the resolution ("you knew it was resolved, you shouldn't be sending
    // any more messages to it, send them to the resolution instead"), and we
    // must wait for those notifications to be delivered.
    if (p.policy === 'logAlways') {
      console.log(`${kpid}.policy logAlways: fulfillToPresence ${targetSlot}`);
    }
    return OKNULL;
  }

  function fulfillToData(vatID, kpid, data) {
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    insistCapData(data);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallFulfillToData');
    const p = kernelKeeper.getResolveablePromise(kpid, vatID);
    const { subscribers, queue } = p;
    let idx = 0;
    for (const dataSlot of data.slots) {
      kernelKeeper.incrementRefCount(dataSlot, `fulfill|s${idx}`);
      idx += 1;
    }
    kernelKeeper.fulfillKernelPromiseToData(kpid, data);
    notifySubscribersAndQueue(kpid, vatID, subscribers, queue);
    if (p.policy === 'logAlways') {
      console.log(
        `${kpid}.policy logAlways: fulfillToData ${JSON.stringify(data)}`,
      );
    }
    return OKNULL;
  }

  function reject(vatID, kpid, data) {
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    insistCapData(data);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallReject');
    resolveToError(kpid, data, vatID);
    return OKNULL;
  }

  function doKernelSyscall(ksc) {
    const [type, ...args] = ksc;
    switch (type) {
      case 'send':
        return send(...args);
      case 'invoke':
        return invoke(...args);
      case 'subscribe':
        return subscribe(...args);
      case 'fulfillToPresence':
        return fulfillToPresence(...args);
      case 'fulfillToData':
        return fulfillToData(...args);
      case 'reject':
        return reject(...args);
      case 'exit':
        return exit(...args);
      default:
        throw Error(`unknown vatSyscall type ${type}`);
    }
  }

  const kernelSyscallHandler = harden({
    send, // TODO remove these individual ones
    invoke,
    subscribe,
    fulfillToPresence,
    fulfillToData,
    reject,
    doKernelSyscall,
  });
  return kernelSyscallHandler;
}
