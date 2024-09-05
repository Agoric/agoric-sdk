import { assert, Fail } from '@endo/errors';
import { insistMessage } from '../lib/message.js';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots.js';
import { insistVatType, parseVatSlot } from '../lib/parseVatSlots.js';
import { extractSingleSlot, insistCapData } from '../lib/capdata.js';
import {
  kdebug,
  legibilizeMessageArgs,
  legibilizeValue,
} from '../lib/kdebug.js';

export function assertValidVatstoreKey(key) {
  assert.typeof(key, 'string');
}

/**
 * @import {VatDeliveryObject} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryMessage} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryNotify} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryDropExports} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryRetireExports} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryRetireImports} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryChangeVatOptions} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryStartVat} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryStopVat} from '@agoric/swingset-liveslots'
 * @import {VatDeliveryBringOutYourDead} from '@agoric/swingset-liveslots'
 *
 * @import {VatOneResolution} from '@agoric/swingset-liveslots'
 *
 */

/**
 * Return a function that converts KernelDelivery objects into VatDelivery
 * objects
 *
 * @param {string} vatID
 * @param {KernelKeeper} kernelKeeper
 * @returns {(kd: KernelDeliveryObject) => VatDeliveryObject}
 */
function makeTranslateKernelDeliveryToVatDelivery(vatID, kernelKeeper) {
  const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
  const { mapKernelSlotToVatSlot } = vatKeeper;

  // msg is { methargs, result }, all slots are kernel-centric
  function translateMessage(target, msg) {
    insistMessage(msg);
    const targetSlot = mapKernelSlotToVatSlot(target);
    const { type } = parseVatSlot(targetSlot);
    if (type === 'object') {
      parseVatSlot(targetSlot).allocatedByVat || Fail`deliver() to wrong vat`;
    } else if (type === 'promise') {
      const p = kernelKeeper.getKernelPromise(target);
      p.decider === vatID || Fail`wrong decider`;
    }
    const inputSlots = msg.methargs.slots.map(slot =>
      mapKernelSlotToVatSlot(slot),
    );
    let resultSlot = null;
    if (msg.result) {
      insistKernelType('promise', msg.result);
      const p = kernelKeeper.getKernelPromise(msg.result);
      p.state === 'unresolved' || Fail`result ${msg.result} already resolved`;
      !p.decider || Fail`result ${msg.result} already has decider ${p.decider}`;
      resultSlot = vatKeeper.mapKernelSlotToVatSlot(msg.result);
      insistVatType('promise', resultSlot);
      kernelKeeper.setDecider(msg.result, vatID);
    }

    const vatMessage = harden({
      methargs: { ...msg.methargs, slots: inputSlots },
      result: resultSlot,
    });
    /** @type { VatDeliveryMessage } */
    const vatDelivery = harden(['message', targetSlot, vatMessage]);
    return vatDelivery;
  }

  /**
   *
   * @param {{ state: string, data: SwingSetCapData }} kp
   * @returns { [ isReject: boolean, resolution: SwingSetCapData ]}
   */
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
      // NOTE: When adding redirection / forwarding, we must handle any
      // pipelined messages pending in the kernel queues
      throw Error('not implemented yet');
    } else {
      throw Fail`unknown kernelPromise state '${kp.state}'`;
    }
  }

  /**
   *
   * @param {KernelDeliveryOneNotify[]} kResolutions
   * @returns {VatDeliveryNotify}
   */
  function translateNotify(kResolutions) {
    const vResolutions = [];
    let idx = 0;
    for (const resolution of kResolutions) {
      const [kpid, p] = resolution;
      p.state !== 'unresolved' || Fail`spurious notification ${kpid}`;
      const vpid = mapKernelSlotToVatSlot(kpid);
      /** @type { VatOneResolution } */
      const vres = [vpid, ...translatePromiseDescriptor(p)];
      vResolutions.push(vres);
      kdebug(`notify ${idx} ${kpid} ${JSON.stringify(vres)}`);
      idx += 1;
    }
    /** @type { VatDeliveryNotify } */
    const vatDelivery = harden(['notify', vResolutions]);
    return vatDelivery;
  }

  const gcDeliveryMapOpts = { setReachable: false, required: true };
  function translateDropExports(krefs) {
    const vrefs = krefs.map(kref =>
      mapKernelSlotToVatSlot(kref, gcDeliveryMapOpts),
    );
    for (const kref of krefs) {
      vatKeeper.clearReachableFlag(kref, 'dropE');
    }
    /** @type { VatDeliveryDropExports } */
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
    /** @type { VatDeliveryRetireExports } */
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
    /** @type { VatDeliveryRetireImports } */
    const vatDelivery = harden(['retireImports', vrefs]);
    return vatDelivery;
  }

  /**
   *
   * @param {Record<string, unknown>} options
   * @returns {VatDeliveryChangeVatOptions}
   */
  function translateChangeVatOptions(options) {
    /** @type { VatDeliveryChangeVatOptions } */
    const changeVatOptionsMessageVatDelivery = harden([
      'changeVatOptions',
      options,
    ]);
    return changeVatOptionsMessageVatDelivery;
  }

  /**
   *
   * @param {SwingSetCapData} kernelVP
   * @returns {VatDeliveryStartVat}
   */
  function translateStartVat(kernelVP) {
    const slots = kernelVP.slots.map(slot => mapKernelSlotToVatSlot(slot));
    const vatVP = { ...kernelVP, slots };
    /** @type { VatDeliveryStartVat } */
    const startVatMessageVatDelivery = harden(['startVat', vatVP]);
    return startVatMessageVatDelivery;
  }

  /**
   * @param { SwingSetCapData } disconnectObjectCapData
   * @returns { VatDeliveryStopVat }
   */
  function translateStopVat(disconnectObjectCapData) {
    return harden(['stopVat', disconnectObjectCapData]);
  }

  /** @type { VatDeliveryBringOutYourDead } */
  const reapMessageVatDelivery = harden(['bringOutYourDead']);

  function translateBringOutYourDead() {
    return reapMessageVatDelivery;
  }

  /**
   *
   * @param {KernelDeliveryObject} kd
   * @returns {VatDeliveryObject}
   */
  function kernelDeliveryToVatDelivery(kd) {
    switch (kd[0]) {
      case 'message': {
        const [_, ...args] = kd;
        return translateMessage(...args);
      }
      case 'notify': {
        const [_, ...args] = kd;
        return translateNotify(...args);
      }
      case 'dropExports': {
        const [_, ...args] = kd;
        return translateDropExports(...args);
      }
      case 'retireExports': {
        const [_, ...args] = kd;
        return translateRetireExports(...args);
      }
      case 'retireImports': {
        const [_, ...args] = kd;
        return translateRetireImports(...args);
      }
      case 'changeVatOptions': {
        const [_, ...args] = kd;
        return translateChangeVatOptions(...args);
      }
      case 'startVat': {
        const [_, ...args] = kd;
        return translateStartVat(...args);
      }
      case 'stopVat': {
        const [_, ...args] = kd;
        return translateStopVat(...args);
      }
      case 'bringOutYourDead': {
        const [_, ...args] = kd;
        return translateBringOutYourDead(...args);
      }
      default: {
        throw Fail`unknown kernelDelivery.type ${kd[0]}`;
      }
    }
    // returns one of:
    //  ['message', target, msg]
    //  ['notify', resolutions]
    //  ['dropExports', vrefs]
    //  ['retireExports', vrefs]
    //  ['retireImports', vrefs]
    //  ['startVat', vatParameters]
    //  ['stopVat', disconnectObject]
    //  ['bringOutYourDead']
  }

  return kernelDeliveryToVatDelivery;
}
/**
 * @import {VatSyscallObject} from '@agoric/swingset-liveslots'
 * @import {VatSyscallResult} from '@agoric/swingset-liveslots'
 * @import {VatSyscallResultOk} from '@agoric/swingset-liveslots'
 */

/**
 * return a function that converts VatSyscall objects into KernelSyscall
 * objects
 *
 * @param {string} vatID
 * @param {KernelKeeper} kernelKeeper
 * @returns {(vsc: VatSyscallObject) => KernelSyscallObject}
 */
function makeTranslateVatSyscallToKernelSyscall(vatID, kernelKeeper) {
  const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
  const { mapVatSlotToKernelSlot, clearReachableFlag } = vatKeeper;
  const { enablePipelining = false } = vatKeeper.getOptions();

  function translateSend(targetSlot, msg) {
    typeof targetSlot === 'string' || Fail`non-string targetSlot`;
    insistMessage(msg);
    const { methargs, result: resultSlot } = msg;
    insistCapData(methargs);
    // TODO: disable send-to-self for now, qv issue #43
    const target = mapVatSlotToKernelSlot(targetSlot);
    const [method, argList] = legibilizeMessageArgs(methargs);
    // prettier-ignore
    kdebug(`syscall[${vatID}].send(${targetSlot}/${target}).${method}(${argList})`);
    const kernelSlots = methargs.slots.map(slot =>
      mapVatSlotToKernelSlot(slot),
    );
    const kernelArgs = harden({ ...methargs, slots: kernelSlots });
    let result = null;
    if (resultSlot) {
      insistVatType('promise', resultSlot);
      // Require that the promise used by the vat to receive the result of this
      // send is newly allocated by the vat if it does not support pipelining.
      // When a promise previously received as the result of a delivery is used
      // as the result of a send call, it's in effect doing a redirect, which
      // is currently only supported for pipelining vats.
      // While we could only require that the promise be allocated by the vat,
      // aka exported not imported, there is currently no path for liveslots
      // vats to ever use a promise before it is seen as result, which would be
      // indicative of something unexpected going on.
      result = mapVatSlotToKernelSlot(resultSlot, {
        requireNew: !enablePipelining,
      });
      insistKernelType('promise', result);
      // The promise must be unresolved, and this Vat must be the decider.
      // The most common case is that 'resultSlot' is a new exported promise
      // (p+NN). But it might be a previously-imported promise (p-NN) that
      // they got in a deliver() call, which gave them resolution authority,
      // however only in the case of pipelining vats.
      // In the case of non-pipelining vats these checks are redundant since
      // we're guaranteed to have a promise newly allocated by the vat.
      const p = kernelKeeper.getKernelPromise(result);
      p.state === 'unresolved' ||
        Fail`send() result ${result} is already resolved`;
      p.decider === vatID ||
        Fail`send() result ${result} is decided by ${p.decider} not ${vatID}`;
      kernelKeeper.clearDecider(result);
      // resolution authority now held by run-queue
    }

    const kmsg = harden({
      methargs: kernelArgs,
      result,
    });
    insistMessage(kmsg);
    /** @type { KernelSyscallSend } */
    const ks = harden(['send', target, kmsg]);
    return ks;
  }

  /**
   *
   * @param {boolean} isFailure
   * @param {SwingSetCapData} info
   * @returns {KernelSyscallExit}
   */
  function translateExit(isFailure, info) {
    insistCapData(info);
    kdebug(`syscall[${vatID}].exit(${isFailure},${legibilizeValue(info)})`);
    const kernelSlots = info.slots.map(slot => mapVatSlotToKernelSlot(slot));
    const kernelInfo = harden({ ...info, slots: kernelSlots });
    return harden(['exit', vatID, !!isFailure, kernelInfo]);
  }

  /**
   *
   * @param {string} key
   * @returns {KernelSyscallVatstoreGet}
   */
  function translateVatstoreGet(key) {
    assertValidVatstoreKey(key);
    kdebug(`syscall[${vatID}].vatstoreGet(${key})`);
    return harden(['vatstoreGet', vatID, key]);
  }

  /**
   *
   * @param {string} key
   * @param {string} value
   * @returns {KernelSyscallVatstoreSet}
   */
  function translateVatstoreSet(key, value) {
    assertValidVatstoreKey(key);
    assert.typeof(value, 'string');
    kdebug(`syscall[${vatID}].vatstoreSet(${key},${value})`);
    return harden(['vatstoreSet', vatID, key, value]);
  }

  /**
   *
   * @param {string} priorKey
   * @returns {KernelSyscallVatstoreGetNextKey}
   */
  function translateVatstoreGetNextKey(priorKey) {
    assertValidVatstoreKey(priorKey);
    kdebug(`syscall[${vatID}].vatstoreGetNextKey(${priorKey})`);
    return harden(['vatstoreGetNextKey', vatID, priorKey]);
  }

  /**
   *
   * @param {string} key
   * @returns {KernelSyscallVatstoreDelete}
   */
  function translateVatstoreDelete(key) {
    assertValidVatstoreKey(key);
    kdebug(`syscall[${vatID}].vatstoreDelete(${key})`);
    return harden(['vatstoreDelete', vatID, key]);
  }

  const gcSyscallMapOpts = { required: true, setReachable: false };

  /**
   *
   * @param {string[]} vrefs
   * @returns {KernelSyscallDropImports}
   */
  function translateDropImports(vrefs) {
    Array.isArray(vrefs) || Fail`dropImports() given non-Array ${vrefs}`;
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

  /**
   *
   * @param {string[]} vrefs
   * @returns {KernelSyscallRetireImports}
   */
  function translateRetireImports(vrefs) {
    Array.isArray(vrefs) || Fail`retireImports() given non-Array ${vrefs}`;
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

  /**
   *
   * @param {string[]} vrefs
   * @returns {KernelSyscallRetireExports}
   */
  function translateRetireExports(vrefs) {
    Array.isArray(vrefs) || Fail`retireExports() given non-Array ${vrefs}`;
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

  /**
   *
   * @param {string[]} vrefs
   * @returns {import('../types-external.js').KernelSyscallAbandonExports}
   */
  function translateAbandonExports(vrefs) {
    Array.isArray(vrefs) || Fail`abandonExports() given non-Array ${vrefs}`;
    const krefs = vrefs.map(vref => {
      const { type, allocatedByVat } = parseVatSlot(vref);
      assert.equal(type, 'object');
      assert.equal(allocatedByVat, true); // abandon *exports*, not imports
      // kref must already be in the clist
      const kref = mapVatSlotToKernelSlot(vref, gcSyscallMapOpts);
      return kref;
    });
    kdebug(`syscall[${vatID}].abandonExports(${krefs.join(' ')})`);
    // abandonExports still has work to do
    return harden(['abandonExports', vatID, krefs]);
  }

  /**
   *
   * @param {string} target
   * @param {string} method
   * @param {SwingSetCapData} args
   * @returns {KernelSyscallInvoke}
   */
  function translateCallNow(target, method, args) {
    insistCapData(args);
    const dev = mapVatSlotToKernelSlot(target);
    const { type } = parseKernelSlot(dev);
    type === 'device' || Fail`doCallNow must target a device, not ${dev}`;
    for (const slot of args.slots) {
      parseVatSlot(slot).type !== 'promise' ||
        Fail`syscall.callNow() args cannot include promises like ${slot}`;
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
    kernelKeeper.hasKernelPromise(kpid) ||
      Fail`unknown kernelPromise id '${kpid}'`;
    /** @type { KernelSyscallSubscribe } */
    const ks = harden(['subscribe', vatID, kpid]);
    return ks;
  }

  /**
   *
   * @param {VatOneResolution[]} vresolutions
   * @returns {KernelSyscallResolve}
   */
  function translateResolve(vresolutions) {
    /** @type { KernelOneResolution[] } */
    const kresolutions = [];
    const kpidsResolved = [];
    let idx = 0;
    for (const resolution of vresolutions) {
      const [vpid, rejected, data] = resolution;
      insistVatType('promise', vpid);
      insistCapData(data);
      if (!rejected) {
        const resolutionSlot = extractSingleSlot(data);
        if (resolutionSlot) {
          // Resolving to a promise is not a fulfillment.
          // It would be a redirect, but that's not currently supported by the kernel.
          // Furthermore messages sent to such a promise resolved this way would not
          // be forwarded but would splat instead.
          assert(
            parseVatSlot(resolutionSlot).type !== 'promise',
            'cannot resolve to a promise',
          );
        }
      }

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
   * @param {VatSyscallObject} vsc
   * @returns {KernelSyscallObject}
   */
  function vatSyscallToKernelSyscall(vsc) {
    switch (vsc[0]) {
      case 'send': {
        const [_, target, msg] = vsc;
        return translateSend(target, msg);
      }
      case 'callNow': {
        const [_, target, method, args] = vsc;
        return translateCallNow(target, method, args); // becomes invoke()
      }
      case 'subscribe': {
        const [_, vpid] = vsc;
        return translateSubscribe(vpid);
      }
      case 'resolve': {
        const [_, resolutions] = vsc;
        return translateResolve(resolutions);
      }
      case 'exit': {
        const [_, isFailure, info] = vsc;
        return translateExit(isFailure, info);
      }
      case 'vatstoreGet': {
        const [_, key] = vsc;
        return translateVatstoreGet(key);
      }
      case 'vatstoreSet': {
        const [_, key, data] = vsc;
        return translateVatstoreSet(key, data);
      }
      case 'vatstoreGetNextKey': {
        const [_, priorKey] = vsc;
        return translateVatstoreGetNextKey(priorKey);
      }
      case 'vatstoreDelete': {
        const [_, key] = vsc;
        return translateVatstoreDelete(key);
      }
      case 'dropImports': {
        const [_, slots] = vsc;
        return translateDropImports(slots);
      }
      case 'retireImports': {
        const [_, slots] = vsc;
        return translateRetireImports(slots);
      }
      case 'retireExports': {
        const [_, slots] = vsc;
        return translateRetireExports(slots);
      }
      case 'abandonExports': {
        const [_, slots] = vsc;
        return translateAbandonExports(slots);
      }
      default: {
        throw Fail`unknown vatSyscall type ${vsc[0]}`;
      }
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

  // Most syscalls return ['ok', null], but callNow() returns ['ok',
  // capdata] and vatstoreGet() returns ['ok', string] or ['ok',
  // undefined], and invoke() can return ['error', problem]. We
  // translate all 'undefined' into 'null' because the syscall
  // responses will be recorded in the transcript, which uses JSON
  // (actually djson.js), which cannot round-trip 'undefined'.

  /**
   *
   * @param {string} type
   * @param {KernelSyscallResult} kres
   * @returns {VatSyscallResult}
   */
  function kernelSyscallResultToVatSyscallResult(type, kres) {
    const [successFlag, resultData] = kres;
    switch (type) {
      case 'invoke': {
        if (kres[0] === 'ok') {
          insistCapData(resultData);
          // prettier-ignore
          const slots =
                resultData.slots.map(slot => mapKernelSlotToVatSlot(slot));
          const vdata = { ...resultData, slots };
          /** @type { VatSyscallResultOk } */
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
          return harden(['ok', null]);
        }
      case 'vatstoreGetNextKey':
        assert(successFlag === 'ok', 'unexpected KSR error');
        if (resultData) {
          assert.typeof(resultData, 'string');
          return harden(['ok', resultData]);
        } else {
          return harden(['ok', null]);
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
