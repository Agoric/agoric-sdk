import { assert, details as X } from '@agoric/assert';
import { insistMessage } from '../message.js';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots.js';
import { insistVatType, parseVatSlot } from '../parseVatSlots.js';
import { insistCapData } from '../capdata.js';
import { kdebug, legibilizeMessageArgs, legibilizeValue } from './kdebug.js';

const reapMessageVatDelivery = harden(['bringOutYourDead']);

/*
 * Return a function that converts KernelDelivery objects into VatDelivery
 * objects
 */
function makeTranslateKernelDeliveryToVatDelivery(vatID, kernelKeeper) {
  const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
  const { mapKernelSlotToVatSlot } = vatKeeper;

  // msg is { method, args, result }, all slots are kernel-centric
  function translateMessage(target, msg) {
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
        X`result ${msg.result} already resolved`,
      );
      assert(
        !p.decider,
        X`result ${msg.result} already has decider ${p.decider}`,
      );
      resultSlot = vatKeeper.mapKernelSlotToVatSlot(msg.result);
      insistVatType('promise', resultSlot);
      kernelKeeper.setDecider(msg.result, vatID);
    }

    const vatMessage = harden({
      method: msg.method,
      args: { ...msg.args, slots: inputSlots },
      result: resultSlot,
    });
    const vatDelivery = harden(['message', targetSlot, vatMessage]);
    return vatDelivery;
  }

  function translatePromiseDescriptor(kp) {
    if (kp.state === 'fulfilled' || kp.state === 'rejected') {
      return [
        kp.state === 'rejected',
        {
          ...kp.data,
          slots: kp.data.slots.map(slot => mapKernelSlotToVatSlot(slot)),
        },
      ];
    } else if (kp.state === 'redirected') {
      // TODO unimplemented
      throw new Error('not implemented yet');
    } else {
      assert.fail(X`unknown kernelPromise state '${kp.state}'`);
    }
  }

  function translateNotify(kResolutions) {
    const vResolutions = [];
    let idx = 0;
    for (const resolution of kResolutions) {
      const [kpid, p] = resolution;
      assert(p.state !== 'unresolved', X`spurious notification ${kpid}`);
      const vpid = mapKernelSlotToVatSlot(kpid);
      const vres = [vpid, ...translatePromiseDescriptor(p)];
      vResolutions.push(vres);
      kdebug(`notify ${idx} ${kpid} ${JSON.stringify(vres)}`);
      idx += 1;
    }
    const vatDelivery = harden(['notify', vResolutions]);
    return vatDelivery;
  }

  const gcDeliveryMapOpts = { setReachable: false, required: true };
  function translateDropExports(krefs) {
    const vrefs = krefs.map(kref =>
      mapKernelSlotToVatSlot(kref, gcDeliveryMapOpts),
    );
    krefs.map(kref => vatKeeper.clearReachableFlag(kref, 'dropE'));
    const vatDelivery = harden(['dropExports', vrefs]);
    return vatDelivery;
  }

  function translateRetireExports(krefs) {
    const vrefs = [];
    for (const kref of krefs) {
      const vref = mapKernelSlotToVatSlot(kref, gcDeliveryMapOpts);
      vatKeeper.deleteCListEntry(kref, vref);
      vrefs.push(vref);
    }
    const vatDelivery = harden(['retireExports', vrefs]);
    return vatDelivery;
  }

  function translateRetireImports(krefs) {
    const vrefs = [];
    for (const kref of krefs) {
      const vref = mapKernelSlotToVatSlot(kref, gcDeliveryMapOpts);
      vatKeeper.deleteCListEntry(kref, vref);
      vrefs.push(vref);
    }
    const vatDelivery = harden(['retireImports', vrefs]);
    return vatDelivery;
  }

  function translateBringOutYourDead() {
    return reapMessageVatDelivery;
  }

  function kernelDeliveryToVatDelivery(kd) {
    const [type, ...args] = kd;
    switch (type) {
      case 'message':
        return translateMessage(...args);
      case 'notify':
        return translateNotify(...args);
      case 'dropExports':
        return translateDropExports(...args);
      case 'retireExports':
        return translateRetireExports(...args);
      case 'retireImports':
        return translateRetireImports(...args);
      case 'bringOutYourDead':
        return translateBringOutYourDead(...args);
      default:
        assert.fail(X`unknown kernelDelivery.type ${type}`);
    }
    // returns one of:
    //  ['message', target, msg]
    //  ['notify', resolutions]
    //  ['dropExports', vrefs]
    //  ['retireExports', vrefs]
    //  ['retireImports', vrefs]
    //  ['bringOutYourDead']
  }

  return kernelDeliveryToVatDelivery;
}

export function insistValidVatstoreKey(key) {
  assert.typeof(key, 'string');
  assert(key.match(/^[-\w.+/]+$/), 'invalid vatstore key');
}

/*
 * return a function that converts VatSyscall objects into KernelSyscall
 * objects
 */
function makeTranslateVatSyscallToKernelSyscall(vatID, kernelKeeper) {
  const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
  const { mapVatSlotToKernelSlot, clearReachableFlag } = vatKeeper;

  function translateSend(targetSlot, msg) {
    assert.typeof(targetSlot, 'string', 'non-string targetSlot');
    insistMessage(msg);
    const { method, args, result: resultSlot } = msg;
    insistCapData(args);
    // TODO: disable send-to-self for now, qv issue #43
    const target = mapVatSlotToKernelSlot(targetSlot);
    const argList = legibilizeMessageArgs(args).join(', ');
    // prettier-ignore
    kdebug(`syscall[${vatID}].send(${targetSlot}/${target}).${method}(${argList})`);
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
        X`send() result ${result} is already resolved`,
      );
      assert(
        p.decider === vatID,
        X`send() result ${result} is decided by ${p.decider} not ${vatID}`,
      );
      kernelKeeper.clearDecider(result);
      // resolution authority now held by run-queue
    }

    const kmsg = harden({
      method,
      args: kernelArgs,
      result,
    });
    insistMessage(kmsg);
    const ks = harden(['send', target, kmsg]);
    return ks;
  }

  function translateExit(isFailure, info) {
    insistCapData(info);
    kdebug(`syscall[${vatID}].exit(${isFailure},${legibilizeValue(info)})`);
    const kernelSlots = info.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelInfo = harden({ ...info, slots: kernelSlots });
    return harden(['exit', vatID, !!isFailure, kernelInfo]);
  }

  function translateVatstoreGet(key) {
    insistValidVatstoreKey(key);
    kdebug(`syscall[${vatID}].vatstoreGet(${key})`);
    return harden(['vatstoreGet', vatID, key]);
  }

  function translateVatstoreSet(key, value) {
    insistValidVatstoreKey(key);
    assert.typeof(value, 'string');
    kdebug(`syscall[${vatID}].vatstoreSet(${key},${value})`);
    return harden(['vatstoreSet', vatID, key, value]);
  }

  function translateVatstoreGetAfter(priorKey, lowerBound, upperBound) {
    if (priorKey !== '') {
      insistValidVatstoreKey(priorKey);
    }
    insistValidVatstoreKey(lowerBound);
    if (upperBound) {
      insistValidVatstoreKey(upperBound);
    }
    kdebug(
      `syscall[${vatID}].vatstoreGetAfter(${priorKey}, ${lowerBound}, ${upperBound})`,
    );
    return harden([
      'vatstoreGetAfter',
      vatID,
      priorKey,
      lowerBound,
      upperBound,
    ]);
  }

  function translateVatstoreDelete(key) {
    insistValidVatstoreKey(key);
    kdebug(`syscall[${vatID}].vatstoreDelete(${key})`);
    return harden(['vatstoreDelete', vatID, key]);
  }

  const gcSyscallMapOpts = { required: true, setReachable: false };

  function translateDropImports(vrefs) {
    assert(Array.isArray(vrefs), X`dropImports() given non-Array ${vrefs}`);
    const krefs = vrefs.map(vref => {
      const { type, allocatedByVat } = parseVatSlot(vref);
      assert.equal(type, 'object');
      assert.equal(allocatedByVat, false); // drop *imports*, not exports
      // we translate into krefs, *not* setting the reachable flag
      const kref = mapVatSlotToKernelSlot(vref, gcSyscallMapOpts);
      // and we clear the reachable flag, which might the decrement the
      // reachable refcount, which might tag the kref for processing
      clearReachableFlag(kref, 'dropI');
      return kref;
    });
    kdebug(`syscall[${vatID}].dropImports(${krefs.join(' ')})`);
    // we've done all the work here, during translation
    return harden(['dropImports', krefs]);
  }

  function translateRetireImports(vrefs) {
    assert(Array.isArray(vrefs), X`retireImports() given non-Array ${vrefs}`);
    const krefs = vrefs.map(vref => {
      const { type, allocatedByVat } = parseVatSlot(vref);
      assert.equal(type, 'object');
      assert.equal(allocatedByVat, false); // retire *imports*, not exports
      const kref = mapVatSlotToKernelSlot(vref, gcSyscallMapOpts);
      if (vatKeeper.getReachableFlag(kref)) {
        throw Error(`syscall.retireImports but ${vref} is still reachable`);
      }
      // deleting the clist entry will decrement the recognizable count, but
      // not the reachable count (because it was unreachable, as we asserted)
      vatKeeper.deleteCListEntry(kref, vref);
      return kref;
    });
    kdebug(`syscall[${vatID}].retireImports(${krefs.join(' ')})`);
    // we've done all the work here, during translation
    return harden(['retireImports', krefs]);
  }

  function translateRetireExports(vrefs) {
    assert(Array.isArray(vrefs), X`retireExports() given non-Array ${vrefs}`);
    const krefs = vrefs.map(vref => {
      const { type, allocatedByVat } = parseVatSlot(vref);
      assert.equal(type, 'object');
      assert.equal(allocatedByVat, true); // retire *exports*, not imports
      // kref must already be in the clist
      const kref = mapVatSlotToKernelSlot(vref, gcSyscallMapOpts);
      vatKeeper.insistNotReachable(kref);
      vatKeeper.deleteCListEntry(kref, vref);
      return kref;
    });
    kdebug(`syscall[${vatID}].retireExports(${krefs.join(' ')})`);
    // retireExports still has work to do
    return harden(['retireExports', krefs]);
  }

  function translateCallNow(target, method, args) {
    insistCapData(args);
    const dev = mapVatSlotToKernelSlot(target);
    const { type } = parseKernelSlot(dev);
    assert(type === 'device', X`doCallNow must target a device, not ${dev}`);
    for (const slot of args.slots) {
      assert(
        parseVatSlot(slot).type !== 'promise',
        `syscall.callNow() args cannot include promises like ${slot}`,
      );
    }
    const kernelSlots = args.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelData = harden({ ...args, slots: kernelSlots });
    // prettier-ignore
    kdebug(`syscall[${vatID}].callNow(${target}/${dev}).${method}(${JSON.stringify(args)})`);
    return harden(['invoke', dev, method, kernelData]);
  }

  function translateSubscribe(vpid) {
    const kpid = mapVatSlotToKernelSlot(vpid);
    kdebug(`syscall[${vatID}].subscribe(${vpid}/${kpid})`);
    assert(
      kernelKeeper.hasKernelPromise(kpid),
      X`unknown kernelPromise id '${kpid}'`,
    );
    const ks = harden(['subscribe', vatID, kpid]);
    return ks;
  }

  function translateResolve(vresolutions) {
    const kresolutions = [];
    const kpidsResolved = [];
    let idx = 0;
    for (const resolution of vresolutions) {
      const [vpid, rejected, data] = resolution;
      insistVatType('promise', vpid);
      insistCapData(data);
      const kpid = mapVatSlotToKernelSlot(vpid);
      const kernelSlots = data.slots.map(slot => mapVatSlotToKernelSlot(slot));
      const kernelData = harden({ ...data, slots: kernelSlots });
      kdebug(
        `syscall[${vatID}].resolve[${idx}](${vpid}/${kpid}, ${rejected}) = ${
          data.body
        } ${JSON.stringify(data.slots)}/${JSON.stringify(kernelSlots)}`,
      );
      idx += 1;
      kresolutions.push([kpid, rejected, kernelData]);
      kpidsResolved.push(kpid);
    }
    vatKeeper.deleteCListEntriesForKernelSlots(kpidsResolved);
    return harden(['resolve', vatID, kresolutions]);
  }

  // vsc is [type, ...args]
  // ksc is:
  //  ['send', ktarget, kmsg]
  /**
   *
   * @param { VatSyscallObject } vsc
   * @returns { KernelSyscallObject }
   */
  function vatSyscallToKernelSyscall(vsc) {
    const [type, ...args] = vsc;
    switch (type) {
      case 'send':
        return translateSend(...args);
      case 'callNow':
        return translateCallNow(...args); // becomes invoke()
      case 'subscribe':
        return translateSubscribe(...args);
      case 'resolve':
        return translateResolve(...args);
      case 'exit':
        return translateExit(...args);
      case 'vatstoreGet':
        return translateVatstoreGet(...args);
      case 'vatstoreSet':
        return translateVatstoreSet(...args);
      case 'vatstoreGetAfter':
        return translateVatstoreGetAfter(...args);
      case 'vatstoreDelete':
        return translateVatstoreDelete(...args);
      case 'dropImports':
        return translateDropImports(...args);
      case 'retireImports':
        return translateRetireImports(...args);
      case 'retireExports':
        return translateRetireExports(...args);
      default:
        assert.fail(X`unknown vatSyscall type ${type}`);
    }
  }

  return vatSyscallToKernelSyscall;
}

/*
 * return a function that converts KernelSyscallResult objects into
 * VatSyscallResult objects
 */
function makeTranslateKernelSyscallResultToVatSyscallResult(
  vatID,
  kernelKeeper,
) {
  const vatKeeper = kernelKeeper.provideVatKeeper(vatID);

  const { mapKernelSlotToVatSlot } = vatKeeper;

  // Most syscalls return ['ok', null], but callNow() returns ['ok', capdata]
  // and vatstoreGet() returns ['ok', string] or ['ok', undefined], and
  // invoke() can return ['error', problem].
  /**
   *
   * @param { string } type
   * @param { KernelSyscallResult } kres
   * @returns { VatSyscallResult }
   */
  function kernelSyscallResultToVatSyscallResult(type, kres) {
    const [successFlag, resultData] = kres;
    switch (type) {
      case 'invoke': {
        if (successFlag === 'ok') {
          insistCapData(resultData);
          // prettier-ignore
          const slots =
                resultData.slots.map(slot => mapKernelSlotToVatSlot(slot));
          const vdata = { ...resultData, slots };
          const vres = harden(['ok', vdata]);
          return vres;
        } else {
          return harden([kres[0], kres[1]]);
        }
      }
      case 'vatstoreGet':
        assert(successFlag === 'ok', 'unexpected KSR error');
        if (resultData) {
          assert.typeof(resultData, 'string');
          return harden(['ok', resultData]);
        } else {
          return harden(['ok', undefined]);
        }
      case 'vatstoreGetAfter':
        assert(successFlag === 'ok', 'unexpected KSR error');
        if (resultData) {
          assert(Array.isArray(resultData));
          return harden(['ok', resultData]);
        } else {
          return harden(['ok', undefined]);
        }
      default:
        assert(successFlag === 'ok', 'unexpected KSR error');
        assert(resultData === null);
        return harden(['ok', null]);
    }
  }

  return kernelSyscallResultToVatSyscallResult;
}

export function makeVatTranslators(vatID, kernelKeeper) {
  const mKD = makeTranslateKernelDeliveryToVatDelivery;
  const mVS = makeTranslateVatSyscallToKernelSyscall;
  const mKSR = makeTranslateKernelSyscallResultToVatSyscallResult;

  return harden({
    kernelDeliveryToVatDelivery: mKD(vatID, kernelKeeper),
    vatSyscallToKernelSyscall: mVS(vatID, kernelKeeper),
    kernelSyscallResultToVatSyscallResult: mKSR(vatID, kernelKeeper),
  });
}
