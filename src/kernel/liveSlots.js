import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { QCLASS, mustPassByPresence, makeMarshal } from './marshal';
import makePromise from './makePromise';

// 'makeLiveSlots' is a dispatcher which uses javascript Maps to keep track
// of local objects which have been exported. These cannot be persisted
// beyond the runtime of the javascript environment, so this mechanism is not
// going to work for our in-chain hosts.

// The E() wrapper does not yet return a Promise for the result of the method
// call.

export function makeLiveSlots(syscall, forVatID = 'unknown') {
  function makePresence(id) {
    return harden({
      [`_importID_${id}`]() {},
    });
  }

  const resultPromises = new WeakSet();
  const outstandingProxies = new WeakSet();

  function slotToKey(slot) {
    if (
      slot.type === 'export' ||
      slot.type === 'import' ||
      slot.type === 'promise'
    ) {
      return `${slot.type}-${Nat(slot.id)}`;
    }
    throw new Error(`unknown slot.type '${slot.type}'`);
  }
  const valToSlot = new WeakMap();
  const slotKeyToVal = new Map();
  const exportedPromisesByResolverID = new Map();
  const importedPromisesByPromiseID = new Map();
  let nextExportID = 1;

  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
  }

  function exportPromise(p) {
    const pr = syscall.createPromise();
    // we ignore the kernel promise, but we remember the resolver, in case
    // the kernel subscribes to hear about our local promise changing state
    exportedPromisesByResolverID.set(pr.resolverID, p);
    return harden({ type: 'promise', id: pr.promiseID });
  }

  function exportPassByPresence() {
    const exportID = allocateExportID();
    return harden({ type: 'export', id: exportID });
  }

  function serializeSlot(val, slots, slotMap) {
    // console.log(`serializeSlot`, val, Object.isFrozen(val));
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
        // console.log('must be a new export', JSON.stringify(val));
        if (Promise.resolve(val) === val) {
          slot = exportPromise(val);
        } else {
          mustPassByPresence(val);
          slot = exportPassByPresence();
        }
        const key = slotToKey(slot);
        valToSlot.set(val, slot);
        slotKeyToVal.set(key, val);
      }
      slot = valToSlot.get(val);

      const slotIndex = slots.length;
      slots.push(slot);
      slotMap.set(val, slotIndex);
    }

    const slotIndex = slotMap.get(val);
    return harden({ [QCLASS]: 'slot', index: slotIndex });
  }

  function importedPromiseThen(id) {
    syscall.subscribe(id);
  }

  function importPromise(id) {
    const pr = makePromise();
    importedPromisesByPromiseID.set(id, pr);
    const { p } = pr;
    // ideally we'd wait until .then is called on p before subscribing, but
    // the current Promise API doesn't give us a way to discover this, so we
    // must subscribe right away. If we were using Vows or some other
    // then-able, we could just hook then() to notify us.
    importedPromiseThen(id);
    return p;
  }

  function unserializeSlot(data, slots) {
    // console.log(`unserializeSlot ${data} ${slots}`);
    const slot = slots[Nat(data.index)];
    const key = slotToKey(slot);
    let val;
    if (!slotKeyToVal.has(key)) {
      if (slot.type === 'import') {
        // this is a new import value
        // console.log(`assigning new import ${slot.id}`);
        val = makePresence(slot.id);
        // console.log(` for presence`, val);
      } else if (slot.type === 'export') {
        // huh, the kernel should never reference an export we didn't
        // previously send
        throw Error(`unrecognized exportID '${slot.id}'`);
      } else if (slot.type === 'promise') {
        val = importPromise(slot.id);
      } else {
        throw Error(`unrecognized slot.type '${slot.type}'`);
      }
      slotKeyToVal.set(key, val);
      valToSlot.set(val, slot);
    }
    return slotKeyToVal.get(key);
  }

  // this handles both exports ("targets" which other vats can call)
  function getTarget(facetID) {
    const key = slotToKey({ type: 'export', id: facetID });
    if (!slotKeyToVal.has(key)) {
      throw Error(`no target for facetID ${facetID}`);
    }
    return slotKeyToVal.get(key);
  }

  const m = makeMarshal(serializeSlot, unserializeSlot);

  function queueMessage(importID, prop, args) {
    let r;
    const doneP = new Promise((res, _rej) => {
      r = res;
    });

    const resolver = {
      resolve(val) {
        r(val);
      },
    };
    const ser = m.serialize(harden({ args, resolver }));
    syscall.send(
      { type: 'import', id: importID },
      prop,
      ser.argsString,
      ser.slots,
    );
    return doneP;
  }

  function PresenceHandler(importID) {
    return {
      get(target, prop) {
        console.log(`PreH proxy.get(${prop})`);
        if (prop !== `${prop}`) {
          return undefined;
        }
        const p = (...args) => queueMessage(importID, prop, args);
        resultPromises.add(p);
        return p;
      },
      has(_target, _prop) {
        return true;
      },
    };
  }

  function PromiseHandler(targetPromise) {
    return {
      get(target, prop) {
        // console.log(`ProH proxy.get(${prop})`);
        if (prop !== `${prop}`) {
          return undefined;
        }
        return (...args) => {
          let r;
          let rj;
          const doneP = new Promise((res, rej) => {
            r = res;
            rj = rej;
          });
          function resolved(x) {
            // We could delegate the is-this-a-Presence check to E(val), but
            // local objects and Promises are treated the same way, so E
            // would kick it right back to us, causing an infinite loop
            if (outstandingProxies.has(x)) {
              throw Error('E(Vow.resolve(E(x))) is invalid');
            }
            const slot = valToSlot.get(x);
            if (slot && slot.type === 'import') {
              return queueMessage(slot.id, prop, args);
            }
            return x[prop](...args);
          }
          targetPromise.then(resolved).then(r, rj);
          resultPromises.add(doneP);
          return doneP;
        };
      },
      has(_target, _prop) {
        return true;
      },
    };
  }

  function E(x) {
    // p = E(x).name(args)
    //
    // E(x) returns a proxy on which you can call arbitrary methods. Each of
    // these method calls returns a promise. The method will be invoked on
    // whatever 'x' designates (or resolves to) in a future turn, not this
    // one. 'x' might be/resolve-to:
    //
    // * a local object: do x[name](args) in a future turn
    // * a normal Promise: wait for x to resolve, then x[name](args)
    // * a Presence: send message to remote Vat to do x[name](args)
    // * a Promise that we returned earlier: send message to whichever Vat
    //   gets to decide what the Promise resolves to

    if (outstandingProxies.has(x)) {
      throw Error('E(E(x)) is invalid, you probably want E(E(x).foo()).bar()');
    }
    // TODO: if x is a Promise we recognize (because we created it earlier),
    // we can pipeline messages sent to E(x) (since we remember where we got
    // x from).
    // if (resultPromises.has(x)) {
    //   return UnresolvedRemoteHandler(x);
    // }
    let handler;
    const slot = valToSlot.get(x);
    if (slot && slot.type === 'import') {
      console.log(` was importID ${slot.id}`);
      handler = PresenceHandler(slot.id);
    } else {
      console.log(` treating as promise`);
      const targetP = Promise.resolve(x);
      // targetP might resolve to a Presence
      handler = PromiseHandler(targetP);
    }
    const p = harden(new Proxy({}, handler));
    outstandingProxies.add(p);
    return p;
  }

  let rootIsRegistered = false;
  function registerRoot(val) {
    // console.log(`[${forVatID}] registerRoot`, val);
    if (rootIsRegistered) {
      throw Error(`[${forVatID}] registerRoot() was already called`);
    }
    const slot = { type: 'export', id: 0 };
    valToSlot.set(val, slot);
    slotKeyToVal.set(slotToKey(slot), val);
    rootIsRegistered = true;
  }

  function deliver(facetid, method, argsbytes, caps) {
    if (!rootIsRegistered) {
      throw Error(`[${forVatID}] registerRoot() wasn't called during setup`);
    }
    const t = getTarget(facetid);
    const args = m.unserialize(argsbytes, caps);
    // phase1: method cannot return a promise or raise an exception
    const result = t[method](...args.args);
    if (args.resolver) {
      // this would cause an infinite loop, so we use a sendOnly
      // E(args.resolver).resolve(result);
      const ser = m.serialize(harden({ args: [result] }));
      const resolverSlotID = valToSlot.get(args.resolver).id;
      syscall.send(
        { type: 'import', id: resolverSlotID },
        'resolve',
        ser.argsString,
        ser.slots,
      );
    }
  }

  function subscribe(resolverID) {
    console.log(`ls.dispatch.subscribe(${resolverID})`);
    if (!exportedPromisesByResolverID.has(resolverID)) {
      throw new Error(`unknown resolverID '${resolverID}'`);
    }
    const p = exportedPromisesByResolverID.get(resolverID);
    p.then(
      res => {
        console.log(`ls subscribed res`, res);
        // We need to know if this is resolving to an imported/exported
        // presence, because then the kernel can deliver queued messages. We
        // could build a simpler way of doing this.
        const ser = m.serialize(res);
        const unser = JSON.parse(ser.argsString);
        if (
          typeof unser === 'object' &&
          QCLASS in unser &&
          unser[QCLASS].type === 'slot'
        ) {
          const slot = unser.slots[unser[QCLASS].index];
          if (slot.type === 'import' || slot.type === 'export') {
            syscall.fulfillToTarget(resolverID, slot);
          }
        } else {
          // if it resolves to data, .thens fire but kernel-queued messages are
          // rejected, because you can't send messages to data
          syscall.fulfillToData(resolverID, ser.argsString, ser.slots);
        }
      },
      rej => {
        console.log(`ls subscribed rej`, rej);
        const ser = m.serialize(rej);
        syscall.reject(resolverID, ser.argsString, ser.slots);
      },
    );
  }

  function notifyFulfillToData(promiseID, data, slots) {
    console.log(
      `ls.dispatch.notifyFulfillToData(${promiseID}, ${data}, ${slots})`,
    );
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const val = m.unserialize(data, slots);
    importedPromisesByPromiseID.get(promiseID).res(val);
  }

  function notifyFulfillToTarget(promiseID, slot) {
    console.log(`ls.dispatch.notifyFulfillToTarget(${promiseID}, ${slot})`);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const val = unserializeSlot({ index: 0 }, [slot]);
    importedPromisesByPromiseID.get(promiseID).res(val);
  }

  function notifyReject(promiseID, data, slots) {
    console.log(`ls.dispatch.notifyReject(${promiseID}, ${data}, ${slots})`);
    if (!importedPromisesByPromiseID.has(promiseID)) {
      throw new Error(`unknown promiseID '${promiseID}'`);
    }
    const val = m.unserialize(data, slots);
    importedPromisesByPromiseID.get(promiseID).rej(val);
  }

  return harden({
    m,
    E,
    registerRoot,
    dispatch: {
      deliver,
      subscribe,
      notifyFulfillToData,
      notifyFulfillToTarget,
      notifyReject,
    },
  });
}
