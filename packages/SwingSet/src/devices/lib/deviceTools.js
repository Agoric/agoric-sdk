import { assert, Fail } from '@endo/errors';
import { makeMarshal } from '@endo/marshal';
import { Far } from '@endo/far';
import { parseVatSlot } from '../../lib/parseVatSlots.js';

// raw devices can use this to build a set of convenience tools for
// serialization/unserialization

export function buildSerializationTools(syscall, deviceName) {
  // TODO: prevent our Presence/DeviceNode objects from being accidentally be
  // marshal-serialized into persistent state

  const presences = new WeakMap();
  const myDeviceNodes = new WeakMap();

  function slotFromPresence(p) {
    return presences.get(p);
  }
  function presenceForSlot(slot) {
    const { type, allocatedByVat } = parseVatSlot(slot);
    assert.equal(type, 'object');
    assert.equal(allocatedByVat, false);
    const p = Far('presence', {
      send(method, args) {
        assert.typeof(method, 'string');
        assert(Array.isArray(args), args);
        // eslint-disable-next-line no-use-before-define
        const capdata = serialize([method, args]);
        syscall.sendOnly(slot, capdata);
      },
    });
    presences.set(p, slot);
    return p;
  }

  function slotFromMyDeviceNode(dn) {
    return myDeviceNodes.get(dn);
  }
  function deviceNodeForSlot(slot) {
    const { type, allocatedByVat } = parseVatSlot(slot);
    assert.equal(type, 'device');
    assert.equal(allocatedByVat, true);
    const dn = Far('device node', {});
    myDeviceNodes.set(dn, slot);
    return dn;
  }

  function convertSlotToVal(slot) {
    const { type, allocatedByVat } = parseVatSlot(slot);
    if (type === 'object') {
      !allocatedByVat || Fail`devices cannot yet allocate objects ${slot}`;
      return presenceForSlot(slot);
    } else if (type === 'device') {
      allocatedByVat ||
        Fail`devices should yet not be given other devices '${slot}'`;
      return deviceNodeForSlot(slot);
    } else if (type === 'promise') {
      throw Fail`devices should not yet be given promises '${slot}'`;
    } else {
      throw Fail`unrecognized slot type '${type}'`;
    }
  }

  function convertValToSlot(val) {
    const objSlot = slotFromPresence(val);
    if (objSlot) {
      return objSlot;
    }
    const devnodeSlot = slotFromMyDeviceNode(val);
    if (devnodeSlot) {
      return devnodeSlot;
    }
    throw Fail`unable to convert value ${val}`;
  }

  const m = makeMarshal(convertValToSlot, convertSlotToVal, {
    marshalName: `device:${deviceName}`,
    serializeBodyFormat: 'smallcaps',
    // TODO Temporary hack.
    // See https://github.com/Agoric/agoric-sdk/issues/2780
    errorIdNum: 60_000,
  });

  // for invoke(), these will unserialize the arguments, and serialize the
  // response (into a vatresult with the 'ok' header)
  const unserialize = capdata => m.unserialize(capdata);
  const serialize = data => m.serialize(harden(data));
  const returnFromInvoke = args => harden(['ok', serialize(args)]);

  const tools = {
    slotFromPresence,
    presenceForSlot,
    slotFromMyDeviceNode,
    deviceNodeForSlot,
    unserialize,
    returnFromInvoke,
  };

  return harden(tools);
}
harden(buildSerializationTools);
