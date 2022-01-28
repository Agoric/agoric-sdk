// @ts-check

import { assert, details as X } from '@agoric/assert';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots.js';
import { insistMessage } from '../message.js';
import { insistCapData } from '../capdata.js';
import { insistDeviceID, insistVatID } from './id.js';

/** @type { KernelSyscallResult } */
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

  function descopeVatstoreKey(key) {
    return key.replace(/^([^.]+)\.vs\.(.+)$/, '$2');
  }

  let workingPriorKey;
  let workingLowerBound;
  let workingUpperBound;
  let workingKeyIterator;

  function clearVatStoreIteration() {
    workingPriorKey = undefined;
    workingLowerBound = undefined;
    workingUpperBound = undefined;
    workingKeyIterator = undefined;
  }

  /**
   *
   * @param { string } vatID
   * @param { string } key
   * @returns { KernelSyscallResult }
   */
  function vatstoreGet(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreGet');
    const value = kvStore.get(actualKey);
    return harden(['ok', value || null]);
  }

  /**
   *
   * @param { string } vatID
   * @param { string } key
   * @param { string } value
   * @returns { KernelSyscallResult }
   */
  function vatstoreSet(vatID, key, value) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreSet');
    kvStore.set(actualKey, value);
    clearVatStoreIteration();
    return OKNULL;
  }

  /**
   * Execute one step of iteration over a range of vatstore keys.
   *
   * @param {string} vatID  The vat whose vatstore is being iterated
   * @param {string} priorKey  The key that was returned by the prior cycle of
   *   the iteration, or '' if this is the first cycle
   * @param {string} lowerBound  The lower bound of the iteration range
   * @param {string} [upperBound]  The uppper bound of the iteration range.  If
   *   omitted, this defaults to a string equivalent to the `lowerBound` string
   *   with its rightmost character replaced by the lexically next character.
   *   For example, if `lowerBound` is 'hello', then `upperBound` would default
   *   to 'hellp')
   *
   * @returns { KernelSyscallResult } An 'ok' result can provide a pair of the key and value of the
   *   first vatstore entry whose key is lexically greater than both `priorKey`
   *   and `lowerBound`.  If there are no such entries or if the first such
   *   entry has a key that is lexically greater than or equal to `upperBound`,
   *   undefined is returned instead, signalling the end of iteration.
   *
   * Usage notes:
   *
   * Iteration is accomplished by repeatedly calling `vatstoreGetAfter` in a
   * loop, each time pass the key that was returned in the previous iteration,
   * until undefined is returned.  While the initial value for `priorKey` is
   * conventionally the empty string, in fact any value that is less than
   * `lowerBound` may be used to the same effect.
   *
   * Keys in the vatstore are arbitrary strings, but subsets of the keyspace are
   * often organized hierarchically.  This iteration API allows simple iteration
   * over an explicit key range or iteration over the set of keys with a given
   * prefix, depending on how you use it:
   *
   * Explicitly providing both a lower and an upper bound will enable iteration
   * over the key range `lowerBound` <= key < `upperBound`
   *
   * Providing only the lower bound while letting the upper bound default will
   * iterate over all keys that have `lowerBound` as a prefix.
   *
   * For example, if the stored keys are:
   * bar
   * baz
   * foocount
   * foopriority
   * joober
   * plugh.3
   * plugh.47
   * plugh.8
   * zot
   *
   * Then the bounds    would iterate over the key sequence
   * ----------------   -----------------------------------
   * 'bar', 'goomba'    bar, baz, foocount, foopriority
   * 'bar', 'joober'    bar, baz, foocount, foopriority
   * 'foo'              foocount, foopriority
   * 'plugh.'           plugh.3, plugh.47, plugh.8
   * 'baz', 'plugh'     baz, foocount, foopriority, joober
   * 'bar', '~'         bar, baz, foocount, foopriority, joober, plugh.3, plugh.47, plugh.8, zot
   */
  function vatstoreGetAfter(vatID, priorKey, lowerBound, upperBound) {
    const actualPriorKey = vatstoreKeyKey(vatID, priorKey);
    const actualLowerBound = vatstoreKeyKey(vatID, lowerBound);
    let actualUpperBound;
    if (upperBound) {
      actualUpperBound = vatstoreKeyKey(vatID, upperBound);
    } else {
      const lastChar = String.fromCharCode(
        actualLowerBound.slice(-1).charCodeAt(0) + 1,
      );
      actualUpperBound = `${actualLowerBound.slice(0, -1)}${lastChar}`;
    }
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreGetAfter');
    let nextIter;
    // Note that the working key iterator will be invalidated if the parameters
    // to `vatstoreGetAfter` don't correspond to the working key iterator's
    // belief about what iteration was in progress.  In particular, the bounds
    // incorporate the vatID.  Additionally, when this syscall is used for
    // iteration over a collection, the bounds also incorporate the collection
    // ID.  This ensures that uncoordinated concurrent iterations cannot
    // interfere with each other.  If such concurrent iterations *do* happen,
    // there will be a modest performance cost since the working key iterator
    // will have to be regenerated each time, but we expect this to be a rare
    // case since the normal use pattern is a single iteration in a loop within
    // a single crank.
    if (
      workingPriorKey === actualPriorKey &&
      workingLowerBound === actualLowerBound &&
      workingUpperBound === actualUpperBound &&
      workingKeyIterator
    ) {
      nextIter = workingKeyIterator.next();
    } else {
      let startKey;
      if (priorKey === '') {
        startKey = actualLowerBound;
      } else {
        startKey = actualPriorKey;
      }
      assert(actualLowerBound <= startKey);
      assert(actualLowerBound < actualUpperBound);
      assert(startKey < actualUpperBound);
      workingLowerBound = actualLowerBound;
      workingUpperBound = actualUpperBound;
      workingKeyIterator = kvStore.getKeys(startKey, actualUpperBound);
      nextIter = workingKeyIterator.next();
      if (!nextIter.done && nextIter.value === actualPriorKey) {
        nextIter = workingKeyIterator.next();
      }
    }
    if (nextIter.done) {
      clearVatStoreIteration();
      return harden(['ok', null]);
    } else {
      const nextKey = nextIter.value;
      const resultValue = kvStore.get(nextKey);
      workingPriorKey = nextKey;
      const resultKey = descopeVatstoreKey(nextKey);
      return harden(['ok', [resultKey, resultValue]]);
    }
  }

  /**
   *
   * @param { string } vatID
   * @param { string } key
   * @returns { KernelSyscallResult }
   */

  function vatstoreDelete(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreDelete');
    kvStore.delete(actualKey);
    clearVatStoreIteration();
    return OKNULL;
  }

  /**
   *
   * @param { string } deviceSlot
   * @param { string } method
   * @param { SwingSetCapData } args
   * @returns { KernelSyscallResult }
   */
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
    /** @type { DeviceInvocationResult } */
    const dr = dev.manager.invoke(di);
    /** @type { KernelSyscallResult } */
    const kr = dev.translators.deviceResultToKernelResult(dr);
    assert.equal(kr.length, 2);
    if (kr[0] === 'ok') {
      insistCapData(kr[1]);
    } else {
      assert.equal(kr[0], 'error');
      assert.typeof(kr[1], 'string');
    }
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

  /**
   * @param { KernelSyscallObject } ksc
   * @returns {  KernelSyscallResult }
   */
  function doKernelSyscall(ksc) {
    // this repeated pattern is necessary to get the typechecker to refine 'ksc' and 'args' properly
    switch (ksc[0]) {
      case 'send': {
        const [_, ...args] = ksc;
        return send(...args);
      }
      case 'invoke': {
        const [_, ...args] = ksc;
        return invoke(...args);
      }
      case 'subscribe': {
        const [_, ...args] = ksc;
        return subscribe(...args);
      }
      case 'resolve': {
        const [_, ...args] = ksc;
        return resolve(...args);
      }
      case 'exit': {
        const [_, ...args] = ksc;
        return exit(...args);
      }
      case 'vatstoreGet': {
        const [_, ...args] = ksc;
        return vatstoreGet(...args);
      }
      case 'vatstoreSet': {
        const [_, ...args] = ksc;
        return vatstoreSet(...args);
      }
      case 'vatstoreGetAfter': {
        const [_, ...args] = ksc;
        return vatstoreGetAfter(...args);
      }
      case 'vatstoreDelete': {
        const [_, ...args] = ksc;
        return vatstoreDelete(...args);
      }
      case 'dropImports': {
        const [_, ...args] = ksc;
        return dropImports(...args);
      }
      case 'retireImports': {
        const [_, ...args] = ksc;
        return retireImports(...args);
      }
      case 'retireExports': {
        const [_, ...args] = ksc;
        return retireExports(...args);
      }
      default:
        assert.fail(X`unknown vatSyscall type ${ksc[0]}`);
    }
  }

  const kernelSyscallHandler = harden({
    send, // TODO remove these individual ones
    doKernelSyscall,
  });
  return kernelSyscallHandler;
}
