import { assert, Fail } from '@endo/errors';
import { insistKernelType } from './parseKernelSlots.js';
import { insistCapData } from '../lib/capdata.js';
import { insistDeviceID, insistVatID } from '../lib/id.js';

/** @type { KernelSyscallResult } */
const OKNULL = harden(['ok', null]);

export function makeKernelSyscallHandler(tools) {
  const {
    kernelKeeper,
    ephemeral,
    doSend,
    doSubscribe,
    doResolve,
    requestTermination,
    deviceHooks,
  } = tools;

  /** @type {{kvStore: KVStore}} */
  const { kvStore } = kernelKeeper;

  function send(target, msg) {
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallSend');
    doSend(target, msg);
    return OKNULL;
  }

  function exit(vatID, isFailure, info) {
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallExit');
    requestTermination(vatID, !!isFailure, info);
    return OKNULL;
  }

  function vatstoreKeyKey(vatID, key) {
    return `${vatID}.vs.${key}`;
  }

  function descopeVatstoreKey(vatID, dbKey) {
    const prefix = `${vatID}.vs.`;
    dbKey.startsWith(prefix) || Fail`${dbKey} must start with ${prefix}`;
    return dbKey.slice(prefix.length);
  }

  function vatstoreKeyInRange(vatID, key) {
    return key.startsWith(`${vatID}.vs.`);
  }

  /**
   *
   * @param {string} vatID
   * @param {string} key
   * @returns {KernelSyscallResult}
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
   * @param {string} vatID
   * @param {string} key
   * @param {string} value
   * @returns {KernelSyscallResult}
   */
  function vatstoreSet(vatID, key, value) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreSet');
    kvStore.set(actualKey, value);
    return OKNULL;
  }

  /**
   * Get the next vatstore key after 'priorKey' (in lexicographic
   * order, as defined by swingstore's getNextKey() function), or
   * undefined if this vat's portion of the vatstore has no more keys
   *
   * @param {string} vatID  The vat whose vatstore is being iterated
   * @param {string} priorKey A key before the desired key
   *
   * @returns {['ok', string|null]} A pair of a status code and
   *   a result value. In the case of this operation, the status code
   *   is always 'ok'. The result value is either a key or null.
   */
  function vatstoreGetNextKey(vatID, priorKey) {
    const dbPriorKey = vatstoreKeyKey(vatID, priorKey);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreGetNextKey');
    const nextDbKey = kvStore.getNextKey(dbPriorKey);
    if (nextDbKey) {
      if (vatstoreKeyInRange(vatID, nextDbKey)) {
        return harden(['ok', descopeVatstoreKey(vatID, nextDbKey)]);
      }
    }
    return harden(['ok', null]);
  }

  /**
   *
   * @param {string} vatID
   * @param {string} key
   * @returns {KernelSyscallResult}
   */

  function vatstoreDelete(vatID, key) {
    const actualKey = vatstoreKeyKey(vatID, key);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallVatstoreDelete');
    kvStore.delete(actualKey);
    return OKNULL;
  }

  /**
   *
   * @param {string} deviceSlot
   * @param {string} method
   * @param {SwingSetCapData} args
   * @returns {KernelSyscallResult}
   */
  function invoke(deviceSlot, method, args) {
    insistKernelType('device', deviceSlot);
    insistCapData(args);
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallCallNow');
    const deviceID = kernelKeeper.ownerOfKernelDevice(deviceSlot);
    insistDeviceID(deviceID);
    const dev = ephemeral.devices.get(deviceID);
    dev || Fail`unknown deviceRef ${deviceSlot}`;
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
    kernelKeeper.incStat('syscalls');
    kernelKeeper.incStat('syscallSubscribe');
    doSubscribe(vatID, kpid);
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
    Array.isArray(koids) || Fail`dropImports given non-Array ${koids}`;
    // all the work was done during translation, there's nothing to do here
    return OKNULL;
  }

  function retireImports(koids) {
    Array.isArray(koids) || Fail`retireImports given non-Array ${koids}`;
    // all the work was done during translation, there's nothing to do here
    return OKNULL;
  }

  function retireExports(koids) {
    Array.isArray(koids) || Fail`retireExports given non-Array ${koids}`;
    kernelKeeper.retireKernelObjects(koids);
    return OKNULL;
  }

  function abandonExports(vatID, koids) {
    Array.isArray(koids) || Fail`abandonExports given non-Array ${koids}`;
    for (const koid of koids) {
      kernelKeeper.orphanKernelObject(koid, vatID);
    }
    return OKNULL;
  }

  // callKernelHook is only available to devices

  function callKernelHook(deviceID, hookName, args) {
    const hooks = deviceHooks.get(deviceID);
    const hook = hooks[hookName];
    hook || Fail`device ${deviceID} has no hook named ${hookName}`;
    insistCapData(args);
    /** @type { SwingSetCapData } */
    const hres = hook(args);
    insistCapData(hres);
    /** @type { KernelSyscallResult } */
    const ksr = harden(['ok', hres]);
    return ksr;
  }

  /**
   * @param {KernelSyscallObject} ksc
   * @returns { KernelSyscallResult}
   */
  function kernelSyscallHandler(ksc) {
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
      case 'vatstoreGetNextKey': {
        const [_, ...args] = ksc;
        return vatstoreGetNextKey(...args);
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
      case 'abandonExports': {
        const [_, ...args] = ksc;
        return abandonExports(...args);
      }
      case 'callKernelHook': {
        const [_, ...args] = ksc;
        return callKernelHook(...args);
      }
      default: {
        throw Fail`unknown vatSyscall type ${ksc[0]}`;
      }
    }
  }

  return harden(kernelSyscallHandler);
}
