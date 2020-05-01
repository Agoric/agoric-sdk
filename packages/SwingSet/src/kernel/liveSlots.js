import harden from '@agoric/harden';
import { E, HandledPromise } from '@agoric/eventual-send';
import {
  QCLASS,
  Remotable,
  getInterfaceOf,
  mustPassByPresence,
  makeMarshal,
} from '@agoric/marshal';
import { assert, details } from '@agoric/assert';
import { isPromise } from '@agoric/produce-promise';
import { insistVatType, makeVatSlot, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';

// 'makeLiveSlots' is a dispatcher which uses javascript Maps to keep track
// of local objects which have been exported. These cannot be persisted
// beyond the runtime of the javascript environment, so this mechanism is not
// going to work for our in-chain hosts.

/**
 * Instantiate the liveslots layer for a new vat and then populate the vat with
 * a new root object and its initial associated object graph, if any.
 *
 * @param syscall  Kernel syscall interface that the vat will have access to
 * @param state  Object to store and retrieve state; not used // TODO fix wart
 * @param makeRoot  Function that will create a root object for the new vat
 * @param forVatID  Vat ID label, for use in debug diagostics
 *
 * @return an extended dispatcher object for the new vat
 */
function build(syscall, _state, makeRoot, forVatID) {
  const enableLSDebug = false;
  function lsdebug(...args) {
    if (enableLSDebug) {
      console.log(...args);
    }
  }

  const outstandingProxies = new WeakSet();

  /** Map in-vat object references -> vat slot strings.

      Uses a weak map so that vat objects can (in princple) be GC'd.  Note that
      they currently can't actually be GC'd because the slotToVal table keeps
      them alive, but that will have to be addressed by a different
      mechanism. */
  const valToSlot = new WeakMap();

  /** Map vat slot strings -> in-vat object references. */
  const slotToVal = new Map();

  const importedPromisesByPromiseID = new Map();
  let nextExportID = 1;
  let nextPromiseID = 5;

  function makeImportedPresence(slot) {
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
      presence = Remotable(`Presence ${slot}`, undefined, remote);
      // remote === presence, actually
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
    // into a syscall. The target of that syscall will be 'vpid' until the
    // Promise is resolved, at which point the target becomes something else.
    let currentSlotID = vpid;
    const unfulfilledHandler = {
      applyMethod(_o, prop, args, returnedP) {
        // Support: o~.[prop](...args) remote method invocation
        lsdebug(
          `makeQueued handler.applyMethod (orig ${vpid} now ${currentSlotID})`,
        );
        // console.log(`mIP uFhandler[${prop}] vpid=${vpid} currentSlotID=${currentSlotID}`);
        if (currentSlotID === undefined) {
          console.error(`mIP handler called after fulfillToLocalObject`);
          throw Error(`mIP handler called after fulfillToLocalObject`);
        }
        // eslint-disable-next-line no-use-before-define
        return queueMessage(currentSlotID, prop, args, returnedP);
      },
    };

    let resolve;
    let reject;
    const p = new HandledPromise((res, rej, _resPres) => {
      resolve = res;
      reject = rej;
    }, unfulfilledHandler);

    // prepare for the kernel to tell us about resolution

    function fulfillToLocalObject(newObject) {
      // the old handler should never be called again
      currentSlotID = undefined;
      resolve(newObject);
    }

    function fulfillToRemoteObject(newSlot, newPresence) {
      insistVatType('object', newSlot);
      // Resolve the original Promise. Local users will get a .then callback.
      // In addition, the handler attached to newPresence (which got there
      // because newPresence came out of a resolveWithPresence call on a new
      // HandledPromise) will replace our old handler, starting with the next
      // turn. After that turn, p~.foo() will be send to 'newSlot' by virtue
      // of the handler on newPresence. At this point, the original Promise
      // should become behaviorally indistinguishable from the one associated
      // with newPresence: they still have distinct identities, but all
      // method invocations will act as if they are the same.
      resolve(newPresence);

      // Now, to ensure any p~.foo() calls during the remainder of the
      // *current* turn also go to 'newSlot', we modify our old handler, by
      // changing its target.
      currentSlotID = newSlot;
    }

    function fulfillToData(data) {
      resolve(data);
    }

    const pRec = harden({
      fulfillToLocalObject,
      fulfillToRemoteObject,
      fulfillToData,
      reject,
    });
    importedPromisesByPromiseID.set(vpid, pRec);

    return harden(p);
  }

  function makeDeviceNode(id) {
    return Remotable(`Device ${id}`);
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

  function convertSlotToVal(slot) {
    if (!slotToVal.has(slot)) {
      let val;
      const { type, allocatedByVat } = parseVatSlot(slot);
      assert(!allocatedByVat, details`I don't remember allocating ${slot}`);
      if (type === 'object') {
        // this is a new import value
        val = makeImportedPresence(slot);
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
        val = makeDeviceNode(slot);
      } else {
        throw Error(`unrecognized slot type '${type}'`);
      }
      slotToVal.set(slot, val);
      valToSlot.set(val, slot);
    }
    return slotToVal.get(slot);
  }

  const m = makeMarshal(convertValToSlot, convertSlotToVal);

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

  function DeviceHandler(slot) {
    return {
      get(target, prop) {
        if (prop !== `${prop}`) {
          return undefined;
        }
        return (...args) => {
          const serArgs = m.serialize(harden(args));
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
    insistCapData(argsdata);
    lsdebug(
      `ls[${forVatID}].dispatch.deliver ${target}.${method} -> ${result}`,
    );
    const t = slotToVal.get(target);
    if (!t) {
      throw Error(`no target ${target}`);
    }
    const args = m.unserialize(argsdata);
    const p = Promise.resolve().then(_ => {
      // The idiom here results in scheduling the method invocation on the next
      // turn, but more importantly arranges for errors to become promise
      // rejections rather than errors in the kernel itself
      if (!(method in t)) {
        throw new TypeError(
          `target[${method}] does not exist, has ${Object.getOwnPropertyNames(
            t,
          )}`,
        );
      }
      if (!(t[method] instanceof Function)) {
        throw new TypeError(
          `target[${method}] is not a function, typeof is ${typeof t[
            method
          ]}, has ${Object.getOwnPropertyNames(t)}`,
        );
      }
      return t[method](...args);
    });
    if (result) {
      lsdebug(` ls.deliver attaching then ->${result}`);
      insistVatType('promise', result);

      // We return the results of the resolve/reject, rather
      // than rejecting the dispatch with whatever the method
      // did.
      // It is up to the caller to handle or fail to handle the
      // rejection.  Failing to handle should trigger a platform
      // log, rather than via our parent doProcess call.

      // eslint-disable-next-line no-use-before-define
      return p.then(thenResolve(result), thenReject(result));
    }
    return p;
  }

  function thenResolve(promiseID) {
    insistVatType('promise', promiseID);
    return res => {
      harden(res);
      lsdebug(`ls.thenResolve fired`, res);

      // If we were *also* waiting on this promise (perhaps we received it as
      // an argument, and also as a result=), then we are responsible for
      // notifying ourselves. The kernel assumes we're a grownup and don't
      // need to be reminded of something we did ourselves.
      const pRec = importedPromisesByPromiseID.get(promiseID);

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
        const { type } = parseVatSlot(slot);
        if (type === 'object') {
          syscall.fulfillToPresence(promiseID, slot);
          if (pRec) {
            // eslint-disable-next-line no-use-before-define
            notifyFulfillToPresence(promiseID, slot);
          }
        } else {
          throw new Error(`thenResolve to non-object slot ${slot}`);
        }
      } else {
        // if it resolves to data, .thens fire but kernel-queued messages are
        // rejected, because you can't send messages to data
        syscall.fulfillToData(promiseID, ser);
        if (pRec) {
          pRec.fulfillToData(res);
        }
      }
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
    };
  }

  function notifyFulfillToData(promiseID, data) {
    insistCapData(data);
    lsdebug(
      `ls.dispatch.notifyFulfillToData(${promiseID}, ${data.body}, ${data.slots})`,
    );
    insistVatType('promise', promiseID);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const val = m.unserialize(data);
    importedPromisesByPromiseID.get(promiseID).fulfillToData(val);
  }

  function notifyFulfillToPresence(promiseID, slot) {
    lsdebug(`ls.dispatch.notifyFulfillToPresence(${promiseID}, ${slot})`);
    insistVatType('promise', promiseID);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    // todo insist (slot).type === 'object'
    const val = convertSlotToVal(slot);
    // val is either a local pass-by-presence object, or a Presence (which
    // points at some remote pass-by-presence object).

    if (parseVatSlot(slot).allocatedByVat) {
      // 'val' is a local pass-by-presence object
      importedPromisesByPromiseID.get(promiseID).fulfillToLocalObject(val);
    } else {
      // 'val' is a Presence, pointing at some remote pass-by-presence
      // object. It was created by makeImportedPresence(), so it is connected
      // to a new HandledPromise which knows how to send messages using
      // 'slot'. When we call 'fulfillToRemoteObject', the pre-existing
      // Promise's handler will be modified to send messages to 'slot' too.
      importedPromisesByPromiseID
        .get(promiseID)
        .fulfillToRemoteObject(slot, val);
    }
  }

  // TODO: when we add notifyForward, guard against cycles

  function notifyReject(promiseID, data) {
    insistCapData(data);
    lsdebug(
      `ls.dispatch.notifyReject(${promiseID}, ${data.body}, ${data.slots})`,
    );
    insistVatType('promise', promiseID);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const val = m.unserialize(data);
    importedPromisesByPromiseID.get(promiseID).reject(val);
  }

  // here we finally invoke the vat code, and get back the root object
  // We need to pass in Remotable and getInterfaceOf so that they can
  // access our own @agoric/marshal, not a separate instance in a bundle.
  const vatPowers = { Remotable, getInterfaceOf };
  const rootObject = makeRoot(E, D, vatPowers);
  mustPassByPresence(rootObject);

  const rootSlot = makeVatSlot('object', true, 0);
  valToSlot.set(rootObject, rootSlot);
  slotToVal.set(rootSlot, rootObject);

  return {
    m,
    deliver,
    // subscribe,
    notifyFulfillToData,
    notifyFulfillToPresence,
    notifyReject,
  };
}

/**
 * Instantiate the liveslots layer for a new vat and then populate the vat with
 * a new root object and its initial associated object graph, if any.
 *
 * @param syscall  Kernel syscall interface that the vat will have access to
 * @param state  Object to store and retrieve state
 * @param makeRoot  Function that will create a root object for the new vat
 * @param forVatID  Vat ID label, for use in debug diagostics
 *
 * @return a dispatcher object for the new vat
 *
 * The caller provided makeRoot function produces and returns the new vat's
 * root object:
 *
 *     makeRoot(E, // eventual send facility for the vat
 *              D) // device invocation facility for the vat
 *
 *     Within the vat, for any object x, E(x) returns a proxy object that
 *     converts any method invocation into a corresponding eventual send to x.
 *     That is, E(x).foo(arg1, arg2) is equivalent to x~.foo(arg1, arg2)
 *
 *     If x is the presence in this vat of a remote object (that is, an object
 *     outside the vat), this will result in a message send out of the vat via
 *     the kernel syscall interface.
 *
 *     In the same vein, if x is the presence in this vat of a kernel device,
 *     D(x) returns a proxy such that a method invocation on it is translated
 *     into the corresponding immediate invocation of the device (using, once
 *     again, the kernel syscall interface).
 */
export function makeLiveSlots(syscall, state, makeRoot, forVatID = 'unknown') {
  const {
    deliver,
    notifyFulfillToData,
    notifyFulfillToPresence,
    notifyReject,
  } = build(syscall, state, makeRoot, forVatID);
  return harden({
    deliver,
    notifyFulfillToData,
    notifyFulfillToPresence,
    notifyReject,
  });
}

// for tests
export function makeMarshaller(syscall) {
  return { m: build(syscall, null, _E => harden({})).m };
}
