import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { E, HandledPromise } from '@agoric/eventual-send';
import { QCLASS, mustPassByPresence, makeMarshal } from '@agoric/marshal';
import { insist } from '../insist';
import { insistVatType, makeVatSlot, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';

// 'makeLiveSlots' is a dispatcher which uses javascript Maps to keep track
// of local objects which have been exported. These cannot be persisted
// beyond the runtime of the javascript environment, so this mechanism is not
// going to work for our in-chain hosts.

function build(syscall, _state, makeRoot, forVatID) {
  const enableLSDebug = false;
  function lsdebug(...args) {
    if (enableLSDebug) {
      console.log(...args);
    }
  }

  // Make a handled Promise that enqueues kernel messages.
  function makeQueued(slot) {
    /* eslint-disable no-use-before-define */
    const handler = {
      applyMethod(_o, prop, args) {
        // Support: o~.[prop](...args) remote method invocation
        return queueMessage(slot, prop, args);
      },
    };
    /* eslint-enable no-use-before-define */

    const pr = {};
    pr.p = new HandledPromise((res, rej, resolveWithPresence) => {
      pr.rej = rej;
      pr.resPres = () => resolveWithPresence(handler);
      pr.res = res;
    }, handler);
    // We harden this Promise because it feeds importPromise(), which is
    // where remote promises inside inbound arguments and resolutions are
    // created. Both places are additionally hardened by m.unserialize, but
    // it seems reasonable to do it here too, just in case.
    return harden(pr);
  }

  function makeDeviceNode(id) {
    return harden({
      [`_deviceID_${id}`]() {},
    });
  }

  const outstandingProxies = new WeakSet();

  const valToSlot = new WeakMap();
  const slotToVal = new Map();
  const importedPromisesByPromiseID = new Map();
  let nextExportID = 1;
  let nextPromiseID = 5;

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
    lsdebug(`ls exporting promise ${pid}`);
    // eslint-disable-next-line no-use-before-define
    p.then(thenResolve(pid), thenReject(pid));
    return pid;
  }

  function exportPassByPresence() {
    const exportID = allocateExportID();
    return makeVatSlot('object', true, exportID);
  }

  function serializeToSlot(val, slots, slotMap) {
    // lsdebug(`serializeToSlot`, val, Object.isFrozen(val));
    // This is either a Presence (in presenceToImportID), a
    // previously-serialized local pass-by-presence object or
    // previously-serialized local Promise (in valToSlot), a new local
    // pass-by-presence object, or a new local Promise.

    // If we've already assigned it an importID or exportID, it might be in
    // slots/slotMap for this particular act of serialization. If it's new,
    // it certainly will not be in slotMap. If we've already serialized it in
    // this particular act, it will definitely be in slotMap.

    if (!slotMap.has(val)) {
      let slot;

      if (!valToSlot.has(val)) {
        // must be a new export
        // lsdebug('must be a new export', JSON.stringify(val));
        if (HandledPromise.resolve(val) === val) {
          slot = exportPromise(val);
        } else {
          mustPassByPresence(val);
          slot = exportPassByPresence();
        }
        parseVatSlot(slot); // assertion
        valToSlot.set(val, slot);
        slotToVal.set(slot, val);
      }
      slot = valToSlot.get(val);

      const slotIndex = slots.length;
      slots.push(slot);
      slotMap.set(val, slotIndex);
    }

    const slotIndex = slotMap.get(val);
    return harden({ [QCLASS]: 'slot', index: slotIndex });
  }

  function importedPromiseThen(vpid) {
    insistVatType('promise', vpid);
    syscall.subscribe(vpid);
  }

  function importPromise(vpid) {
    insistVatType('promise', vpid);
    const pr = makeQueued(vpid);

    importedPromisesByPromiseID.set(vpid, pr);
    const { p } = pr;
    // ideally we'd wait until .then is called on p before subscribing, but
    // the current Promise API doesn't give us a way to discover this, so we
    // must subscribe right away. If we were using Vows or some other
    // then-able, we could just hook then() to notify us.
    lsdebug(`ls[${forVatID}].importPromise.importedPromiseThen ${vpid}`);
    importedPromiseThen(vpid);
    return p;
  }

  function unserializeSlot(data, slots) {
    // lsdebug(`unserializeSlot ${data} ${slots}`);
    const slot = slots[Nat(data.index)];
    let val;
    if (!slotToVal.has(slot)) {
      const { type, allocatedByVat } = parseVatSlot(slot);
      insist(!allocatedByVat, `I don't remember allocating ${slot}`);
      if (type === 'object') {
        // this is a new import value
        // lsdebug(`assigning new import ${slot}`);
        // prepare a Promise for this Presence, so E(val) can work
        const pr = makeQueued(slot);
        const presence = pr.resPres();
        presence.toString = () => `[Presence ${slot}]`;
        harden(presence);
        val = presence;
        // lsdebug(` for presence`, val);
      } else if (type === 'promise') {
        val = importPromise(slot);
      } else if (type === 'device') {
        val = makeDeviceNode(slot);
      } else {
        // todo (temporary): resolver?
        throw Error(`unrecognized slot type '${type}'`);
      }
      slotToVal.set(slot, val);
      valToSlot.set(val, slot);
    }
    return slotToVal.get(slot);
  }

  const m = makeMarshal(serializeToSlot, unserializeSlot);

  function queueMessage(targetSlot, prop, args) {
    const serArgs = m.serialize(harden(args));
    const result = allocatePromiseID();
    const done = makeQueued(result);
    lsdebug(`ls.qm send(${JSON.stringify(targetSlot)}, ${prop}) -> ${result}`);
    syscall.send(targetSlot, prop, serArgs, result);

    // prepare for notifyFulfillToData/etc
    importedPromisesByPromiseID.set(result, done);

    // ideally we'd wait until someone .thens done.p, but with native
    // Promises we have no way of spotting that, so subscribe immediately
    lsdebug(`ls[${forVatID}].queueMessage.importedPromiseThen ${result}`);
    importedPromiseThen(result);

    // prepare the serializer to recognize it, if it's used as an argument or
    // return value
    valToSlot.set(done.p, result);
    slotToVal.set(result, done.p);

    return done.p;
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
      // eslint-disable-next-line no-use-before-define
      p.then(thenResolve(result), thenReject(result));
    }
    return p;
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
        const { type } = parseVatSlot(slot);
        if (type === 'object') {
          syscall.fulfillToPresence(promiseID, slot);
        } else {
          throw new Error(`thenResolve to non-object slot ${slot}`);
        }
      } else {
        // if it resolves to data, .thens fire but kernel-queued messages are
        // rejected, because you can't send messages to data
        syscall.fulfillToData(promiseID, ser);
      }
    };
  }

  function thenReject(promiseID) {
    return rej => {
      harden(rej);
      lsdebug(`ls thenReject fired`, rej);
      const ser = m.serialize(rej);
      syscall.reject(promiseID, ser);
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
    importedPromisesByPromiseID.get(promiseID).res(val);
  }

  function notifyFulfillToPresence(promiseID, slot) {
    lsdebug(`ls.dispatch.notifyFulfillToPresence(${promiseID}, ${slot})`);
    insistVatType('promise', promiseID);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const val = unserializeSlot({ index: 0 }, [slot]);
    importedPromisesByPromiseID.get(promiseID).res(val);
  }

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
    importedPromisesByPromiseID.get(promiseID).rej(val);
  }

  // here we finally invoke the vat code, and get back the root object
  const rootObject = makeRoot(E, D);
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
