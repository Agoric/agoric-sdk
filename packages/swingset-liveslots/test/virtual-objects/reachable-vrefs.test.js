// @ts-nocheck
import test from 'ava';

import { Remotable } from '@endo/marshal';
import { initEmpty } from '@agoric/store';

import { makeVatSlot } from '../../src/parseVatSlots.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

test('VOM tracks reachable vrefs', t => {
  const { vom, vrm, cm } = makeFakeVirtualStuff();
  const { defineKind } = vom;
  const { makeScalarBigWeakMapStore } = cm;
  const weakStore = makeScalarBigWeakMapStore('test');

  // empty object, used as weap map store key
  const makeKey = defineKind('key', initEmpty, {});
  const makeHolder = defineKind('holder', held => ({ held }), {
    setHeld: ({ state }, held) => {
      state.held = held;
    },
    getHeld: ({ state }) => state.held,
  });

  let count = 1001;
  function makePresence() {
    // Both Remotable() and the Far() convenience wrapper mark things as
    // pass-by-reference. They are used when creating an (imported) Presence,
    // not just an (exported) "Remotable".
    const pres = Remotable(`Alleged: presence-${count}`, undefined, {});
    const vref = makeVatSlot('object', false, count);
    vom.registerEntry(vref, pres);
    count += 1;
    return [vref, pres];
  }

  const [vref1, obj1] = makePresence();
  const key1 = makeKey();
  t.falsy(vrm.isPresenceReachable(vref1));
  weakStore.init(key1, obj1);
  t.truthy(vrm.isPresenceReachable(vref1));

  const [vref2, obj2] = makePresence();
  const key2 = makeKey();
  weakStore.init(key2, 'not yet');
  t.falsy(vrm.isPresenceReachable(vref2));
  weakStore.set(key2, obj2);
  t.truthy(vrm.isPresenceReachable(vref2));

  // now check that Presences are tracked when in the state of a virtual
  // object
  const [vref3, obj3] = makePresence();
  t.falsy(vrm.isPresenceReachable(vref3));
  // eslint-disable-next-line no-unused-vars
  const holder3 = makeHolder(obj3);
  t.truthy(vrm.isPresenceReachable(vref3));

  const [vref4, obj4] = makePresence();
  const holder4 = makeHolder('not yet');
  t.falsy(vrm.isPresenceReachable(vref4));
  holder4.setHeld(obj4);
  t.truthy(vrm.isPresenceReachable(vref4));
});
