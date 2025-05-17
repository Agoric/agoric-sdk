// @ts-nocheck
import test from 'ava';

import { Far } from '@endo/marshal';
import { initEmpty } from '@agoric/store';

import engineGC from '../engine-gc.js';
import { makeGcAndFinalize, watchCollected } from '../gc-and-finalize.js';
import { makeFakeVirtualStuff } from '../../tools/fakeVirtualSupport.js';

function makeStashKit(name = 'held') {
  const held = Far(name);
  const collected = watchCollected(held);
  const ws = new WeakSet(); // note: real WeakSet, not vref-aware
  ws.add(held);
  function isHeld(obj) {
    return ws.has(obj);
  }
  function isCollected() {
    return collected.result;
  }
  return { held, isCollected, isHeld };
}

function prepareEphemeral(vom) {
  const { held, isCollected } = makeStashKit('ephemeral');
  vom.registerEntry('o+12345', held);
  return { isCollected };
}

function stashRemotableOne(weakStore, key1) {
  const { held, isCollected, isHeld } = makeStashKit();
  weakStore.init(key1, held);
  return { isCollected, isHeld };
}

function stashRemotableTwo(weakStore, key1) {
  const { held, isCollected, isHeld } = makeStashKit();
  weakStore.init(key1, 'initial');
  weakStore.set(key1, held);
  return { isCollected, isHeld };
}

function stashRemotableThree(holderMaker) {
  const { held, isCollected, isHeld } = makeStashKit();
  const holder = holderMaker(held);
  return { isCollected, isHeld, holder };
}

function stashRemotableFour(holderMaker) {
  const { held, isCollected, isHeld } = makeStashKit();
  const holder = holderMaker('initial');
  holder.setHeld(held);
  return { isCollected, isHeld, holder };
}

test('remotables retained by virtualized data', async t => {
  const gcAndFinalize = makeGcAndFinalize(engineGC);
  const vomOptions = { weak: true };
  const { vom, cm } = makeFakeVirtualStuff(vomOptions);
  const { defineKind } = vom;
  const { makeScalarBigWeakMapStore } = cm;
  const weakStore = makeScalarBigWeakMapStore('ws');
  // empty object, used as weak map store key
  const makeKey = defineKind('key', initEmpty, {});
  const makeHolder = defineKind('holder', held => ({ held }), {
    setHeld: ({ state }, held) => {
      state.held = held;
    },
    getHeld: ({ state }) => state.held,
  });

  // create a Remotable and assign it a vref, then drop it, to make sure the
  // fake VOM isn't holding onto a strong reference, which would cause a
  // false positive in the subsequent test
  const stash0 = prepareEphemeral(vom);
  await gcAndFinalize();
  t.true(stash0.isCollected(), `caution: fake VOM didn't release Remotable`);

  // stash a Remotable in the value of a weakStore
  const key1 = makeKey();
  const stash1 = stashRemotableOne(weakStore, key1);
  await gcAndFinalize();
  // The weakStore virtualizes the values held under keys which are
  // Representatives or Presences, so the value is not holding a strong
  // reference to the Remotable. The VOM is supposed to keep it alive, via
  // reachableRemotables.
  t.false(stash1.isCollected());
  t.truthy(stash1.isHeld(weakStore.get(key1)));

  // do the same, but exercise weakStore.set instead of .init
  const key2 = makeKey();
  const stash2 = stashRemotableTwo(weakStore, key2);
  await gcAndFinalize();
  t.false(stash2.isCollected());
  t.truthy(stash2.isHeld(weakStore.get(key2)));

  // now stash a Remotable in the state of a virtual object during init()
  const stash3 = stashRemotableThree(makeHolder);
  await gcAndFinalize();
  // Each state property is virtualized upon write (via the generated
  // setters). So again we rely on the VOM to keep the Remotable alive in
  // case someone retrieves it again.
  t.false(stash3.isCollected());
  t.truthy(stash3.isHeld(stash3.holder.getHeld()));

  // same, but stash after init()
  const stash4 = stashRemotableFour(makeHolder);
  await gcAndFinalize();
  t.false(stash4.isCollected());
  t.truthy(stash4.isHeld(stash4.holder.getHeld()));
});
