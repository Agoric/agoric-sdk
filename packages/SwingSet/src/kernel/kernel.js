// @ts-check
import { assert, details as X } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { stringify } from '@agoric/marshal';
import { assertKnownOptions } from '../assertOptions.js';
import { foreverPolicy } from '../runPolicies.js';
import { makeVatManagerFactory } from './vatManager/factory.js';
import { makeVatWarehouse } from './vatManager/vat-warehouse.js';
import makeDeviceManager from './deviceManager.js';
import makeKernelKeeper from './state/kernelKeeper.js';
import { kdebug, kdebugEnable, legibilizeMessageArgs } from './kdebug.js';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots.js';
import { parseVatSlot } from '../parseVatSlots.js';
import { insistCapData } from '../capdata.js';
import { insistMessage, insistVatDeliveryResult } from '../message.js';
import { insistDeviceID, insistVatID } from './id.js';
import { makeKernelSyscallHandler, doSend } from './kernelSyscall.js';
import { makeSlogger, makeDummySlogger } from './slogger.js';
import { makeDummyMeterControl } from './dummyMeterControl.js';
import { getKpidsToRetire } from './cleanup.js';
import { processNextGCAction } from './gc-actions.js';

import { makeVatLoader } from './loadVat.js';
import { makeDeviceTranslators } from './deviceTranslator.js';
import { notifyTermination } from './notifyTermination.js';

function abbreviateReplacer(_, arg) {
  if (typeof arg === 'bigint') {
    return Number(arg);
  }
  if (typeof arg === 'string' && arg.length >= 40) {
    // truncate long strings
    return `${arg.slice(0, 15)}...${arg.slice(arg.length - 15)}`;
  }
  return arg;
}

function makeError(message, name = 'Error') {
  assert.typeof(message, 'string');
  const err = { '@qclass': 'error', name, message };
  return harden({ body: JSON.stringify(err), slots: [] });
}

const VAT_TERMINATION_ERROR = makeError('vat terminated');

/**
 * Provide the kref of a vat's root object, as if it had been exported.
 *
 * @param {*} kernelKeeper  Kernel keeper managing persistent kernel state.
 * @param {string} vatID  Vat ID of the vat whose root kref is sought.
 *
 * @returns {string} the kref of the root object of the given vat.
 */
export function exportRootObject(kernelKeeper, vatID) {
  insistVatID(vatID);
  const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
  return vatKeeper.mapVatSlotToKernelSlot('o+0');
}

/*
 * Pretend that a vat just exported an object, and increment the refcount on
 * the resulting kref so nothing tries to delete it for being unreferenced.
 */
export function doAddExport(kernelKeeper, fromVatID, vref) {
  insistVatID(fromVatID);
  assert(parseVatSlot(vref).allocatedByVat);
  const vatKeeper = kernelKeeper.provideVatKeeper(fromVatID);
  const kref = vatKeeper.mapVatSlotToKernelSlot(vref);
  // we lie to incrementRefCount (this is really an export, but we pretend
  // it's an import) so it will actually increment the count
  kernelKeeper.incrementRefCount(kref, 'doAddExport', { isExport: false });
  return kref;
}

/**
 * Enqueue a message to some kernel object, as if the message had been sent
 * by some other vat. This requires a kref as a target.
 *
 * @param {*} kernelKeeper  Kernel keeper managing persistent kernel state
 * @param {string} kref  Target of the message
 * @param {string} method  The message verb
 * @param {*} args  The message arguments
 * @param {string} policy How the kernel should handle an eventual resolution
 *    or rejection of the message's result promise. Should be one of
 *    'sendOnly' (don't even create a result promise), 'ignore' (do nothing),
 *    'logAlways' (log the resolution or rejection), 'logFailure' (log only
 *    rejections), or 'panic' (panic the kernel upon a rejection).
 *
 * @returns {string?} the kpid of the sent message's result promise
 */
export function doQueueToKref(
  kernelKeeper,
  kref,
  method,
  args,
  policy = 'ignore',
) {
  // queue a message on the end of the queue, with 'absolute' krefs.
  // Use 'step' or 'run' to execute it
  insistCapData(args);
  args.slots.forEach(s => parseKernelSlot(s));
  let resultKPID;
  if (policy !== 'none') {
    resultKPID = kernelKeeper.addKernelPromise(policy);
  }
  const msg = harden({ method, args, result: resultKPID });
  doSend(kernelKeeper, kref, msg);
  return resultKPID;
}

export default function buildKernel(
  kernelEndowments,
  deviceEndowments,
  kernelOptions = {},
) {
  const {
    waitUntilQuiescent,
    hostStorage,
    debugPrefix,
    vatEndowments,
    slogCallbacks = {},
    makeConsole,
    makeNodeWorker,
    startSubprocessWorkerNode,
    startXSnap,
    writeSlogObject,
    WeakRef,
    FinalizationRegistry,
    gcAndFinalize,
    createSHA256,
  } = kernelEndowments;
  deviceEndowments = { ...deviceEndowments }; // copy so we can modify
  const {
    verbose,
    defaultManagerType = 'local',
    warehousePolicy,
    overrideVatManagerOptions = {},
  } = kernelOptions;
  const logStartup = verbose ? console.debug : () => 0;

  const vatAdminRootKref = hostStorage.kvStore.get('vatAdminRootKref');

  /** @type { KernelSlog } */
  const kernelSlog = writeSlogObject
    ? makeSlogger(slogCallbacks, writeSlogObject)
    : makeDummySlogger(slogCallbacks, makeConsole);

  const kernelKeeper = makeKernelKeeper(hostStorage, kernelSlog, createSHA256);

  let started = false;

  /**
   * @typedef {{
   *   manager: unknown,
   *   translators: ReturnType<makeDeviceTranslators>,
   * }} DeviceInfo
   */
  const ephemeral = {
    /** @type { Map<string, DeviceInfo> } key is deviceID */
    devices: new Map(),
    /** @type {string[]} */
    log: [],
  };

  // This is a low-level output-only string logger used by old unit tests to
  // see whether vats made progress or not. The array it appends to is
  // available as c.dump().log . New unit tests should instead use the
  // 'result' value returned by c.queueToKref()
  function testLog(...args) {
    const rendered = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg, abbreviateReplacer),
    );
    ephemeral.log.push(rendered.join(''));
  }
  harden(testLog);

  function makeVatConsole(kind, vatID) {
    const origConsole = makeConsole(`${debugPrefix}SwingSet:${kind}:${vatID}`);
    if (kind === 'ls') {
      // LiveSlots is not recorded to kernelSlog.
      // The slog captures 1: what a vat is told to do, and
      // 2: what a vat says about its activities
      return origConsole;
    }
    return kernelSlog.vatConsole(vatID, origConsole);
  }

  // runQueue entries are {type, vatID, more..}. 'more' depends on type:
  // * deliver: target, msg
  // * notify: kernelPromiseID

  // in the kernel table, promises and resolvers are both indexed by the same
  // value. kernelPromises[promiseID] = { decider, subscribers }

  // The "Vat Powers" are given to vats as arguments of setup(). Liveslots
  // provides them, and more, as the only argument to buildRootObject(). They
  // represent controlled authorities that come from the kernel but that do
  // not go through the syscall mechanism (so they aren't included in the
  // replay transcript), so they must not be particularly stateful. If any of
  // them behave differently from one invocation to the next, the vat code
  // which uses it will not be a deterministic function of the transcript,
  // breaking our orthogonal-persistence model. They can have access to
  // state, but they must not let it influence the data they return to the
  // vat.

  // These will eventually be provided by the in-worker supervisor instead.

  // TODO: ideally the powerless ones are imported by the vat, not passed in
  // an argument.

  const allVatPowers = harden({
    testLog,
  });

  function vatNameToID(name) {
    const vatID = kernelKeeper.getVatIDForName(name);
    insistVatID(vatID);
    return vatID;
  }

  function deviceNameToID(name) {
    const deviceID = kernelKeeper.getDeviceIDForName(name);
    insistDeviceID(deviceID);
    return deviceID;
  }

  function addImport(forVatID, what) {
    if (!started) {
      throw new Error('must do kernel.start() before addImport()');
      // because otherwise we can't get the vatManager
    }
    insistVatID(forVatID);
    const kernelSlot = `${what}`;
    parseKernelSlot(what);
    const vatKeeper = kernelKeeper.provideVatKeeper(forVatID);
    return vatKeeper.mapKernelSlotToVatSlot(kernelSlot);
  }

  function pinObject(kref) {
    kernelKeeper.pinObject(kref);
  }

  function addExport(fromVatID, vatSlot) {
    if (!started) {
      throw new Error('must do kernel.start() before addExport()');
      // because otherwise we can't get the vatKeeper
    }
    return doAddExport(kernelKeeper, fromVatID, vatSlot);
  }

  const kernelSyscallHandler = makeKernelSyscallHandler({
    kernelKeeper,
    ephemeral,
    // eslint-disable-next-line no-use-before-define
    notify,
    // eslint-disable-next-line no-use-before-define
    doResolve,
    // eslint-disable-next-line no-use-before-define
    setTerminationTrigger,
  });

  // If `kernelPanic` is set to non-null, vat execution code will throw it as an
  // error at the first opportunity
  let kernelPanic = null;

  /** @type {(problem: unknown, err?: Error) => void } */
  function panic(problem, err = undefined) {
    console.error(`##### KERNEL PANIC: ${problem} #####`);
    kernelPanic = err || new Error(`kernel panic ${problem}`);
  }

  /**
   * Enqueue a message to some kernel object, as if the message had been sent
   * by some other vat.
   *
   * @param {string} kref  Target of the message
   * @param {string} method  The message verb
   * @param {*} args  The message arguments
   * @param {ResolutionPolicy=} policy How the kernel should handle an eventual
   *    resolution or rejection of the message's result promise. Should be
   *    one of 'sendOnly' (don't even create a result promise), 'ignore' (do
   *    nothing), 'logAlways' (log the resolution or rejection), 'logFailure'
   *    (log only rejections), or 'panic' (panic the kernel upon a
   *    rejection).
   * @returns {string?} the kpid of the sent message's result promise, if any
   */
  function queueToKref(kref, method, args, policy = 'ignore') {
    return doQueueToKref(kernelKeeper, kref, method, args, policy);
  }

  function notify(vatID, kpid) {
    const m = harden({ type: 'notify', vatID, kpid });
    kernelKeeper.incrementRefCount(kpid, `enq|notify`);
    kernelKeeper.addToRunQueue(m);
  }

  function doResolve(vatID, resolutions) {
    if (vatID) {
      insistVatID(vatID);
    }
    for (const resolution of resolutions) {
      const [kpid, rejected, data] = resolution;
      insistKernelType('promise', kpid);
      insistCapData(data);
      const p = kernelKeeper.getResolveablePromise(kpid, vatID);
      const { subscribers } = p;
      for (const subscriber of subscribers) {
        if (subscriber !== vatID) {
          notify(subscriber, kpid);
        }
      }
      kernelKeeper.resolveKernelPromise(kpid, rejected, data);
      const tag = rejected ? 'rejected' : 'fulfilled';
      if (p.policy === 'logAlways' || (rejected && p.policy === 'logFailure')) {
        console.log(
          `${kpid}.policy ${p.policy}: ${tag} ${JSON.stringify(data)}`,
        );
      } else if (rejected && p.policy === 'panic') {
        panic(`${kpid}.policy panic: ${tag} ${JSON.stringify(data)}`);
      }
    }
  }

  function resolveToError(kpid, errorData, expectedDecider) {
    doResolve(expectedDecider, [[kpid, true, errorData]]);
  }

  /**
   * Terminate a vat; that is: delete vat DB state,
   * resolve orphaned promises, notify parent, and
   * shutdown worker.
   *
   * @param {string} vatID
   * @param {boolean} shouldReject
   * @param {SwingSetCapData} info
   */
  function terminateVat(vatID, shouldReject, info) {
    insistCapData(info);
    if (kernelKeeper.vatIsAlive(vatID)) {
      const isDynamic = kernelKeeper.getDynamicVats().includes(vatID);
      const promisesToReject = kernelKeeper.cleanupAfterTerminatedVat(vatID);
      for (const kpid of promisesToReject) {
        resolveToError(kpid, VAT_TERMINATION_ERROR, vatID);
      }
      if (isDynamic) {
        assert(
          vatAdminRootKref,
          `initializeKernel did not set vatAdminRootKref`,
        );
        notifyTermination(
          vatID,
          vatAdminRootKref,
          shouldReject,
          info,
          queueToKref,
        );
      }
      // else... static... maybe panic???

      // ISSUE: terminate stuff in its own crank like creation?
      // eslint-disable-next-line no-use-before-define
      vatWarehouse.vatWasTerminated(vatID);
    }
  }

  let terminationTrigger;
  let postAbortActions;

  function resetDeliveryTriggers() {
    terminationTrigger = undefined;
    postAbortActions = {
      meterDeductions: [], // list of { meterID, compute }
    };
  }
  resetDeliveryTriggers();

  function notifyMeterThreshold(meterID) {
    // tell vatAdmin that a meter has dropped below its notifyThreshold
    const { remaining } = kernelKeeper.getMeter(meterID);
    const args = { body: stringify(harden([meterID, remaining])), slots: [] };
    assert.typeof(vatAdminRootKref, 'string', 'vatAdminRootKref missing');
    queueToKref(vatAdminRootKref, 'meterCrossedThreshold', args, 'logFailure');
  }

  function deductMeter(meterID, compute, firstTime) {
    assert.typeof(compute, 'bigint');
    const res = kernelKeeper.deductMeter(meterID, compute);

    // We record the deductMeter() in postAbortActions.meterDeductions. If
    // the delivery is rewound for any reason (syscall error, res.underflow),
    // then deliverAndLogToVat will repeat the deductMeter (which will repeat
    // the notifyMeterThreshold), so their side-effects will survive the
    // abortCrank(). But we don't record it (again) during the repeat, to
    // make sure exactly one copy of the changes will be committed.

    if (firstTime) {
      postAbortActions.meterDeductions.push({ meterID, compute });
    }
    if (res.notify) {
      notifyMeterThreshold(meterID);
    }
    return res.underflow;
  }

  // this is called for syscall.exit (shouldAbortCrank=false), and for any
  // vat-fatal errors (shouldAbortCrank=true)
  function setTerminationTrigger(vatID, shouldAbortCrank, shouldReject, info) {
    if (shouldAbortCrank) {
      assert(shouldReject);
    }
    if (!terminationTrigger || shouldAbortCrank) {
      terminationTrigger = { vatID, shouldAbortCrank, shouldReject, info };
    }
  }

  /**
   * Perform one delivery to a vat.
   *
   * @param {string} vatID
   * @param {*} kd
   * @param {VatDeliveryObject} vd
   * @param {boolean} useMeter
   * @returns {Promise<PolicyInput>}
   */
  async function deliverAndLogToVat(vatID, kd, vd, useMeter) {
    /** @type {PolicyInputCrankComplete} */
    let policyInput = ['crank', {}];
    // eslint-disable-next-line no-use-before-define
    assert(vatWarehouse.lookup(vatID));
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const { meterID } = vatKeeper.getOptions();
    // Ensure that the vatSlogger is available before clist translation.
    const vs = kernelSlog.provideVatSlogger(vatID).vatSlog;
    try {
      // eslint-disable-next-line no-use-before-define
      const deliveryResult = await vatWarehouse.deliverToVat(vatID, kd, vd, vs);
      insistVatDeliveryResult(deliveryResult);
      if (vd[0] !== 'bringOutYourDead') {
        if (vatKeeper.countdownToReap()) {
          kernelKeeper.scheduleReap(vatID);
        }
      }
      const [status, problem] = deliveryResult;
      if (status !== 'ok') {
        // probably a metering fault, or a bug in the vat's dispatch()
        console.log(`delivery problem, terminating vat ${vatID}`, problem);
        setTerminationTrigger(vatID, true, true, makeError(problem));
        return harden(['crank-failed', {}]);
      }

      if (deliveryResult[0] === 'ok') {
        let used;
        const metering = deliveryResult[2];
        if (metering) {
          // if the result has metering, we report it to the runPolicy
          const consumed = metering.compute;
          assert.typeof(consumed, 'number');
          used = BigInt(consumed);
          policyInput = ['crank', { computrons: used }];
        }
        if (useMeter && metering !== null && meterID) {
          // If we have a Meter, and the manager reported a non-null value, use it.
          assert(used !== undefined);
          const underflow = deductMeter(meterID, used, true);
          if (underflow) {
            console.log(`meter ${meterID} underflow, terminating vat ${vatID}`);
            const err = makeError('meter underflow, vat terminated');
            setTerminationTrigger(vatID, true, true, err);
            return harden(['crank-failed', {}]);
          }
        }
      }
    } catch (e) {
      // log so we get a stack trace
      console.error(`error in kernel.deliver:`, e);
      throw e;
    }
    return harden(policyInput);
  }

  /**
   * Deliver one message to a vat.
   *
   * @param { string } vatID
   * @param { string } target
   * @param { * } msg
   * @returns { Promise<PolicyInput> }
   */
  async function deliverToVat(vatID, target, msg) {
    insistMessage(msg);
    /** @type { PolicyInput } */
    let policyInput = ['none'];
    kernelKeeper.incStat('dispatches');
    kernelKeeper.incStat('dispatchDeliver');
    // eslint-disable-next-line no-use-before-define
    if (!vatWarehouse.lookup(vatID)) {
      if (msg.result) {
        resolveToError(msg.result, VAT_TERMINATION_ERROR);
      }
    } else {
      const kd = harden(['message', target, msg]);
      // eslint-disable-next-line no-use-before-define
      const vd = vatWarehouse.kernelDeliveryToVatDelivery(vatID, kd);
      policyInput = await deliverAndLogToVat(vatID, kd, vd, true);
    }
    return harden(policyInput);
  }

  function extractPresenceIfPresent(data) {
    const body = JSON.parse(data.body);
    if (
      body &&
      typeof body === 'object' &&
      body['@qclass'] === 'slot' &&
      body.index === 0
    ) {
      if (data.slots.length === 1) {
        const slot = data.slots[0];
        const { type } = parseKernelSlot(slot);
        if (type === 'object') {
          return slot;
        }
      }
    }
    return null;
  }

  async function deliverToTarget(target, msg) {
    insistMessage(msg);
    /** @type { PolicyInput } */
    let policyInput = ['none'];
    const { type } = parseKernelSlot(target);
    if (type === 'object') {
      const vatID = kernelKeeper.ownerOfKernelObject(target);
      if (vatID) {
        policyInput = await deliverToVat(vatID, target, msg);
      } else if (msg.result) {
        resolveToError(msg.result, VAT_TERMINATION_ERROR);
      }
    } else if (type === 'promise') {
      const kp = kernelKeeper.getKernelPromise(target);
      if (kp.state === 'redirected') {
        // await deliverToTarget(kp.redirectTarget, msg); // probably correct
        // TODO unimplemented
        throw new Error('not implemented yet');
      } else if (kp.state === 'fulfilled') {
        const presence = extractPresenceIfPresent(kp.data);
        if (presence) {
          policyInput = await deliverToTarget(presence, msg);
        } else if (msg.result) {
          const s = `data is not callable, has no method ${msg.method}`;
          // TODO: maybe replicate whatever happens with {}.foo() or 3.foo()
          // etc: "TypeError: {}.foo is not a function"
          resolveToError(msg.result, makeError(s));
        }
        // else { todo: maybe log error? }
      } else if (kp.state === 'rejected') {
        // TODO would it be simpler to redirect msg.kpid to kp?
        if (msg.result) {
          resolveToError(msg.result, kp.data);
        }
      } else if (kp.state === 'unresolved') {
        if (!kp.decider) {
          kernelKeeper.addMessageToPromiseQueue(target, msg);
        } else {
          insistVatID(kp.decider);
          // eslint-disable-next-line no-use-before-define
          const deciderVat = vatWarehouse.lookup(kp.decider);
          if (deciderVat) {
            if (deciderVat.enablePipelining) {
              policyInput = await deliverToVat(kp.decider, target, msg);
            } else {
              kernelKeeper.addMessageToPromiseQueue(target, msg);
            }
          } else if (msg.result) {
            resolveToError(msg.result, VAT_TERMINATION_ERROR);
          }
        }
      } else {
        assert.fail(X`unknown kernelPromise state '${kp.state}'`);
      }
    } else {
      assert.fail(X`unable to send() to slot.type ${type}`);
    }
    return harden(policyInput);
  }

  /**
   *
   * @param { * } message
   * @returns { Promise<PolicyInput> }
   */
  async function processNotify(message) {
    const { vatID, kpid } = message;
    /** @type { PolicyInput } */
    let policyInput = ['none'];
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    kernelKeeper.incStat('dispatches');
    // eslint-disable-next-line no-use-before-define
    if (!vatWarehouse.lookup(vatID)) {
      kdebug(`dropping notify of ${kpid} to ${vatID} because vat is dead`);
    } else {
      const p = kernelKeeper.getKernelPromise(kpid);
      kernelKeeper.incStat('dispatchNotify');
      const vatKeeper = kernelKeeper.provideVatKeeper(vatID);

      assert(p.state !== 'unresolved', X`spurious notification ${kpid}`);
      const resolutions = [];
      if (!vatKeeper.hasCListEntry(kpid)) {
        kdebug(`vat ${vatID} has no c-list entry for ${kpid}`);
        kdebug(`skipping notify of ${kpid} because it's already been done`);
        return harden(policyInput);
      }
      const targets = getKpidsToRetire(kernelKeeper, kpid, p.data);
      if (targets.length === 0) {
        kdebug(`no kpids to retire`);
        kdebug(`skipping notify of ${kpid} because it's already been done`);
        return harden(policyInput);
      }
      for (const toResolve of targets) {
        resolutions.push([toResolve, kernelKeeper.getKernelPromise(toResolve)]);
      }
      const kd = harden(['notify', resolutions]);
      // eslint-disable-next-line no-use-before-define
      const vd = vatWarehouse.kernelDeliveryToVatDelivery(vatID, kd);
      vatKeeper.deleteCListEntriesForKernelSlots(targets);
      policyInput = await deliverAndLogToVat(vatID, kd, vd, true);
    }
    return harden(policyInput);
  }

  /**
   *
   * @param { * } message
   * @returns { Promise<PolicyInput> }
   */
  async function processGCMessage(message) {
    // used for dropExports, retireExports, and retireImports
    /** @type { PolicyInput } */
    let policyInput = ['none'];
    const { type, vatID, krefs } = message;
    // console.log(`-- processGCMessage(${vatID} ${type} ${krefs.join(',')})`);
    insistVatID(vatID);
    // eslint-disable-next-line no-use-before-define
    if (!vatWarehouse.lookup(vatID)) {
      return harden(policyInput); // can't collect from the dead
    }
    const kd = harden([type, krefs]);
    if (type === 'retireExports') {
      for (const kref of krefs) {
        // const rc = kernelKeeper.getObjectRefCount(kref);
        // console.log(`   ${kref}: ${rc.reachable},${rc.recognizable}`);
        kernelKeeper.deleteKernelObject(kref);
        // console.log(`   deleted ${kref}`);
      }
    }
    // eslint-disable-next-line no-use-before-define
    const vd = vatWarehouse.kernelDeliveryToVatDelivery(vatID, kd);
    policyInput = await deliverAndLogToVat(vatID, kd, vd, false);
    return harden(policyInput);
  }

  /**
   *
   * @param { * } message
   * @returns { Promise<PolicyInput> }
   */
  async function processBringOutYourDead(message) {
    /** @type { PolicyInput } */
    let policyInput = ['none'];
    const { type, vatID } = message;
    // console.log(`-- processBringOutYourDead(${vatID})`);
    insistVatID(vatID);
    // eslint-disable-next-line no-use-before-define
    if (!vatWarehouse.lookup(vatID)) {
      return harden(policyInput); // can't collect from the dead
    }
    const kd = harden([type]);
    // eslint-disable-next-line no-use-before-define
    const vd = vatWarehouse.kernelDeliveryToVatDelivery(vatID, kd);
    policyInput = await deliverAndLogToVat(vatID, kd, vd, false);
    return harden(policyInput);
  }

  /**
   *
   * @param { * } message
   * @returns { Promise<PolicyInput> }
   */
  async function processCreateVat(message) {
    assert(vatAdminRootKref, `initializeKernel did not set vatAdminRootKref`);
    const { vatID, source, dynamicOptions } = message;
    kernelKeeper.addDynamicVatID(vatID);
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    const options = { ...dynamicOptions };
    if (!dynamicOptions.managerType) {
      options.managerType = kernelKeeper.getDefaultManagerType();
    }
    if (!dynamicOptions.reapInterval) {
      options.reapInterval = kernelKeeper.getDefaultReapInterval();
    }
    vatKeeper.setSourceAndOptions(source, options);
    vatKeeper.initializeReapCountdown(options.reapInterval);

    function makeSuccessResponse() {
      // build success message, giving admin vat access to the new vat's root
      // object
      const kernelRootObjSlot = exportRootObject(kernelKeeper, vatID);
      return {
        body: JSON.stringify([
          vatID,
          { rootObject: { '@qclass': 'slot', index: 0 } },
        ]),
        slots: [kernelRootObjSlot],
      };
    }

    function makeErrorResponse(error) {
      // delete partial vat state
      kernelKeeper.cleanupAfterTerminatedVat(vatID);
      return {
        body: JSON.stringify([vatID, { error: `${error}` }]),
        slots: [],
      };
    }

    function sendResponse(args) {
      // @ts-ignore see assert(...) above
      queueToKref(vatAdminRootKref, 'newVatCallback', args, 'logFailure');
    }

    /** @type { PolicyInput } */
    const policyInput = harden(['create-vat', {}]);

    // eslint-disable-next-line no-use-before-define
    return vatWarehouse
      .createDynamicVat(vatID)
      .then(makeSuccessResponse, makeErrorResponse)
      .then(sendResponse)
      .catch(err => console.error(`error in vat creation`, err))
      .then(() => policyInput);
  }

  function legibilizeMessage(message) {
    if (message.type === 'send') {
      const msg = message.msg;
      const argList = legibilizeMessageArgs(msg.args).join(', ');
      const result = msg.result ? msg.result : 'null';
      return `@${message.target} <- ${msg.method}(${argList}) : @${result}`;
    } else if (message.type === 'notify') {
      return `notify(vatID: ${message.vatID}, kpid: @${message.kpid})`;
      // eslint-disable-next-line no-use-before-define
    } else if (gcMessages.includes(message.type)) {
      // prettier-ignore
      return `${message.type} ${message.vatID} ${message.krefs.map(e=>`@${e}`).join(' ')}`;
    } else if (message.type === 'bringOutYourDead') {
      return `${message.type} ${message.vatID}`;
    } else {
      return `unknown message type ${message.type}`;
    }
  }

  const gcMessages = ['dropExports', 'retireExports', 'retireImports'];

  let processQueueRunning;
  async function processQueueMessage(message) {
    kdebug(`processQ ${JSON.stringify(message)}`);
    kdebug(legibilizeMessage(message));
    if (processQueueRunning) {
      console.error(`We're currently already running at`, processQueueRunning);
      assert.fail(X`Kernel reentrancy is forbidden`);
    }
    kernelSlog.write({ type: 'crank-start', message });
    /** @type { PolicyInput } */
    let policyInput = ['none'];
    try {
      processQueueRunning = Error('here');
      resetDeliveryTriggers();
      // Decref everything in the message, under the assumption that most of
      // the time we're delivering to a vat or answering the result promise
      // with an error. If we wind up queueing it on a promise, we'll
      // re-increment everything there.
      if (message.type === 'send') {
        kernelKeeper.decrementRefCount(message.target, `deq|msg|t`);
        if (message.msg.result) {
          kernelKeeper.decrementRefCount(message.msg.result, `deq|msg|r`);
        }
        let idx = 0;
        for (const argSlot of message.msg.args.slots) {
          kernelKeeper.decrementRefCount(argSlot, `deq|msg|s${idx}`);
          idx += 1;
        }
        policyInput = await deliverToTarget(message.target, message.msg);
      } else if (message.type === 'notify') {
        kernelKeeper.decrementRefCount(message.kpid, `deq|notify`);
        policyInput = await processNotify(message);
      } else if (message.type === 'create-vat') {
        policyInput = await processCreateVat(message);
      } else if (message.type === 'bringOutYourDead') {
        policyInput = await processBringOutYourDead(message);
      } else if (gcMessages.includes(message.type)) {
        policyInput = await processGCMessage(message);
      } else {
        assert.fail(X`unable to process message.type ${message.type}`);
      }
      let didAbort = false;
      if (terminationTrigger) {
        // the vat is doomed, either voluntarily or from meter/syscall fault
        const { vatID, shouldReject, info } = terminationTrigger;
        if (terminationTrigger.shouldAbortCrank) {
          // errors unwind any changes the vat made
          kernelKeeper.abortCrank();
          didAbort = true;
          // but metering deductions and underflow notifications must survive
          const { meterDeductions } = postAbortActions;
          for (const { meterID, compute } of meterDeductions) {
            deductMeter(meterID, compute, false);
            // that will re-push any notifications
          }
        }
        // state changes reflecting the termination must also survive, so
        // these happen after a possible abortCrank()
        terminateVat(vatID, shouldReject, info);
        kernelSlog.terminateVat(vatID, shouldReject, info);
        kdebug(`vat terminated: ${JSON.stringify(info)}`);
      }
      if (!didAbort) {
        // eslint-disable-next-line no-use-before-define
        await vatWarehouse.maybeSaveSnapshot();
      }
      kernelKeeper.processRefcounts();
      kernelKeeper.saveStats();
      const crankNum = kernelKeeper.getCrankNumber();
      kernelKeeper.incrementCrankNumber();
      const { crankhash, activityhash } = kernelKeeper.commitCrank();
      kernelSlog.write({
        type: 'crank-finish',
        crankNum,
        crankhash,
        activityhash,
      });
    } finally {
      processQueueRunning = undefined;
    }
    return harden(policyInput);
  }

  const gcTools = harden({
    WeakRef,
    FinalizationRegistry,
    waitUntilQuiescent,
    gcAndFinalize,
    meterControl: makeDummyMeterControl(),
  });
  const vatManagerFactory = makeVatManagerFactory({
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    makeNodeWorker,
    startSubprocessWorkerNode,
    startXSnap,
    gcTools,
    defaultManagerType,
    kernelSlog,
  });

  function buildVatSyscallHandler(vatID, translators) {
    // This handler never throws. The VatSyscallResult it returns is one of:
    // * success, no response data: ['ok', null]
    // * success, capdata (callNow) ['ok', capdata]
    // * exit, capdata ['exit', capdata]
    // * error: you are dead ['error, description]
    // the VatManager+VatWorker will see the error case, but liveslots will
    // not
    /**
     *
     * @param { VatSyscallObject } vatSyscallObject
     * @returns { VatSyscallResult }
     */
    function vatSyscallHandler(vatSyscallObject) {
      // eslint-disable-next-line no-use-before-define
      if (!vatWarehouse.lookup(vatID)) {
        // This is a safety check -- this case should never happen unless the
        // vatManager is somehow confused.
        console.error(`vatSyscallHandler invoked on dead vat ${vatID}`);
        const problem = 'vat is dead';
        setTerminationTrigger(vatID, true, true, makeError(problem));
        return harden(['error', problem]);
      }
      /** @type { KernelSyscallObject | undefined } */
      let ksc;
      /** @type { KernelSyscallResult } */
      let kres = harden(['error', 'incomplete']);
      /** @type { VatSyscallResult } */
      let vres = harden(['error', 'incomplete']);

      try {
        // This can throw if the vat asks for something not on their clist,
        // or their syscall doesn't make sense in some other way, or due to a
        // kernel bug, all of which are fatal to the vat.
        ksc = translators.vatSyscallToKernelSyscall(vatSyscallObject);
      } catch (vaterr) {
        // prettier-ignore
        kdebug(`vat ${vatID} terminated: error during translation: ${vaterr} ${JSON.stringify(vatSyscallObject)}`);
        console.log(`error during syscall translation:`, vaterr);
        const problem = 'syscall translation error: prepare to die';
        setTerminationTrigger(vatID, true, true, makeError(problem));
        kres = harden(['error', problem]);
        vres = harden(['error', problem]);
        // we leave this catch() with ksc=undefined, so no doKernelSyscall()
      }

      /** @type { SlogFinishSyscall } */
      const finish = kernelSlog.syscall(vatID, ksc, vatSyscallObject);

      if (ksc) {
        try {
          // this can throw if kernel is buggy
          kres = kernelSyscallHandler.doKernelSyscall(ksc);

          // kres is a KernelResult: ['ok', value] or ['error', problem],
          // where 'error' means we want the calling vat's syscall() to
          // throw. Vats (liveslots) record the response in the transcript
          // (which is why we use 'null' instead of 'undefined', TODO clean
          // this up #4390), but otherwise most syscalls ignore it. The one
          // syscall that pays attention is callNow(), which assumes it's
          // capdata.

          // this can throw if the translator is buggy
          vres = translators.kernelSyscallResultToVatSyscallResult(
            ksc[0],
            kres,
          );

          // here, vres is ['ok', null] or ['ok', capdata] or ['error', problem]
        } catch (err) {
          // kernel/translator errors cause a kernel panic
          panic(`error during syscall/device.invoke: ${err}`, err);
          // the kernel is now in a shutdown state, but it may take a while to
          // grind to a halt
          const problem = 'you killed my kernel. prepare to die';
          setTerminationTrigger(vatID, true, true, makeError(problem));
          vres = harden(['error', problem]);
        }
      }
      finish(kres, vres);
      return vres;
    }
    return vatSyscallHandler;
  }

  const vatLoader = makeVatLoader({
    vatManagerFactory,
    kernelSlog,
    makeVatConsole,
    kernelKeeper,
    panic,
    buildVatSyscallHandler,
    vatAdminRootKref,
    overrideVatManagerOptions,
  });

  const vatWarehouse = makeVatWarehouse(
    kernelKeeper,
    vatLoader,
    warehousePolicy,
  );

  /**
   * Create a dynamically generated vat for testing purposes.  Such vats are
   * defined by providing a setup function rather than a bundle and can be
   * instantiated without a controller and without an initialized kernel.  These
   * vats are subject to some severe limitations: they will have no reliable
   * persistent state (that is, after the kernel exits, there is no pretense
   * that the swingset could be resumed) and they are limited to local vats.
   * Although they are dynamically creatd, these vats will have names like
   * static vats so that they can be looked up by calling
   * `kernel.vatNameToID()`.
   *
   * @param {string} name  Name for the vat
   * @param {*} setup  Setup function that will return a dispatcher for the vat
   * @param {*} vatParameters  Vat configuration parameters
   * @param {*} creationOptions  Options controlling vat creation
   *
   * This function is intended to provide minimal scaffolding for unit tests and
   * should never be used in a production environment.
   */
  async function createTestVat(
    name,
    setup,
    vatParameters = {},
    creationOptions = {},
  ) {
    assert.typeof(
      setup,
      'function',
      X`setup is not a function, rather ${setup}`,
    );
    assertKnownOptions(creationOptions, [
      'enablePipelining',
      'metered',
      'reapInterval',
    ]);

    assert(!kernelKeeper.hasVatWithName(name), X`vat ${name} already exists`);
    creationOptions.vatParameters = vatParameters;

    const vatID = kernelKeeper.allocateVatIDForNameIfNeeded(name);
    logStartup(`assigned VatID ${vatID} for test vat ${name}`);

    if (!creationOptions.reapInterval) {
      creationOptions.reapInterval = 'never';
    }
    const vatKeeper = kernelKeeper.provideVatKeeper(vatID);
    vatKeeper.initializeReapCountdown(creationOptions.reapInterval);

    await vatWarehouse.loadTestVat(vatID, setup, creationOptions);
    return vatID;
  }

  function buildDeviceManager(
    deviceID,
    name,
    buildRootDeviceNode,
    endowments,
    deviceParameters,
  ) {
    const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
    // Wrapper for state, to give to the device to access its state.
    // Devices are allowed to get their state at startup, and set it anytime.
    // They do not use orthogonal persistence or transcripts.
    const state = harden({
      get() {
        return deviceKeeper.getDeviceState();
      },
      set(value) {
        deviceKeeper.setDeviceState(value);
      },
    });
    const manager = makeDeviceManager(
      name,
      buildRootDeviceNode,
      state,
      endowments,
      testLog,
      deviceParameters,
    );
    return manager;
  }

  // plug a new DeviceManager into the kernel
  function addDeviceManager(deviceID, name, manager) {
    const translators = makeDeviceTranslators(deviceID, name, kernelKeeper);
    function deviceSyscallHandler(deviceSyscallObject) {
      const ksc = translators.deviceSyscallToKernelSyscall(deviceSyscallObject);
      // devices can only do syscall.sendOnly, which has no results
      kernelSyscallHandler.doKernelSyscall(ksc);
    }
    manager.setDeviceSyscallHandler(deviceSyscallHandler);

    ephemeral.devices.set(deviceID, {
      translators,
      manager,
    });
  }

  async function start() {
    if (started) {
      throw Error('kernel.start already called');
    }
    started = true;
    assert(kernelKeeper.getInitialized(), X`kernel not initialized`);

    await vatWarehouse.start(logStartup);

    // the admin device is endowed directly by the kernel
    deviceEndowments.vatAdmin = {
      pushCreateVatEvent(source, dynamicOptions) {
        const vatID = kernelKeeper.allocateUnusedVatID();
        const event = { type: 'create-vat', vatID, source, dynamicOptions };
        kernelKeeper.addToRunQueue(harden(event));
        // the device gets the new vatID immediately, and will be notified
        // later when it is created and a root object is available
        return vatID;
      },
      terminate: (vatID, reason) => terminateVat(vatID, true, reason),
      meterCreate: (remaining, threshold) =>
        kernelKeeper.allocateMeter(remaining, threshold),
      meterAddRemaining: (meterID, delta) =>
        kernelKeeper.addMeterRemaining(meterID, delta),
      meterSetThreshold: (meterID, threshold) =>
        kernelKeeper.setMeterThreshold(meterID, threshold),
      meterGet: meterID => kernelKeeper.getMeter(meterID),
    };

    // instantiate all devices
    for (const [name, deviceID] of kernelKeeper.getDevices()) {
      logStartup(`starting device ${name} as ${deviceID}`);
      const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
      const { source, options } = deviceKeeper.getSourceAndOptions();
      assertKnownOptions(options, ['deviceParameters', 'unendowed']);
      const { deviceParameters = {}, unendowed } = options;
      const devConsole = makeConsole(`${debugPrefix}SwingSet:dev-${name}`);
      // eslint-disable-next-line no-await-in-loop
      const NS = await importBundle(source.bundle, {
        filePrefix: `dev-${name}/...`,
        endowments: harden({ ...vatEndowments, console: devConsole, assert }),
      });
      assert(
        typeof NS.buildRootDeviceNode === 'function',
        `device ${name} lacks buildRootDeviceNode`,
      );
      if (deviceEndowments[name] || unendowed) {
        const manager = buildDeviceManager(
          deviceID,
          name,
          NS.buildRootDeviceNode,
          deviceEndowments[name],
          deviceParameters,
        );
        addDeviceManager(deviceID, name, manager);
      } else {
        console.log(
          `WARNING: skipping device ${deviceID} (${name}) because it has no endowments`,
        );
      }
    }

    kernelKeeper.loadStats();
  }

  function getNextMessage() {
    const gcMessage = processNextGCAction(kernelKeeper);
    if (gcMessage) {
      return gcMessage;
    }
    const reapMessage = kernelKeeper.nextReapAction();
    if (reapMessage) {
      return reapMessage;
    }

    if (!kernelKeeper.isRunQueueEmpty()) {
      return kernelKeeper.getNextMsg();
    }
    return undefined;
  }

  async function step() {
    if (kernelPanic) {
      throw kernelPanic;
    }
    if (!started) {
      throw new Error('must do kernel.start() before step()');
    }
    // process a single message
    const message = getNextMessage();
    if (message) {
      await processQueueMessage(message);
      if (kernelPanic) {
        throw kernelPanic;
      }
      kernelKeeper.commitCrank();
      return 1;
    } else {
      kernelKeeper.commitCrank();
      return 0;
    }
  }

  /**
   * Run the kernel until the policy says to stop, or the queue is empty.
   *
   * @param {RunPolicy?} policy - a RunPolicy to limit the work being done
   * @returns { Promise<number> } The number of cranks that were executed.
   */

  async function run(policy = foreverPolicy()) {
    assert(policy);
    if (kernelPanic) {
      throw kernelPanic;
    }
    if (!started) {
      throw new Error('must do kernel.start() before run()');
    }
    let count = 0;
    for (;;) {
      const message = getNextMessage();
      if (!message) {
        break;
      }
      count += 1;
      /** @type { PolicyInput } */
      // eslint-disable-next-line no-await-in-loop
      const policyInput = await processQueueMessage(message);
      if (kernelPanic) {
        throw kernelPanic;
      }
      // console.log(`policyInput`, policyInput);
      let policyOutput = true; // keep going
      switch (policyInput[0]) {
        case 'create-vat':
          policyOutput = policy.vatCreated(policyInput[1]);
          break;
        case 'crank':
          policyOutput = policy.crankComplete(policyInput[1]);
          break;
        case 'crank-failed':
          policyOutput = policy.crankFailed(policyInput[1]);
          break;
        case 'none':
          break;
        default:
          assert.fail(`unknown policyInput type in ${policyInput}`);
      }
      if (!policyOutput) {
        // console.log(`ending c.run() by policy, count=${count}`);
        return count;
      }
    }
    kernelKeeper.commitCrank();
    return count;
  }

  // mostly used by tests, only needed with thread/process-based workers
  function shutdown() {
    return vatWarehouse.shutdown();
  }

  function kpRegisterInterest(kpid) {
    kernelKeeper.incrementRefCount(kpid, 'external');
  }

  function kpStatus(kpid) {
    try {
      const p = kernelKeeper.getKernelPromise(kpid);
      if (p) {
        return p.state;
      } else {
        return 'unknown';
      }
    } catch (e) {
      return 'unknown';
    }
  }

  function kpResolution(kpid) {
    const p = kernelKeeper.getKernelPromise(kpid);
    switch (p.state) {
      case 'unresolved':
        assert.fail(X`resolution of ${kpid} is still pending`);
      case 'fulfilled':
      case 'rejected':
        kernelKeeper.decrementRefCount(kpid, 'external');
        for (const kref of p.data.slots) {
          kernelKeeper.incrementRefCount(kref, 'external');
        }
        return p.data;
      default:
        assert.fail(X`invalid state for ${kpid}: ${p.state}`);
    }
  }

  const kernel = harden({
    // these are meant for the controller
    start,
    step,
    run,
    shutdown,

    // the rest are for testing and debugging

    createTestVat,

    log(str) {
      ephemeral.log.push(`${str}`);
    },

    getStats() {
      return kernelKeeper.getStats();
    },

    getStatus() {
      return harden({
        activeVats: vatWarehouse.activeVatsInfo(),
      });
    },

    getActivityhash() {
      return kernelKeeper.getActivityhash();
    },

    dump() {
      // note: dump().log is not deterministic, since log() does not go
      // through the syscall interface (and we replay transcripts one vat at
      // a time, so any log() calls that were interleaved during their
      // original execution will be sorted by vat in the replay). Logs are
      // not kept in the persistent state, only in ephemeral state.
      return { log: ephemeral.log, ...kernelKeeper.dump() };
    },
    kdebugEnable,

    addImport,
    addExport,
    getRootObject(vatID) {
      return exportRootObject(kernelKeeper, vatID);
    },
    pinObject,
    vatNameToID,
    deviceNameToID,
    queueToKref,
    kpRegisterInterest,
    kpStatus,
    kpResolution,
  });

  return kernel;
}
