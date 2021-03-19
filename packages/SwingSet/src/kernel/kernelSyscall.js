import { assert, details as X } from '@agoric/assert';
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
    storage,
    ephemeral,
    notify,
    doResolve,
    setTerminationTrigger,
  } = tools;

  function send(target, msg) {
    return doSend(kernelKeeper, target, msg);
  }

  function exit(vatID, isFailure, info) {
    setTerminationTrigger(vatID, false, !!isFailure, info);
    return OKNULL;
  }

  function vatstoreKeyKey(vatID, key) {
    return `${vatID}.vs.${key}`;
  }

  function vatstoreGet(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    const value = storage.get(actualKey);
    return harden(['ok', value || null]);
  }

  function vatstoreSet(vatID, key, value) {
    const actualKey = vatstoreKeyKey(vatID, key);
    storage.set(actualKey, value);
    return OKNULL;
  }

  function vatstoreDelete(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    storage.delete(actualKey);
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
    assert(dev, X`unknown deviceRef ${deviceSlot}`);
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

  function resolve(vatID, resolutions) {
    insistVatID(vatID);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallResolve');
    doResolve(vatID, resolutions);
    return OKNULL;
  }

  function dropImports(koids) {
    assert(Array.isArray(koids), X`dropImports given non-Array ${koids}`);
    console.log(`-- kernel ignoring dropImports ${koids.join(',')}`);
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
      case 'resolve':
        return resolve(...args);
      case 'exit':
        return exit(...args);
      case 'vatstoreGet':
        return vatstoreGet(...args);
      case 'vatstoreSet':
        return vatstoreSet(...args);
      case 'vatstoreDelete':
        return vatstoreDelete(...args);
      case 'dropImports':
        return dropImports(...args);
      default:
        assert.fail(X`unknown vatSyscall type ${type}`);
    }
  }

  const kernelSyscallHandler = harden({
    send, // TODO remove these individual ones
    invoke,
    subscribe,
    resolve,
    doKernelSyscall,
  });
  return kernelSyscallHandler;
}
