import { Remotable, getInterfaceOf } from '@agoric/marshal';
import { assert } from '@agoric/assert';
import { importBundle } from '@agoric/import-bundle';
import { assertKnownOptions } from '../assertOptions';
import { makeVatManagerFactory } from './vatManager/factory';
import makeDeviceManager from './deviceManager';
import { wrapStorage } from './state/storageWrapper';
import makeKernelKeeper from './state/kernelKeeper';
import { kdebug, kdebugEnable, legibilizeMessageArgs } from './kdebug';
import { insistKernelType, parseKernelSlot } from './parseKernelSlots';
import { parseVatSlot } from '../parseVatSlots';
import { insistStorageAPI } from '../storageAPI';
import { insistCapData } from '../capdata';
import { insistMessage } from '../message';
import { insistDeviceID, insistVatID } from './id';
import { makeMeterManager } from './metering';
import { makeKernelSyscallHandler, doSend } from './kernelSyscall';
import { makeSlogger, makeDummySlogger } from './slogger';

import { makeVatLoader } from './loadVat';
import { makeVatTranslators } from './vatTranslator';
import { makeDeviceTranslators } from './deviceTranslator';

function abbreviateReviver(_, arg) {
  if (typeof arg === 'string' && arg.length >= 40) {
    // truncate long strings
    return `${arg.slice(0, 15)}...${arg.slice(arg.length - 15)}`;
  }
  return arg;
}

function makeError(message, name = 'Error') {
  const err = { '@qclass': 'error', name, message };
  return harden({ body: JSON.stringify(err), slots: [] });
}

const VAT_TERMINATION_ERROR = makeError('vat terminated');

function doAddExport(kernelKeeper, fromVatID, vatSlot) {
  insistVatID(fromVatID);
  assert(parseVatSlot(vatSlot).allocatedByVat);
  const vatKeeper = kernelKeeper.getVatKeeper(fromVatID);
  return vatKeeper.mapVatSlotToKernelSlot(vatSlot);
}

/**
 * Enqueue a message to some object exported by a vat, as if the message had
 * been sent by some other vat.
 *
 * @param {*} kernelKeeper  Kernel keeper managing persistent kernel state
 * @param {string} vatID  The vat to which the message is to be delivered
 * @param {string} vatSlot  That vat's ID for the object to deliver to
 * @param {string} method  The message verb
 * @param {*} args  The message arguments
 * @param {string}  policy How the kernel should handle an eventual resolution or
 *    rejection of the message's result promise.  Should be one of 'ignore' (do
 *    nothing), 'logAlways' (log the resolution or rejection), 'logFailure' (log
 *    only rejections), or 'panic' (panic the kernel upon a rejection).
 *
 * @returns {string} the kpid of the sent message's result promise
 */
export function doQueueToExport(
  kernelKeeper,
  vatID,
  vatSlot,
  method,
  args,
  policy = 'ignore',
) {
  // queue a message on the end of the queue, with 'absolute' kernelSlots.
  // Use 'step' or 'run' to execute it
  insistVatID(vatID);
  parseVatSlot(vatSlot);
  insistCapData(args);
  args.slots.forEach(s => parseKernelSlot(s));

  const resultKPID = kernelKeeper.addKernelPromise(policy);
  const msg = harden({ method, args, result: resultKPID });
  const kernelSlot = doAddExport(kernelKeeper, vatID, vatSlot);
  doSend(kernelKeeper, kernelSlot, msg);
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
    makeConsole,
    replaceGlobalMeter,
    transformMetering,
    transformTildot,
    makeNodeWorker,
    startSubprocessWorkerNode,
    startSubprocessWorkerXS,
    writeSlogObject,
    WeakRef,
    FinalizationRegistry,
  } = kernelEndowments;
  deviceEndowments = { ...deviceEndowments }; // copy so we can modify
  const { verbose, testTrackDecref = false } = kernelOptions;
  const logStartup = verbose ? console.debug : () => 0;

  insistStorageAPI(hostStorage);
  const { enhancedCrankBuffer, abortCrank, commitCrank } = wrapStorage(
    hostStorage,
  );

  const kernelSlog = writeSlogObject
    ? makeSlogger(writeSlogObject)
    : makeDummySlogger(makeConsole);

  const kernelKeeper = makeKernelKeeper(enhancedCrankBuffer, kernelSlog);

  const meterManager = makeMeterManager(replaceGlobalMeter);

  let started = false;

  const ephemeral = {
    vats: new Map(), // vatID -> { manager, enablePipelining }
    devices: new Map(), // deviceID -> { manager }
    log: [],
  };

  // This is a low-level output-only string logger used by old unit tests to
  // see whether vats made progress or not. The array it appends to is
  // available as c.dump().log . New unit tests should instead use the
  // 'result' value returned by c.queueToExport()
  function testLog(...args) {
    const rendered = args.map(arg =>
      typeof arg === 'string' ? arg : JSON.stringify(arg, abbreviateReviver),
    );
    ephemeral.log.push(rendered.join(''));
  }
  harden(testLog);

  function makeVatConsole(vatID) {
    const origConsole = makeConsole(`${debugPrefix}SwingSet:${vatID}`);
    return kernelSlog.vatConsole(vatID, origConsole);
  }

  const pendingDecrefs = [];
  function decref(vatID, vref, count) {
    assert(ephemeral.vats.has(vatID), `unknown vatID ${vatID}`);
    assert(count > 0, `bad count ${count}`);
    // TODO: decrement the clist import counter by 'count', then GC if zero
    if (testTrackDecref) {
      console.log(`kernel decref [${vatID}].${vref} -= ${count}`);
      pendingDecrefs.push({ vatID, vref, count });
    }
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

  // Not all vats get all powers. We're phasing out in-vat metering, so
  // `makeGetMeter` and `transformMetering` are only available to static vats
  // in a local worker, and will eventually go away entirely once Spawner
  // uses dynamic vats.

  // These will eventually be provided by the in-worker supervisor instead.

  // We need to give the vat the correct Remotable and getKernelPromise so
  // that they can access our own @agoric/marshal, not a separate instance in
  // a bundle. TODO: ideally the powerless ones (Remotable, getInterfaceOf,
  // maybe transformMetering) are imported by the vat, not passed in an
  // argument. The powerful one (makeGetMeter) should only be given to the
  // root object, to share with (or withhold from) other objects as it sees
  // fit. TODO: makeGetMeter and transformMetering will go away

  const allVatPowers = harden({
    Remotable,
    getInterfaceOf,
    makeGetMeter: meterManager.makeGetMeter,
    transformMetering: (...args) =>
      meterManager.runWithoutGlobalMeter(transformMetering, ...args),
    transformTildot: (...args) =>
      meterManager.runWithoutGlobalMeter(transformTildot, ...args),
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
    const vatKeeper = kernelKeeper.getVatKeeper(forVatID);
    return vatKeeper.mapKernelSlotToVatSlot(kernelSlot);
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
    storage: enhancedCrankBuffer,
    ephemeral,
    // eslint-disable-next-line no-use-before-define
    notify,
    // eslint-disable-next-line no-use-before-define
    notifySubscribersAndQueue,
    // eslint-disable-next-line no-use-before-define
    resolveToError,
    // eslint-disable-next-line no-use-before-define
    setTerminationTrigger,
  });

  // If `kernelPanic` is set to non-null, vat execution code will throw it as an
  // error at the first opportunity
  let kernelPanic = null;

  function panic(problem, err) {
    console.error(`##### KERNEL PANIC: ${problem} #####`);
    kernelPanic = err || new Error(`kernel panic ${problem}`);
  }

  /**
   * Enqueue a message to some object exported by a vat, as if the message had
   * been sent by some other vat.
   *
   * @param {string} vatID  The vat to which the message is to be delivered
   * @param {string} vatSlot  That vat's ID for the object to deliver to
   * @param {string} method  The message verb
   * @param {*} args  The message arguments
   * @param {string} policy  How the kernel should handle an eventual resolution
   *    or rejection of the message's result promise.  Should be one of 'ignore'
   *    (do nothing), 'logAlways' (log the resolution or rejection),
   *    'logFailure' (log only rejections), or 'panic' (panic the kernel upon a
   *    rejection).
   *
   * @returns {string} the kpid of the sent message's result promise
   */
  function queueToExport(vatID, vatSlot, method, args, policy = 'ignore') {
    return doQueueToExport(kernelKeeper, vatID, vatSlot, method, args, policy);
  }

  function notify(vatID, kpid) {
    const m = harden({ type: 'notify', vatID, kpid });
    kernelKeeper.incrementRefCount(kpid, `enq|notify`);
    kernelKeeper.addToRunQueue(m);
  }

  function notifySubscribersAndQueue(kpid, resolvingVatID, subscribers, queue) {
    insistKernelType('promise', kpid);
    for (const vatID of subscribers) {
      if (vatID !== resolvingVatID) {
        notify(vatID, kpid);
      }
    }
    // re-deliver msg to the now-settled promise, which will forward or
    // reject depending on the new state of the promise
    for (const msg of queue) {
      // todo: this is slightly lazy, sending the message back to the same
      // promise that just got resolved. When this message makes it to the
      // front of the run-queue, we'll look up the resolution. Instead, we
      // could maybe look up the resolution *now* and set the correct target
      // early. Doing that might make it easier to remove the Promise Table
      // entry earlier.
      kernelSyscallHandler.send(kpid, msg);
    }
  }

  function resolveToError(kpid, errorData, expectedDecider) {
    insistCapData(errorData);
    const p = kernelKeeper.getResolveablePromise(kpid, expectedDecider);
    const { subscribers, queue } = p;
    let idx = 0;
    for (const dataSlot of errorData.slots) {
      kernelKeeper.incrementRefCount(dataSlot, `reject|s${idx}`);
      idx += 1;
    }
    kernelKeeper.rejectKernelPromise(kpid, errorData);
    // we don't notify the decider; they already know
    notifySubscribersAndQueue(kpid, expectedDecider, subscribers, queue);
    if (p.policy === 'logFailure' || p.policy === 'logAlways') {
      console.log(
        `${kpid}.policy ${p.policy}: rejection ${JSON.stringify(errorData)}`,
      );
    } else if (p.policy === 'panic') {
      panic(`${kpid}.policy panic: rejection ${JSON.stringify(errorData)}`);
    }
  }

  function removeVatManager(vatID, shouldReject, info) {
    insistCapData(info);
    const old = ephemeral.vats.get(vatID);
    ephemeral.vats.delete(vatID);
    old.notifyTermination(shouldReject, info);
    return old.manager.shutdown();
  }

  function terminateVat(vatID, shouldReject, info) {
    insistCapData(info);
    if (kernelKeeper.getVatKeeper(vatID)) {
      const promisesToReject = kernelKeeper.cleanupAfterTerminatedVat(vatID);
      for (const kpid of promisesToReject) {
        resolveToError(kpid, VAT_TERMINATION_ERROR, vatID);
      }
      removeVatManager(vatID, shouldReject, info).then(
        () => kdebug(`terminated vat ${vatID}`),
        e => console.error(`problem terminating vat ${vatID}`, e),
      );
    }
  }

  let terminationTrigger;

  function setTerminationTrigger(vatID, shouldAbortCrank, shouldReject, info) {
    if (shouldAbortCrank) {
      assert(shouldReject);
    }
    if (!terminationTrigger || shouldAbortCrank) {
      terminationTrigger = { vatID, shouldAbortCrank, shouldReject, info };
    }
  }

  async function deliverAndLogToVat(vatID, kernelDelivery, vatDelivery) {
    const vat = ephemeral.vats.get(vatID);
    const crankNum = kernelKeeper.getCrankNumber();
    const finish = kernelSlog.delivery(
      vatID,
      crankNum,
      kernelDelivery,
      vatDelivery,
    );
    try {
      const deliveryResult = await vat.manager.deliver(vatDelivery);
      finish(deliveryResult);
      const [status, problem] = deliveryResult;
      if (status !== 'ok') {
        setTerminationTrigger(vatID, true, true, makeError(problem));
      }
    } catch (e) {
      // log so we get a stack trace
      console.error(`error in kernel.deliver:`, e);
      throw e;
    }
  }

  async function deliverToVat(vatID, target, msg) {
    insistMessage(msg);
    const vat = ephemeral.vats.get(vatID);
    kernelKeeper.incStat('dispatches');
    kernelKeeper.incStat('dispatchDeliver');
    if (!vat) {
      resolveToError(msg.result, VAT_TERMINATION_ERROR);
    } else {
      const kd = harden(['message', target, msg]);
      const vd = vat.translators.kernelDeliveryToVatDelivery(kd);
      await deliverAndLogToVat(vatID, kd, vd);
    }
  }

  async function deliverToTarget(target, msg) {
    insistMessage(msg);
    const { type } = parseKernelSlot(target);
    if (type === 'object') {
      const vatID = kernelKeeper.ownerOfKernelObject(target);
      if (vatID) {
        await deliverToVat(vatID, target, msg);
      } else {
        resolveToError(msg.result, VAT_TERMINATION_ERROR);
      }
    } else if (type === 'promise') {
      const kp = kernelKeeper.getKernelPromise(target);
      if (kp.state === 'fulfilledToPresence') {
        await deliverToTarget(kp.slot, msg);
      } else if (kp.state === 'redirected') {
        // await deliverToTarget(kp.redirectTarget, msg); // probably correct
        // TODO unimplemented
        throw new Error('not implemented yet');
      } else if (kp.state === 'fulfilledToData') {
        if (msg.result) {
          const s = `data is not callable, has no method ${msg.method}`;
          // TODO: maybe replicate whatever happens with {}.foo() or 3.foo()
          // etc: "TypeError: {}.foo is not a function"
          await resolveToError(msg.result, makeError(s));
        }
        // todo: maybe log error?
      } else if (kp.state === 'rejected') {
        // TODO would it be simpler to redirect msg.kpid to kp?
        if (msg.result) {
          await resolveToError(msg.result, kp.data);
        }
      } else if (kp.state === 'unresolved') {
        if (!kp.decider) {
          kernelKeeper.addMessageToPromiseQueue(target, msg);
        } else {
          insistVatID(kp.decider);
          const deciderVat = ephemeral.vats.get(kp.decider);
          if (deciderVat) {
            if (deciderVat.enablePipelining) {
              await deliverToVat(kp.decider, target, msg);
            } else {
              kernelKeeper.addMessageToPromiseQueue(target, msg);
            }
          } else {
            resolveToError(msg.result, VAT_TERMINATION_ERROR);
          }
        }
      } else {
        throw new Error(`unknown kernelPromise state '${kp.state}'`);
      }
    } else {
      throw Error(`unable to send() to slot.type ${type}`);
    }
  }

  function statNameForNotify(state) {
    switch (state) {
      case 'fulfilledToPresence':
        return 'dispatchNotifyFulfillToPresence';
      case 'fulfilledToData':
        return 'dispatchNotifyFulfillToData';
      case 'rejected':
        return 'dispatchNotifyReject';
      default:
        throw Error(`unknown promise state ${state}`);
    }
  }

  async function processNotify(message) {
    const { vatID, kpid } = message;
    insistVatID(vatID);
    insistKernelType('promise', kpid);
    const vat = ephemeral.vats.get(vatID);
    kernelKeeper.incStat('dispatches');
    if (!vat) {
      kdebug(`dropping notify of ${kpid} to ${vatID} because vat is dead`);
    } else {
      const p = kernelKeeper.getKernelPromise(kpid);
      kernelKeeper.incStat(statNameForNotify(p.state));
      const kd = harden(['notify', kpid, p]);
      const vd = vat.translators.kernelDeliveryToVatDelivery(kd);
      if (vd) {
        await deliverAndLogToVat(vatID, kd, vd);

        const resolutions = vd[1];
        const vatKeeper = kernelKeeper.getVatKeeper(vatID);
        for (const vpid of Object.keys(resolutions)) {
          const kpidToDelete = vatKeeper.mapVatSlotToKernelSlot(vpid);
          vatKeeper.deleteCListEntry(kpidToDelete, vpid);
        }
      }
    }
  }

  function legibilizeMessage(message) {
    if (message.type === 'send') {
      const msg = message.msg;
      const argList = legibilizeMessageArgs(msg.args).join(', ');
      const result = msg.result ? msg.result : 'null';
      return `@${message.target} <- ${msg.method}(${argList}) : @${result}`;
    } else if (message.type === 'notify') {
      return `notify(vatID: ${message.vatID}, kpid: @${message.kpid})`;
    } else {
      return `unknown message type ${message.type}`;
    }
  }

  let processQueueRunning;
  async function processQueueMessage(message) {
    kdebug(`processQ ${JSON.stringify(message)}`);
    kdebug(legibilizeMessage(message));
    if (processQueueRunning) {
      console.error(`We're currently already running at`, processQueueRunning);
      throw Error(`Kernel reentrancy is forbidden`);
    }
    try {
      processQueueRunning = Error('here');
      terminationTrigger = null;
      if (message.type === 'send') {
        kernelKeeper.decrementRefCount(message.target, `deq|msg|t`);
        kernelKeeper.decrementRefCount(message.msg.result, `deq|msg|r`);
        let idx = 0;
        for (const argSlot of message.msg.args.slots) {
          kernelKeeper.decrementRefCount(argSlot, `deq|msg|s${idx}`);
          idx += 1;
        }
        await deliverToTarget(message.target, message.msg);
      } else if (message.type === 'notify') {
        kernelKeeper.decrementRefCount(message.kpid, `deq|notify`);
        await processNotify(message);
      } else {
        throw Error(`unable to process message.type ${message.type}`);
      }
      let didAbort = false;
      if (terminationTrigger) {
        const {
          vatID,
          shouldAbortCrank,
          shouldReject,
          info,
        } = terminationTrigger;
        if (shouldAbortCrank) {
          abortCrank();
          didAbort = true;
        }
        terminateVat(vatID, shouldReject, info);
        kernelSlog.terminateVat(vatID, shouldReject, info);
        kdebug(`vat terminated: ${JSON.stringify(info)}`);
      }
      if (!didAbort) {
        kernelKeeper.purgeDeadKernelPromises();
        kernelKeeper.saveStats();
      }
      commitCrank();
      kernelKeeper.incrementCrankNumber();
    } finally {
      processQueueRunning = undefined;
    }
  }

  const gcTools = harden({ WeakRef, FinalizationRegistry, decref });
  const vatManagerFactory = makeVatManagerFactory({
    allVatPowers,
    kernelKeeper,
    vatEndowments,
    meterManager,
    testLog,
    transformMetering,
    waitUntilQuiescent,
    makeNodeWorker,
    startSubprocessWorkerNode,
    startSubprocessWorkerXS,
    gcTools,
  });

  function buildVatSyscallHandler(vatID, translators) {
    // This handler never throws. The VatSyscallResult it returns is one of:
    // * success, no response data: ['ok', null]
    // * success, capdata (callNow) ['ok', capdata]
    // * exit, capdata ['exit', capdata]
    // * error: you are dead ['error, description]
    // the VatManager+VatWorker will see the error case, but liveslots will
    // not
    function vatSyscallHandler(vatSyscallObject) {
      if (!ephemeral.vats.get(vatID)) {
        // This is a safety check -- this case should never happen unless the
        // vatManager is somehow confused.
        console.error(`vatSyscallHandler invoked on dead vat ${vatID}`);
        const problem = 'vat is dead';
        setTerminationTrigger(vatID, true, true, makeError(problem));
        return harden(['error', problem]);
      }
      let ksc;
      try {
        // this can fail if the vat asks for something not on their clist,
        // which is fatal to the vat
        ksc = translators.vatSyscallToKernelSyscall(vatSyscallObject);
      } catch (vaterr) {
        kdebug(`vat ${vatID} terminated: error during translation: ${vaterr}`);
        const problem = 'clist violation: prepare to die';
        setTerminationTrigger(vatID, true, true, makeError(problem));
        return harden(['error', problem]);
      }

      const finish = kernelSlog.syscall(vatID, ksc, vatSyscallObject);
      let vres;
      try {
        // this can fail if kernel or device code is buggy
        const kres = kernelSyscallHandler.doKernelSyscall(ksc);
        // kres is a KernelResult ([successFlag, value]), but since errors
        // here are signalled with exceptions, kres is ['ok', value]. Vats
        // (liveslots) record the response in the transcript (which is why we
        // use 'null' instead of 'undefined', TODO clean this up), but otherwise
        // most syscalls ignore it. The one syscall that pays attention is
        // callNow(), which assumes it's capdata.
        vres = translators.kernelSyscallResultToVatSyscallResult(ksc[0], kres);
        // here, vres is either ['ok', null] or ['ok', capdata]
        finish(kres, vres); // TODO call meaningfully on failure too?
      } catch (err) {
        // kernel/device errors cause a kernel panic
        panic(`error during syscall/device.invoke: ${err}`, err);
        // the kernel is now in a shutdown state, but it may take a while to
        // grind to a halt
        const problem = 'you killed my kernel. prepare to die';
        setTerminationTrigger(vatID, true, true, makeError(problem));
        return harden(['error', problem]);
      }

      return vres;
    }
    return vatSyscallHandler;
  }

  /*
   * Take an existing VatManager (which is already configured to talk to a
   * VatWorker, loaded with some vat code) and connect it to the rest of the
   * kernel. The vat must be ready to go: any initial buildRootObject
   * construction should have happened by this point. However the kernel
   * might tell the manager to replay the transcript later, if it notices
   * we're reloading a saved state vector.
   */
  function addVatManager(vatID, manager, managerOptions) {
    // addVatManager takes a manager, not a promise for one
    assert(
      manager.deliver && manager.setVatSyscallHandler,
      `manager lacks .deliver, isPromise=${manager instanceof Promise}`,
    );
    const {
      enablePipelining = false,
      notifyTermination = () => {},
    } = managerOptions;
    kernelKeeper.getVatKeeper(vatID);
    const translators = makeVatTranslators(vatID, kernelKeeper);

    ephemeral.vats.set(
      vatID,
      harden({
        translators,
        manager,
        notifyTermination,
        enablePipelining: Boolean(enablePipelining),
      }),
    );

    const vatSyscallHandler = buildVatSyscallHandler(vatID, translators);
    manager.setVatSyscallHandler(vatSyscallHandler);
  }

  const {
    createVatDynamically,
    recreateDynamicVat,
    recreateStaticVat,
    loadTestVat,
  } = makeVatLoader({
    allocateUnusedVatID: kernelKeeper.allocateUnusedVatID,
    vatNameToID,
    vatManagerFactory,
    kernelSlog,
    makeVatConsole,
    addVatManager,
    addExport,
    queueToExport,
    kernelKeeper,
    panic,
  });

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
    if (typeof setup !== 'function') {
      throw Error(`setup is not a function, rather ${setup}`);
    }
    assertKnownOptions(creationOptions, ['enablePipelining', 'metered']);

    if (kernelKeeper.hasVatWithName(name)) {
      throw Error(`vat ${name} already exists`);
    }
    creationOptions.vatParameters = vatParameters;

    const vatID = kernelKeeper.allocateVatIDForNameIfNeeded(name);
    logStartup(`assigned VatID ${vatID} for test vat ${name}`);
    kernelKeeper.allocateVatKeeper(vatID);

    await loadTestVat(vatID, setup, creationOptions);
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

  function collectVatStats(vatID) {
    insistVatID(vatID);
    const vatKeeper = kernelKeeper.getVatKeeper(vatID);
    return vatKeeper.vatStats();
  }

  async function start() {
    if (started) {
      throw Error('kernel.start already called');
    }
    started = true;
    if (!kernelKeeper.getInitialized()) {
      throw Error(`kernel not initialized`);
    }

    // instantiate all static vats
    for (const [name, vatID] of kernelKeeper.getStaticVats()) {
      logStartup(`starting static vat ${name} as vat ${vatID}`);
      const vatKeeper = kernelKeeper.allocateVatKeeper(vatID);
      const { source, options } = vatKeeper.getSourceAndOptions();
      // eslint-disable-next-line no-await-in-loop
      await recreateStaticVat(vatID, source, options);
      // now the vatManager is attached and ready for transcript replay
    }

    // instantiate all dynamic vats
    for (const vatID of kernelKeeper.getDynamicVats()) {
      logStartup(`starting dynamic vat ${vatID}`);
      const vatKeeper = kernelKeeper.allocateVatKeeper(vatID);
      const { source, options } = vatKeeper.getSourceAndOptions();
      // eslint-disable-next-line no-await-in-loop
      await recreateDynamicVat(vatID, source, options);
      // now the vatManager is attached and ready for transcript replay
    }

    // the admin device is endowed directly by the kernel
    deviceEndowments.vatAdmin = {
      create: createVatDynamically,
      stats: collectVatStats,
      terminate: (vatID, reason) => terminateVat(vatID, true, reason),
    };

    // instantiate all devices
    for (const [name, deviceID] of kernelKeeper.getDevices()) {
      logStartup(`starting device ${name} as ${deviceID}`);
      const deviceKeeper = kernelKeeper.allocateDeviceKeeperIfNeeded(deviceID);
      const { source, options } = deviceKeeper.getSourceAndOptions();
      assertKnownOptions(options, ['deviceParameters']);
      const { deviceParameters = {} } = options;
      const devConsole = makeConsole(`${debugPrefix}SwingSet:dev-${name}`);
      // eslint-disable-next-line no-await-in-loop
      const NS = await importBundle(source.bundle, {
        filePrefix: `dev-${name}`,
        endowments: harden({ ...vatEndowments, console: devConsole, assert }),
      });
      assert(
        typeof NS.buildRootDeviceNode === 'function',
        `device ${name} lacks buildRootDeviceNode`,
      );
      const manager = buildDeviceManager(
        deviceID,
        name,
        NS.buildRootDeviceNode,
        deviceEndowments[name],
        deviceParameters,
      );
      addDeviceManager(deviceID, name, manager);
    }

    // replay any transcripts
    // This happens every time, now that initialisation is separated from
    // execution.
    console.log('Replaying SwingSet transcripts');
    const oldLength = kernelKeeper.getRunQueueLength();
    for (const vatID of ephemeral.vats.keys()) {
      logStartup(`Replaying transcript of vatID ${vatID}`);
      const vat = ephemeral.vats.get(vatID);
      if (!vat) {
        logStartup(`skipping reload of dead vat ${vatID}`);
      } else {
        // eslint-disable-next-line no-await-in-loop
        await vat.manager.replayTranscript();
        logStartup(`finished replaying vatID ${vatID} transcript `);
        const newLength = kernelKeeper.getRunQueueLength();
        if (newLength !== oldLength) {
          console.log(`SPURIOUS RUNQUEUE`, kernelKeeper.dump().runQueue);
          throw Error(`replay ${vatID} added spurious run-queue entries`);
        }
      }
    }
    kernelKeeper.loadStats();
    kernelKeeper.incrementCrankNumber();
  }

  async function step() {
    if (kernelPanic) {
      throw kernelPanic;
    }
    if (!started) {
      throw new Error('must do kernel.start() before step()');
    }
    // process a single message
    if (!kernelKeeper.isRunQueueEmpty()) {
      await processQueueMessage(kernelKeeper.getNextMsg());
      if (kernelPanic) {
        throw kernelPanic;
      }
      return 1;
    } else {
      return 0;
    }
  }

  async function run() {
    if (kernelPanic) {
      throw kernelPanic;
    }
    if (!started) {
      throw new Error('must do kernel.start() before run()');
    }
    let count = 0;
    while (!kernelKeeper.isRunQueueEmpty()) {
      // eslint-disable-next-line no-await-in-loop
      await processQueueMessage(kernelKeeper.getNextMsg());
      if (kernelPanic) {
        throw kernelPanic;
      }
      count += 1;
    }
    return count;
  }

  // mostly used by tests, only needed with thread/process-based workers
  function shutdown() {
    const vatRecs = Array.from(ephemeral.vats.values());
    return Promise.all(vatRecs.map(rec => rec.manager.shutdown()));
  }

  function kpRegisterInterest(kpid) {
    kernelKeeper.incrementRefCount(kpid, 'external');
  }

  function kpStatus(kpid) {
    try {
      const p = kernelKeeper.getKernelPromise(kpid);
      if (p) {
        switch (p.state) {
          case 'unresolved':
            return 'pending';
          case 'fulfilledToPresence':
          case 'fulfilledToData':
            return 'fulfilled';
          case 'rejected':
            return 'rejected';
          default:
            throw Error(`invalid state for ${kpid}: ${p.state}`);
        }
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
        throw Error(`resolution of ${kpid} is still pending`);
      case 'fulfilledToPresence':
        kernelKeeper.decrementRefCount(kpid, 'external');
        return {
          body: '{"@qclass":"slot",index:0}',
          slots: [p.slot],
        };
      case 'fulfilledToData':
      case 'rejected':
        kernelKeeper.decrementRefCount(kpid, 'external');
        return p.data;
      default:
        throw Error(`invalid state for ${kpid}: ${p.state}`);
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
    dump() {
      // note: dump().log is not deterministic, since log() does not go
      // through the syscall interface (and we replay transcripts one vat at
      // a time, so any log() calls that were interleaved during their
      // original execution will be sorted by vat in the replace). Logs are
      // not kept in the persistent state, only in ephemeral state.
      return { log: ephemeral.log, pendingDecrefs, ...kernelKeeper.dump() };
    },
    kdebugEnable,

    addImport,
    addExport,
    vatNameToID,
    deviceNameToID,
    queueToExport,
    kpRegisterInterest,
    kpStatus,
    kpResolution,
  });

  return kernel;
}
