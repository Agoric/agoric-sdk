/* global HandledPromise */

import {
  QCLASS,
  Remotable,
  getInterfaceOf,
  mustPassByPresence,
  makeMarshal,
} from '@agoric/marshal';
import { assert, details } from '@agoric/assert';
import { isPromise } from '@agoric/promise-kit';
import { insistVatType, makeVatSlot, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';
import { makeVirtualObjectManager } from './virtualObjectManager';

const VIRTUAL_OBJECT_CACHE_SIZE = 3; // XXX ridiculously small value to force churn for testing

// 'makeLiveSlots' is a dispatcher which uses javascript Maps to keep track
// of local objects which have been exported. These cannot be persisted
// beyond the runtime of the javascript environment, so this mechanism is not
// going to work for our in-chain hosts.

/**
 * Instantiate the liveslots layer for a new vat and then populate the vat with
 * a new root object and its initial associated object graph, if any.
 *
 * @param {*} syscall  Kernel syscall interface that the vat will have access to
 * @param {*} forVatID  Vat ID label, for use in debug diagostics
 * @param {*} vatPowers
 * @param {*} vatParameters
 * @returns {*} { vatGlobals, dispatch, setBuildRootObject }
 *
 * setBuildRootObject should be called, once, with a function that will
 * create a root object for the new vat The caller provided buildRootObject
 * function produces and returns the new vat's root object:
 *
 *     buildRootObject(vatPowers, vatParameters)
 */
function build(syscall, forVatID, vatPowers, vatParameters) {
  const enableLSDebug = false;
  function lsdebug(...args) {
    if (enableLSDebug) {
      console.log(...args);
    }
  }

  let didRoot = false;

  const outstandingProxies = new WeakSet();

  /**
   * Map in-vat object references -> vat slot strings.
   *
   * Uses a weak map so that vat objects can (in princple) be GC'd.  Note that
   * they currently can't actually be GC'd because the slotToVal table keeps
   * them alive, but that will have to be addressed by a different mechanism.
   */
  const valToSlot = new WeakMap();

  /** Map vat slot strings -> in-vat object references. */
  const slotToVal = new Map();

  const importedPromisesByPromiseID = new Map();
  let nextExportID = 1;
  let nextPromiseID = 5;

  function makeImportedPresence(slot, iface = `Alleged: presence ${slot}`) {
    // Called by convertSlotToVal for type=object (an `o-NN` reference). We
    // build a Presence for application-level code to receive. This Presence
    // is associated with 'slot' so that all handled messages get sent to
    // that slot: pres~.foo() causes a syscall.send(target=slot, msg=foo).

    lsdebug(`makeImportedPresence(${slot})`);
    const fulfilledHandler = {
      applyMethod(_o, prop, args, returnedP) {
        // Support: o~.[prop](...args) remote method invocation
        lsdebug(`makeImportedPresence handler.applyMethod (${slot})`);
        // eslint-disable-next-line no-use-before-define
        return queueMessage(slot, prop, args, returnedP);
      },
    };

    let presence;
    const p = new HandledPromise((_res, _rej, resolveWithPresence) => {
      const remote = resolveWithPresence(fulfilledHandler);
      presence = Remotable(iface, undefined, remote);
      // remote === presence, actually

      // todo: mfig says to swap remote and presence (resolveWithPresence
      // gives us a Presence, Remotable gives us a Remote). I think that
      // implies we have a lot of renaming to do, 'makeRemote' instead of
      // 'makeImportedPresence', etc. I'd like to defer that for a later
      // cleanup/renaming pass.
    }); // no unfulfilledHandler

    // The call to resolveWithPresence performs the forwarding logic
    // immediately, so by the time we reach here, E(presence).foo() will use
    // our fulfilledHandler, and nobody can observe the fact that we failed
    // to provide an unfulfilledHandler.

    // We throw 'p' away, but it is retained by the internal tables of
    // HandledPromise, and will be returned to anyone who calls
    // `HandledPromise.resolve(presence)`. So we must harden it now, for
    // safety, to prevent it from being used as a communication channel
    // between isolated objects that share a reference to the Presence.
    harden(p);

    // Up at the application level, presence~.foo(args) starts by doing
    // HandledPromise.resolve(presence), which retrieves it, and then does
    // p.eventualSend('foo', [args]), which uses the fulfilledHandler.

    // We harden the presence for the same safety reasons.
    return harden(presence);
  }

  function makeImportedPromise(vpid) {
    // Called by convertSlotToVal(type=promise) for incoming promises (a
    // `p-NN` reference), and by queueMessage() for the result of an outbound
    // message (a `p+NN` reference). We build a Promise for application-level
    // code, to which messages can be pipelined, and we prepare for the
    // kernel to tell us that it has been resolved in various ways.
    insistVatType('promise', vpid);
    lsdebug(`makeImportedPromise(${vpid})`);

    // The Promise will we associated with a handler that converts p~.foo()
    // into a syscall.send() that targets the vpid. When the Promise is
    // resolved (during receipt of a dispatch.notifyFulfill* or
    // notifyReject), this Promise's handler will be replaced by the handler
    // of the resolution, which might be a Presence or a local object.

    // for safety as we shake out bugs in HandledPromise, we guard against
    // this handler being used after it was supposed to be resolved
    let handlerActive = true;
    const unfulfilledHandler = {
      applyMethod(_o, prop, args, returnedP) {
        // Support: o~.[prop](...args) remote method invocation
        lsdebug(`makeImportedPromise handler.applyMethod (${vpid})`);
        if (!handlerActive) {
          console.error(`mIPromise handler called after resolution`);
          throw Error(`mIPromise handler called after resolution`);
        }
        // eslint-disable-next-line no-use-before-define
        return queueMessage(vpid, prop, args, returnedP);
      },
    };

    let resolve;
    let reject;
    const p = new HandledPromise((res, rej, _resPres) => {
      resolve = res;
      reject = rej;
    }, unfulfilledHandler);

    // Prepare for the kernel to tell us about resolution. Both ensure the
    // old handler should never be called again. TODO: once we're confident
    // about how we interact with HandledPromise, just use harden({ resolve,
    // reject }).
    const pRec = harden({
      resolve(resolution) {
        handlerActive = false;
        resolve(resolution);
      },

      reject(rejection) {
        handlerActive = false;
        reject(rejection);
      },
    });
    importedPromisesByPromiseID.set(vpid, pRec);

    return harden(p);
  }

  function makeDeviceNode(id, iface = `Alleged: device ${id}`) {
    return Remotable(iface);
  }

  // TODO: fix awkward non-orthogonality: allocateExportID() returns a number,
  // allocatePromiseID() returns a slot, exportPromise() uses the slot from
  // allocatePromiseID(), exportPassByPresence() generates a slot itself using
  // the number from allocateExportID().  Both allocateX fns should return a
  // number or return a slot; both exportY fns should either create a slot or
  // use a slot from the corresponding allocateX

  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
  }

  function allocatePromiseID() {
    const promiseID = nextPromiseID;
    nextPromiseID += 1;
    return makeVatSlot('promise', true, promiseID);
  }

  function exportPromise(p) {
    const pid = allocatePromiseID();
    lsdebug(`Promise allocation ${forVatID}:${pid} in exportPromise`);
    // eslint-disable-next-line no-use-before-define
    p.then(thenResolve(pid), thenReject(pid));
    return pid;
  }

  function exportPassByPresence() {
    const exportID = allocateExportID();
    return makeVatSlot('object', true, exportID);
  }

  // eslint-disable-next-line no-use-before-define
  const m = makeMarshal(convertValToSlot, convertSlotToVal);

  const {
    makeVirtualObjectRepresentative,
    makeWeakStore,
    makeKind,
    flushCache,
  } = makeVirtualObjectManager(
    syscall,
    allocateExportID,
    valToSlot,
    m,
    VIRTUAL_OBJECT_CACHE_SIZE,
  );

  function convertValToSlot(val) {
    // lsdebug(`serializeToSlot`, val, Object.isFrozen(val));
    // This is either a Presence (in presenceToImportID), a
    // previously-serialized local pass-by-presence object or
    // previously-serialized local Promise (in valToSlot), a new local
    // pass-by-presence object, or a new local Promise.

    // If we've already assigned it an importID or exportID, it might be in
    // slots/slotMap for this particular act of serialization. If it's new,
    // it certainly will not be in slotMap. If we've already serialized it in
    // this particular act, it will definitely be in slotMap.

    if (!valToSlot.has(val)) {
      let slot;
      // must be a new export
      // lsdebug('must be a new export', JSON.stringify(val));
      if (isPromise(val)) {
        slot = exportPromise(val);
      } else {
        mustPassByPresence(val);
        slot = exportPassByPresence();
      }
      parseVatSlot(slot); // assertion
      valToSlot.set(val, slot);
      slotToVal.set(slot, val);
    }
    return valToSlot.get(val);
  }

  function convertSlotToVal(slot, iface = undefined) {
    let val = slotToVal.get(slot);
    if (val) {
      return val;
    }
    const { type, allocatedByVat, virtual } = parseVatSlot(slot);
    if (virtual) {
      // Virtual objects should never be put in the slotToVal table, as their
      // entire raison d'etre is to be absent from memory when they're not being
      // used.  They *do* get put in the valToSlot table, which is OK because
      // it's a WeakMap, but they don't get put there here.  Instead, they are
      // put there by makeVirtualObjectRepresentative, who already has to do
      // this anyway in the cases of creating virtual objects in the first place
      // and swapping them in from disk.
      assert.equal(type, 'object');
      val = makeVirtualObjectRepresentative(slot);
    } else {
      assert(!allocatedByVat, details`I don't remember allocating ${slot}`);
      if (type === 'object') {
        // this is a new import value
        val = makeImportedPresence(slot, iface);
      } else if (type === 'promise') {
        assert(
          !parseVatSlot(slot).allocatedByVat,
          details`kernel is being presumptuous: vat got unrecognized vatSlot ${slot}`,
        );
        val = makeImportedPromise(slot);
        // ideally we'd wait until .then is called on p before subscribing,
        // but the current Promise API doesn't give us a way to discover
        // this, so we must subscribe right away. If we were using Vows or
        // some other then-able, we could just hook then() to notify us.
        syscall.subscribe(slot);
      } else if (type === 'device') {
        val = makeDeviceNode(slot, iface);
      } else {
        throw Error(`unrecognized slot type '${type}'`);
      }
      slotToVal.set(slot, val);
      valToSlot.set(val, slot);
    }
    return val;
  }

  function queueMessage(targetSlot, prop, args, returnedP) {
    const serArgs = m.serialize(harden(args));
    const resultVPID = allocatePromiseID();
    lsdebug(`Promise allocation ${forVatID}:${resultVPID} in queueMessage`);
    // create a Promise which callers follow for the result, give it a
    // handler so we can pipeline messages to it, and prepare for the kernel
    // to notify us of its resolution
    const p = makeImportedPromise(resultVPID);

    lsdebug(
      `ls.qm send(${JSON.stringify(targetSlot)}, ${prop}) -> ${resultVPID}`,
    );
    syscall.send(targetSlot, prop, serArgs, resultVPID);

    // ideally we'd wait until .then is called on p before subscribing, but
    // the current Promise API doesn't give us a way to discover this, so we
    // must subscribe right away. If we were using Vows or some other
    // then-able, we could just hook then() to notify us.
    syscall.subscribe(resultVPID);

    // We return 'p' to the handler, and the eventual resolution of 'p' will
    // be used to resolve the caller's Promise, but the caller never sees 'p'
    // itself. The caller got back their Promise before the handler ever got
    // invoked, and thus before queueMessage was called.. If that caller
    // passes the Promise they received as argument or return value, we want
    // it to serialize as resultVPID. And if someone passes resultVPID to
    // them, we want the user-level code to get back that Promise, not 'p'.

    valToSlot.set(returnedP, resultVPID);
    slotToVal.set(resultVPID, returnedP);

    return p;
  }

  function forbidPromises(serArgs) {
    for (const slot of serArgs.slots) {
      if (parseVatSlot(slot).type === 'promise') {
        throw Error(`D() arguments cannot include a Promise`);
      }
    }
  }

  function DeviceHandler(slot) {
    return {
      get(target, prop) {
        if (prop !== `${prop}`) {
          return undefined;
        }
        return (...args) => {
          const serArgs = m.serialize(harden(args));
          forbidPromises(serArgs);
          const ret = syscall.callNow(slot, prop, serArgs);
          insistCapData(ret);
          const retval = m.unserialize(ret);
          return retval;
        };
      },
    };
  }

  function D(x) {
    // results = D(devicenode).name(args)
    if (outstandingProxies.has(x)) {
      throw new Error('D(D(x)) is invalid');
    }
    const slot = valToSlot.get(x);
    if (!slot || parseVatSlot(slot).type !== 'device') {
      throw new Error('D() must be given a device node');
    }
    const handler = DeviceHandler(slot);
    const pr = harden(new Proxy({}, handler));
    outstandingProxies.add(pr);
    return pr;
  }

  function deliver(target, method, argsdata, result) {
    assert(didRoot);
    insistCapData(argsdata);
    lsdebug(
      `ls[${forVatID}].dispatch.deliver ${target}.${method} -> ${result}`,
    );
    const t = convertSlotToVal(target);
    if (!t) {
      throw Error(`no target ${target}`);
    }
    // TODO: if we acquire new decision-making authority over a promise that
    // we already knew about ('result' is already in slotToVal), we should no
    // longer accept dispatch.notifyFulfill from the kernel. We currently use
    // importedPromisesByPromiseID to track a combination of "we care about
    // when this promise resolves" and "we are listening for the kernel to
    // resolve it". We should split that into two tables or something. And we
    // should error-check cases that the kernel shouldn't do, like getting
    // the same vpid as a result= twice, or getting a result= for an exported
    // promise (for which we were already the decider).

    const args = m.unserialize(argsdata);

    let notifySuccess = () => undefined;
    let notifyFailure = () => undefined;
    if (result) {
      insistVatType('promise', result);
      // eslint-disable-next-line no-use-before-define
      notifySuccess = thenResolve(result);
      // eslint-disable-next-line no-use-before-define
      notifyFailure = thenReject(result);
    }

    // If the method is missing, or is not a Function, or the method throws a
    // synchronous exception, we notify the caller (by rejecting the result
    // promise, if any). If the method returns an eventually-rejected
    // Promise, we notify them when it resolves.

    // If the method returns a synchronous value, we notify the caller right
    // away. If it returns an eventually-fulfilled Promise, we notify the
    // caller when it resolves.

    // Both situations are the business of this vat and the calling vat, not
    // the kernel. deliver() does not report such exceptions to the kernel.

    // We have a presence, so forward to it.
    let res;
    if (args) {
      // It has arguments, must be a method application.
      res = HandledPromise.applyMethod(t, method, args);
    } else {
      // Just a getter.
      // TODO: untested, but in principle sound.
      res = HandledPromise.get(t, method);
    }
    res.then(notifySuccess, notifyFailure);
  }

  function retirePromiseID(promiseID) {
    lsdebug(`Retiring ${forVatID}:${promiseID}`);
    importedPromisesByPromiseID.delete(promiseID);
    const p = slotToVal.get(promiseID);
    valToSlot.delete(p);
    slotToVal.delete(promiseID);
  }

  function retirePromiseIDIfEasy(promiseID, data) {
    for (const slot of data.slots) {
      const { type } = parseVatSlot(slot);
      if (type === 'promise') {
        lsdebug(
          `Unable to retire ${promiseID} because slot ${slot} is a promise`,
        );
        return;
      }
    }
    retirePromiseID(promiseID);
  }

  function thenResolve(promiseID) {
    insistVatType('promise', promiseID);
    return res => {
      harden(res);
      lsdebug(`ls.thenResolve fired`, res);

      // We need to know if this is resolving to an imported/exported
      // presence, because then the kernel can deliver queued messages. We
      // could build a simpler way of doing this.
      const ser = m.serialize(res);
      lsdebug(` ser ${ser.body} ${JSON.stringify(ser.slots)}`);
      // find out what resolution category we're using
      const unser = JSON.parse(ser.body);
      if (
        Object(unser) === unser &&
        QCLASS in unser &&
        unser[QCLASS] === 'slot'
      ) {
        const slot = ser.slots[unser.index];
        insistVatType('object', slot);
        syscall.fulfillToPresence(promiseID, slot);
      } else {
        // if it resolves to data, .thens fire but kernel-queued messages are
        // rejected, because you can't send messages to data
        syscall.fulfillToData(promiseID, ser);
      }

      // If we were *also* waiting on this promise (perhaps we received it as
      // an argument, and also as a result=), then we are responsible for
      // notifying ourselves. The kernel assumes we're a grownup and don't
      // need to be reminded of something we did ourselves.
      const pRec = importedPromisesByPromiseID.get(promiseID);
      if (pRec) {
        pRec.resolve(res);
      }
      retirePromiseIDIfEasy(promiseID, ser);
    };
  }

  function thenReject(promiseID) {
    return rej => {
      harden(rej);
      lsdebug(`ls thenReject fired`, rej);
      const ser = m.serialize(rej);
      syscall.reject(promiseID, ser);
      const pRec = importedPromisesByPromiseID.get(promiseID);
      if (pRec) {
        pRec.reject(rej);
      }
      retirePromiseIDIfEasy(promiseID, ser);
    };
  }

  function notifyFulfillToData(promiseID, data) {
    assert(didRoot);
    insistCapData(data);
    lsdebug(
      `ls.dispatch.notifyFulfillToData(${promiseID}, ${data.body}, ${data.slots})`,
    );
    insistVatType('promise', promiseID);
    // TODO: insist that we do not have decider authority for promiseID
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const pRec = importedPromisesByPromiseID.get(promiseID);
    const val = m.unserialize(data);
    pRec.resolve(val);
    retirePromiseIDIfEasy(promiseID, data);
  }

  function notifyFulfillToPresence(promiseID, slot) {
    assert(didRoot);
    lsdebug(`ls.dispatch.notifyFulfillToPresence(${promiseID}, ${slot})`);
    insistVatType('promise', promiseID);
    // TODO: insist that we do not have decider authority for promiseID
    insistVatType('object', slot);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const pRec = importedPromisesByPromiseID.get(promiseID);
    const val = convertSlotToVal(slot);
    // val is either a local pass-by-presence object, or a Presence (which
    // points at some remote pass-by-presence object).
    pRec.resolve(val);
    retirePromiseID(promiseID);
  }

  // TODO: when we add notifyForward, guard against cycles

  function notifyReject(promiseID, data) {
    assert(didRoot);
    insistCapData(data);
    lsdebug(
      `ls.dispatch.notifyReject(${promiseID}, ${data.body}, ${data.slots})`,
    );
    insistVatType('promise', promiseID);
    // TODO: insist that we do not have decider authority for promiseID
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const pRec = importedPromisesByPromiseID.get(promiseID);
    const val = m.unserialize(data);
    pRec.reject(val);
    retirePromiseIDIfEasy(promiseID, data);
  }

  function exitVat(completion) {
    syscall.exit(false, m.serialize(harden(completion)));
  }

  function exitVatWithFailure(reason) {
    syscall.exit(true, m.serialize(harden(reason)));
  }

  // vats which use D are in: acorn-eventual-send, cosmic-swingset
  // (bootstrap, bridge, vat-http), swingset

  const vatGlobals = harden({
    makeWeakStore,
    makeKind,
    flushCache,
  });

  function setBuildRootObject(buildRootObject) {
    assert(!didRoot);
    didRoot = true;

    // here we finally invoke the vat code, and get back the root object
    const rootObject = buildRootObject(
      harden({ D, exitVat, exitVatWithFailure, ...vatPowers }),
      harden(vatParameters),
    );
    mustPassByPresence(rootObject);

    const rootSlot = makeVatSlot('object', true, 0);
    valToSlot.set(rootObject, rootSlot);
    slotToVal.set(rootSlot, rootObject);
  }

  const dispatch = harden({
    deliver,
    notifyFulfillToData,
    notifyFulfillToPresence,
    notifyReject,
  });
  return harden({ vatGlobals, setBuildRootObject, dispatch, m });
}

/**
 * Instantiate the liveslots layer for a new vat and then populate the vat with
 * a new root object and its initial associated object graph, if any.
 *
 * @param {*} syscall  Kernel syscall interface that the vat will have access to
 * @param {*} forVatID  Vat ID label, for use in debug diagostics
 * @param {*} vatPowers
 * @param {*} vatParameters
 * @returns {*} { vatGlobals, dispatch, setBuildRootObject }
 *
 * setBuildRootObject should be called, once, with a function that will
 * create a root object for the new vat The caller provided buildRootObject
 * function produces and returns the new vat's root object:
 *
 *     buildRootObject(vatPowers, vatParameters)
 *
 * Within the vat, `import { E } from '@agoric/eventual-send'` will
 * provide the E wrapper. For any object x, E(x) returns a proxy object
 * that converts any method invocation into a corresponding eventual send
 * to x. That is, E(x).foo(arg1, arg2) is equivalent to x~.foo(arg1,
 * arg2)
 *
 * If x is the presence in this vat of a remote object (that is, an object
 * outside the vat), this will result in a message send out of the vat via
 * the kernel syscall interface.
 *
 * In the same vein, if x is the presence in this vat of a kernel device,
 * vatPowers.D(x) returns a proxy such that a method invocation on it is
 * translated into the corresponding immediate invocation of the device
 * (using, once again, the kernel syscall interface). D(x).foo(args) will
 * perform an immediate syscall.callNow on the device node.
 */
export function makeLiveSlots(
  syscall,
  forVatID = 'unknown',
  vatPowers = harden({}),
  vatParameters = harden({}),
) {
  const allVatPowers = { ...vatPowers, getInterfaceOf, Remotable, makeMarshal };
  const r = build(syscall, forVatID, allVatPowers, vatParameters);
  const { vatGlobals, dispatch, setBuildRootObject } = r; // omit 'm'
  return harden({ vatGlobals, dispatch, setBuildRootObject });
}

// for tests
export function makeMarshaller(syscall) {
  const { m } = build(syscall);
  return { m };
}
