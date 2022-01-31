import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far, Remotable } from '@endo/marshal';

import { makeVatSlot } from '../../src/parseVatSlots.js';
import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualObjectManager.js';

// empty object, used as makeVirtualScalarWeakMap() key
function makeKeyInstance(_state) {
  return {
    init() {},
    self: Far('key'),
  };
}

function makeHolderInstance(state) {
  return {
    init(held) {
      state.held = held;
    },
    self: Far('holder', {
      setHeld(held) {
        state.held = held;
      },
      getHeld() {
        return state.held;
      },
    }),
  };
}

test('VOM tracks reachable vrefs', async t => {
  const vomOptions = { cacheSize: 3 };
  const vom = makeFakeVirtualObjectManager(vomOptions);
  const { makeVirtualScalarWeakMap, makeKind } = vom;
  const weakStore = makeVirtualScalarWeakMap();
  const keyMaker = makeKind(makeKeyInstance);
  const holderMaker = makeKind(makeHolderInstance);

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
  const key1 = keyMaker();
  t.falsy(vom.isPresenceReachable(vref1));
  weakStore.init(key1, obj1);
  t.truthy(vom.isPresenceReachable(vref1));

  const [vref2, obj2] = makePresence();
  const key2 = keyMaker();
  weakStore.init(key2, 'not yet');
  t.falsy(vom.isPresenceReachable(vref2));
  weakStore.set(key2, obj2);
  t.truthy(vom.isPresenceReachable(vref2));

  // storing Presences as the value for a non-virtual key just holds on to
  // the Presence directly, and does not track the vref

  const [vref3, obj3] = makePresence();
  const key3 = {};
  weakStore.init(key3, obj3);
  weakStore.set(key3, obj3);
  t.falsy(vom.isPresenceReachable(vref3));

  // now check that Presences are tracked when in the state of a virtual
  // object
  const [vref4, obj4] = makePresence();
  t.falsy(vom.isPresenceReachable(vref4));
  // eslint-disable-next-line no-unused-vars
  const holder4 = holderMaker(obj4);
  t.truthy(vom.isPresenceReachable(vref4));

  const [vref5, obj5] = makePresence();
  const holder5 = holderMaker('not yet');
  t.falsy(vom.isPresenceReachable(vref5));
  holder5.setHeld(obj5);
  t.truthy(vom.isPresenceReachable(vref5));
});
