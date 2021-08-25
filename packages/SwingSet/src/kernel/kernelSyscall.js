import { assert, details as X } from '@agoric/assert';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots.js';
import { insistMessage } from '../message.js';
import { insistCapData } from '../capdata.js';
import { insistDeviceID, insistVatID } from './id.js';

const OKNULL = harden(['ok', null]);

export function doSend(kernelKeeper, target, msg) {
  parseKernelSlot(target);
  insistMessage(msg);
  const m = harden({ type: 'send', target, msg });
  kernelKeeper.incrementRefCount(target, `enq|msg|t`);
  if (msg.result) {
    kernelKeeper.incrementRefCount(msg.result, `enq|msg|r`);
  }
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
    doResolve,
    setTerminationTrigger,
  } = tools;

  const { kvStore } = kernelKeeper;

  function send(target, msg) {
    return doSend(kernelKeeper, target, msg);
  }

  function exit(vatID, isFailure, info) {
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallExit');
    setTerminationTrigger(vatID, false, !!isFailure, info);
    return OKNULL;
  }

  function vatstoreKeyKey(vatID, key) {
    return `${vatID}.vs.${key}`;
  }

  let workingKeyPrefix;
  let workingPriorKey;
  let workingKeyIterator;

  function clearVatStoreIteration() {
    workingKeyPrefix = undefined;
    workingPriorKey = undefined;
    workingKeyIterator = undefined;
  }

  function vatstoreGet(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreGet');
    const value = kvStore.get(actualKey);
    return harden(['ok', value || null]);
  }

  function vatstoreSet(vatID, key, value) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreSet');
    kvStore.set(actualKey, value);
    clearVatStoreIteration();
    return OKNULL;
  }

  function vatstoreGetAfter(vatID, keyPrefix, priorKey) {
    const actualKeyPrefix = vatstoreKeyKey(vatID, keyPrefix);
    const actualPriorKey = vatstoreKeyKey(vatID, priorKey);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreGetAfter');
    let nextIter;
    if (
      workingKeyPrefix === actualKeyPrefix &&
      workingPriorKey === actualPriorKey &&
      workingKeyIterator
    ) {
      nextIter = workingKeyIterator.next();
    } else {
      let startKey;
      if (priorKey === '') {
        startKey = actualKeyPrefix;
      } else {
        startKey = actualPriorKey;
      }
      assert(startKey.startsWith(actualKeyPrefix));
      const lastChar = String.fromCharCode(
        actualKeyPrefix.slice(-1).charCodeAt(0) + 1,
      );
      const endKey = `${actualKeyPrefix.slice(0, -1)}${lastChar}`;
      workingKeyPrefix = actualKeyPrefix;
      workingKeyIterator = kvStore.getKeys(startKey, endKey);
      nextIter = workingKeyIterator.next();
      if (!nextIter.done && nextIter.value === actualPriorKey) {
        nextIter = workingKeyIterator.next();
      }
    }
    if (nextIter.done) {
      clearVatStoreIteration();
      return harden(['ok', undefined]);
    } else {
      const nextKey = nextIter.value;
      const resultValue = kvStore.get(nextKey);
      workingPriorKey = nextKey;
      const resultKey = nextKey.slice(vatID.length + 4); // `${vatID}.vs.`.length
      return harden(['ok', [resultKey, resultValue]]);
    }
  }

  function vatstoreDelete(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreDelete');
    kvStore.delete(actualKey);
    clearVatStoreIteration();
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
    // all the work was done during translation, there's nothing to do here
    return OKNULL;
  }

  function retireImports(koids) {
    assert(Array.isArray(koids), X`retireImports given non-Array ${koids}`);
    // all the work was done during translation, there's nothing to do here
    return OKNULL;
  }

  function retireExports(koids) {
    assert(Array.isArray(koids), X`retireExports given non-Array ${koids}`);
    const newActions = [];
    for (const koid of koids) {
      const importers = kernelKeeper.getImporters(koid);
      for (const vatID of importers) {
        newActions.push(`${vatID} retireImport ${koid}`);
      }
      // TODO: decref and delete any #2069 auxdata
      kernelKeeper.deleteKernelObject(koid);
    }
    kernelKeeper.addGCActions(newActions);
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
      case 'vatstoreGetAfter':
        return vatstoreGetAfter(...args);
      case 'vatstoreDelete':
        return vatstoreDelete(...args);
      case 'dropImports':
        return dropImports(...args);
      case 'retireImports':
        return retireImports(...args);
      case 'retireExports':
        return retireExports(...args);
      default:
        assert.fail(X`unknown vatSyscall type ${type}`);
    }
  }

  const kernelSyscallHandler = harden({
    send, // TODO remove these individual ones
    doKernelSyscall,
  });
  return kernelSyscallHandler;
}
