import harden from '@agoric/harden';
import Nat from '@agoric/nat';
import { QCLASS, mustPassByPresence, makeMarshal } from './marshal';

// 'makeLiveSlots' is a dispatcher which uses javascript Maps to keep track
// of local objects which have been exported. These cannot be persisted
// beyond the runtime of the javascript environment, so this mechanism is not
// going to work for our in-chain hosts.

// The E() wrapper does not yet return a Promise for the result of the method
// call.

export function makeLiveSlots(forVatID = 'unknown') {
  function makePresence(slotID) {
    return harden({
      [`_slotID_${slotID}`]() {},
    });
  }

  const valToSlotID = new WeakMap();
  const slotIDToVal = new Map();
  let nextExportID = 1;

  function allocateExportID() {
    const exportID = nextExportID;
    nextExportID += 1;
    return exportID;
  }

  function serializeSlot(val, slots, slotMap) {
    mustPassByPresence(val);
    if (!valToSlotID.has(val)) {
      // console.log('must be a new export', JSON.stringify(val));
      // must be a new export
      const exportID = allocateExportID();
      valToSlotID.set(val, exportID);
      slotIDToVal.set(exportID, val);
    }
    const slotID = valToSlotID.get(val);
    // console.log(`serializeSlot slotID=${slotID}`);
    if (!slotMap.has(val)) {
      const slotIndex = slots.length;
      slots.push(slotID);
      slotMap.set(val, slotIndex);
    }
    const slotIndex = slotMap.get(val);
    return harden({ [QCLASS]: 'slot', index: slotIndex });
  }

  function unserializeSlot(data, slots) {
    // console.log(`unserializeSlot ${data} ${slots}`);
    const slotID = slots[Nat(data.index)];
    // todo assert slotID is a non-zero integer
    if (slotID < 0) {
      // this is an import
      if (!slotIDToVal.has(slotID)) {
        // console.log(`assigning new import ${slotID}`);
        // this is a new import
        const val = makePresence(slotID);
        // console.log(` for presence`, val);
        valToSlotID.set(val, slotID);
        slotIDToVal.set(slotID, val);
      }
    }
    // else this is one of our previous exports. In either case we get it
    // from the map
    return slotIDToVal.get(slotID);
  }

  // this handles both exports ("targets" which other vats can call) and
  // imports (presences with which the local vat can do E(p).foo(args))
  function getTarget(facetID) {
    if (!slotIDToVal.has(facetID)) {
      throw Error(`no target for facetID ${facetID}`);
    }
    return slotIDToVal.get(facetID);
  }

  function getImportID(presence) {
    if (presence === undefined) {
      throw Error('getImportID(undefined)');
    }
    // console.log(`getImportID for`, presence);
    if (!valToSlotID.has(presence)) {
      throw Error(`no importID for presence`);
    }
    return valToSlotID.get(presence);
  }

  const m = makeMarshal(serializeSlot, unserializeSlot);

  let send;

  function E(presence) {
    const slotID = getImportID(presence);
    if (slotID === undefined) {
      throw Error(`E() called on non-presence`);
    }
    const handler = {
      get(target, prop) {
        // console.log(`proxy.get(${prop})`);
        if (prop === 'test_getSlotID') {
          return () => slotID;
        }
        if (prop !== `${prop}`) {
          return undefined;
        }
        return (...args) => {
          if (send === undefined) {
            throw Error('E() used outside dispatch()');
          }

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
          // console.log(`send is ${send} ${typeof send}`);
          send(slotID, prop, ser.argsString, ser.slots);

          return doneP;
        };
      },
      has(_target, _prop) {
        return true;
      },
    };
    return harden(new Proxy({}, handler));
  }

  let rootIsRegistered = false;
  function registerRoot(val) {
    // console.log(`[${forVatID}] registerRoot`, val);
    if (rootIsRegistered) {
      throw Error(`[${forVatID}] registerRoot() was already called`);
    }
    valToSlotID.set(val, 0);
    slotIDToVal.set(0, val);
    rootIsRegistered = true;
  }

  function dispatch(syscall, facetid, method, argsbytes, caps) {
    if (!rootIsRegistered) {
      throw Error(`[${forVatID}] registerRoot() wasn't called during setup`);
    }
    const t = getTarget(facetid);
    const args = m.unserialize(argsbytes, caps);
    // eslint-disable-next-line prefer-destructuring
    send = syscall.send;
    // phase1: method must run synchronously
    const result = t[method](...args.args);
    if (args.resolver) {
      // this would cause an infinite loop, so we need sendOnly
      // E(args.resolver).resolve(result);
      const ser = m.serialize(harden({ args: [result] }));
      const resolverSlotID = valToSlotID.get(args.resolver);
      send(resolverSlotID, 'resolve', ser.argsString, ser.slots);
    }
    send = undefined;
  }

  return harden({
    m,
    E,
    registerRoot,
    dispatch,
  });
}
