import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { QCLASS, mustPassByPresence, makeMarshal } from '@agoric/marshal';

// 'makeDeviceSlots' is a subset of makeLiveSlots, for device code

function build(syscall, makeRoot, forDeviceName) {
  const enableLSDebug = false;
  function lsdebug(...args) {
    if (enableLSDebug) {
      console.log(...args);
    }
  }

  function makePresence(id) {
    return harden({
      [`_importID_${id}`]() {},
    });
  }

  const outstandingProxies = new WeakSet();

  function slotToKey(slot) {
    if (
      slot.type === 'deviceExport' ||
      slot.type === 'import' ||
      slot.type === 'deviceImport'
    ) {
      return `${slot.type}-${Nat(slot.id)}`;
    }
    throw new Error(`unknown slot.type '${slot.type}'`);
  }
  const valToSlot = new WeakMap();
  const slotKeyToVal = new Map();
  let nextExportID = 1;

  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
  }

  function exportPassByPresence() {
    const exportID = allocateExportID();
    return harden({ type: 'deviceExport', id: exportID });
  }

  function serializeSlot(val, slots, slotMap) {
    // lsdebug(`serializeSlot`, val, Object.isFrozen(val));
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
        mustPassByPresence(val);
        slot = exportPassByPresence();

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

  function unserializeSlot(data, slots) {
    // lsdebug(`unserializeSlot ${data} ${slots}`);
    const slot = slots[Nat(data.index)];
    const key = slotToKey(slot);
    let val;
    if (!slotKeyToVal.has(key)) {
      if (slot.type === 'import') {
        // this is a new import value
        // lsdebug(`assigning new import ${slot.id}`);
        val = makePresence(slot.id);
        // lsdebug(` for presence`, val);
      } else if (slot.type === 'deviceExport') {
        // huh, the kernel should never reference an export we didn't
        // previously send
        throw Error(`unrecognized deviceExport '${slot.id}'`);
      } else if (slot.type === 'deviceImport') {
        // same
        throw Error(`unrecognized deviceImport '${slot.id}'`);
      } else {
        throw Error(`unrecognized slot.type '${slot.type}'`);
      }
      slotKeyToVal.set(key, val);
      valToSlot.set(val, slot);
    }
    return slotKeyToVal.get(key);
  }

  // this handles both exports ("targets" which other vats can call)
  function getTarget(deviceID) {
    const key = slotToKey({ type: 'deviceExport', id: deviceID });
    if (!slotKeyToVal.has(key)) {
      throw Error(`no target for facetID ${deviceID}`);
    }
    return slotKeyToVal.get(key);
  }

  const m = makeMarshal(serializeSlot, unserializeSlot);

  function PresenceHandler(importSlot) {
    return {
      get(target, prop) {
        lsdebug(`PreH proxy.get(${prop})`);
        if (prop !== `${prop}`) {
          return undefined;
        }
        const p = (...args) => {
          const ser = m.serialize(harden({ args }));
          syscall.sendOnly(importSlot, prop, ser.argsString, ser.slots);
        };
        return p;
      },
      has(_target, _prop) {
        return true;
      },
    };
  }

  function SO(x) {
    // SO(x).name(args)
    //
    // SO returns a proxy, like the E() in liveSlots. However SO's proxy does
    // a sendOnly() rather than a send(), so it doesn't return a Promise. And
    // since devices don't accept Promises either, SO(x) must be given a
    // presence, not a promise that might resolve to a presence.

    if (outstandingProxies.has(x)) {
      throw new Error('SO(SO(x)) is invalid');
    }
    const slot = valToSlot.get(x);
    if (!slot || slot.type !== 'import') {
      throw new Error(`SO(x) must be called on a Presence, not ${x}`);
    }
    const handler = PresenceHandler(slot);
    const p = harden(new Proxy({}, handler));
    outstandingProxies.add(p);
    return p;
  }

  function invoke(deviceID, method, data, slots) {
    lsdebug(`ls[${forDeviceName}].dispatch.invoke ${deviceID}.${method}`);
    const t = getTarget(deviceID);
    const args = m.unserialize(data, slots);
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
    const res = t[method](...args.args);
    const ser = m.serialize(res);
    lsdebug(` ser ${ser.argsString} ${JSON.stringify(ser.slots)}`);
    return harden({ data: ser.argsString, slots: ser.slots });
  }

  const rootObject = makeRoot(SO);
  mustPassByPresence(rootObject);
  const rootSlot = { type: 'deviceExport', id: 0 };
  valToSlot.set(rootObject, rootSlot);
  slotKeyToVal.set(slotToKey(rootSlot), rootObject);

  return {
    m,
    invoke,
  };
}

export function makeDeviceSlots(
  syscall,
  makeRoot,
  getState,
  setState,
  forDeviceName = 'unknown',
) {
  if (typeof getState !== 'function') {
    throw new Error(`getState must be a function, not '${getState}'`);
  }
  if (typeof setState !== 'function') {
    throw new Error(`setState must be a function, not '${setState}'`);
  }
  const { invoke } = build(syscall, makeRoot, forDeviceName);
  return harden({
    invoke,
    getState,
    setState,
  });
}

// for tests
export function makeMarshaller(syscall) {
  return { m: build(syscall, () => harden({})).m };
}
