import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { QCLASS, mustPassByPresence, makeMarshal } from '@agoric/marshal';
import { insist } from '../insist';
import { insistVatType, makeVatSlot, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';

// 'makeDeviceSlots' is a subset of makeLiveSlots, for device code

function build(syscall, state, makeRoot, forDeviceName) {
  insist(state.get && state.set, 'deviceSlots.build got bad "state" argument');
  insist(
    typeof makeRoot === 'function',
    'deviceSlots.build got bad "makeRoot"',
  );
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
  const valToSlot = new WeakMap();
  const slotToVal = new Map();
  let nextExportID = 1;

  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
  }

  function exportPassByPresence() {
    const exportID = allocateExportID();
    return makeVatSlot('device', true, exportID);
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
        val = makePresence(slot);
        // lsdebug(` for presence`, val);
      } else if (type === 'device') {
        throw Error(`devices should not be given other devices '${slot}'`);
      } else {
        throw Error(`unrecognized slot type '${type}'`);
      }
      slotToVal.set(slot, val);
      valToSlot.set(val, slot);
    }
    return slotToVal.get(slot);
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
          const capdata = m.serialize(harden(args));
          syscall.sendOnly(importSlot, prop, capdata);
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
    if (!slot || parseVatSlot(slot).type !== 'object') {
      throw new Error(`SO(x) must be called on a Presence, not ${x}`);
    }
    const handler = PresenceHandler(slot);
    const p = harden(new Proxy({}, handler));
    outstandingProxies.add(p);
    return p;
  }

  function getDeviceState() {
    const stateData = state.get();
    if (!stateData) {
      return undefined;
    }
    insistCapData(stateData);
    return m.unserialize(stateData);
  }

  function setDeviceState(deviceState) {
    const ser = m.serialize(deviceState);
    insistCapData(ser);
    state.set(ser);
  }

  // here we finally invoke the device code, and get back the root devnode
  const rootObject = makeRoot(harden({ SO, getDeviceState, setDeviceState }));
  mustPassByPresence(rootObject);

  const rootSlot = makeVatSlot('device', true, 0);
  valToSlot.set(rootObject, rootSlot);
  slotToVal.set(rootSlot, rootObject);

  function invoke(deviceID, method, args) {
    insistVatType('device', deviceID);
    insistCapData(args);
    lsdebug(
      `ls[${forDeviceName}].dispatch.invoke ${deviceID}.${method}`,
      args.slots,
    );
    const t = slotToVal.get(deviceID);
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
    const res = t[method](...m.unserialize(args));
    const resultdata = m.serialize(res);
    lsdebug(` results ${resultdata.body} ${JSON.stringify(resultdata.slots)}`);
    return resultdata;
  }

  return {
    m,
    invoke,
  };
}

export function makeDeviceSlots(
  syscall,
  state,
  makeRoot,
  forDeviceName = 'unknown',
) {
  const { invoke } = build(syscall, state, makeRoot, forDeviceName);
  return harden({
    invoke,
  });
}

// for tests
export function makeMarshaller(syscall) {
  return { m: build(syscall, () => harden({})).m };
}
