import { Remotable, mustPassByPresence, makeMarshal } from '@agoric/marshal';
import { assert, details } from '@agoric/assert';
import { insistVatType, makeVatSlot, parseVatSlot } from '../parseVatSlots';
import { insistCapData } from '../capdata';

// 'makeDeviceSlots' is a subset of makeLiveSlots, for device code

export function makeDeviceSlots(
  syscall,
  state,
  buildRootDeviceNode,
  forDeviceName,
  endowments,
  testLog,
  deviceParameters,
) {
  assert(state.get && state.set, 'deviceSlots.build got bad "state" argument');
  assert(
    typeof buildRootDeviceNode === 'function',
    'deviceSlots.build got bad "buildRootDeviceNode"',
  );
  const enableLSDebug = false;
  function lsdebug(...args) {
    if (enableLSDebug) {
      console.log(...args);
    }
  }

  function makePresence(id, iface = undefined) {
    const result = {
      [`_importID_${id}`]() {},
    };
    if (iface === undefined) {
      return harden(result);
    }
    return Remotable(iface, undefined, result);
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

  function convertValToSlot(val) {
    // lsdebug(`convertValToSlot`, val, Object.isFrozen(val));
    // This is either a Presence (in presenceToImportID), a
    // previously-serialized local pass-by-presence object or
    // previously-serialized local Promise (in valToSlot), a new local
    // pass-by-presence object, or a new local Promise.

    // If we've already assigned it an importID or exportID, it might be in
    // slots/slotMap for this particular act of serialization. If it's new,
    // it certainly will not be in slotMap. If we've already serialized it in
    // this particular act, it will definitely be in slotMap.

    if (!valToSlot.has(val)) {
      // must be a new export
      // lsdebug('must be a new export', JSON.stringify(val));
      mustPassByPresence(val);
      const slot = exportPassByPresence();
      parseVatSlot(slot); // assertion
      valToSlot.set(val, slot);
      slotToVal.set(slot, val);
    }
    return valToSlot.get(val);
  }

  function convertSlotToVal(slot, iface = undefined) {
    if (!slotToVal.has(slot)) {
      let val;
      const { type, allocatedByVat } = parseVatSlot(slot);
      assert(!allocatedByVat, details`I don't remember allocating ${slot}`);
      if (type === 'object') {
        // this is a new import value
        // lsdebug(`assigning new import ${slot}`);
        val = makePresence(slot, iface);
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

  const m = makeMarshal(convertValToSlot, convertSlotToVal);

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

  // Here we finally invoke the device code, and get back the root devnode.
  // Note that we do *not* harden() the argument, since the provider might
  // not have wanted the endowments hardened.
  const rootObject = buildRootDeviceNode({
    SO,
    getDeviceState,
    setDeviceState,
    testLog,
    endowments,
    deviceParameters,
  });
  mustPassByPresence(rootObject);

  const rootSlot = makeVatSlot('device', true, 0);
  valToSlot.set(rootObject, rootSlot);
  slotToVal.set(rootSlot, rootObject);

  // Exceptions in device invocations are fatal to the kernel. This returns a
  // VatInvocationResult object: ['ok', capdata].

  // this function throws an exception if anything goes wrong, or if the
  // device node itself throws an exception during invocation
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
    const vres = harden(['ok', m.serialize(res)]);
    lsdebug(` results ${vres.body} ${JSON.stringify(vres.slots)}`);
    return vres;
  }

  return harden({ invoke });
}
