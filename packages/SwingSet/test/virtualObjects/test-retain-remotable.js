/* global WeakRef */
import { test } from '../../tools/prepare-test-env-ava.js';

// eslint-disable-next-line import/order
import { Far } from '@endo/marshal';

import engineGC from '../../src/engine-gc.js';
import { makeGcAndFinalize } from '../../src/gc-and-finalize.js';
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

function makeHeld() {
  const held = Far('held');
  const wr = new WeakRef(held);
  const ws = new WeakSet(); // note: real WeakSet, not vref-aware
  ws.add(held);
  function isHeld(obj) {
    return ws.has(obj);
  }
  return { held, wr, isHeld };
}

function prepareEphemeral(vom) {
  const ephemeral = Far('ephemeral');
  vom.registerEntry('o+12345', ephemeral);
  const wr = new WeakRef(ephemeral);
  return { wr };
}

function stashRemotableOne(weakStore, key1) {
  const { held, wr, isHeld } = makeHeld();
  weakStore.init(key1, held);
  return { wr, isHeld };
}

function stashRemotableTwo(weakStore, key1) {
  const { held, wr, isHeld } = makeHeld();
  weakStore.init(key1, 'initial');
  weakStore.set(key1, held);
  return { wr, isHeld };
}

function stashRemotableThree(holderMaker) {
  const { held, wr, isHeld } = makeHeld();
  const holder = holderMaker(held);
  return { wr, isHeld, holder };
}

function stashRemotableFour(holderMaker) {
  const { held, wr, isHeld } = makeHeld();
  const holder = holderMaker('initial');
  holder.setHeld(held);
  return { wr, isHeld, holder };
}

test('remotables retained by virtualized data', async t => {
  const gcAndFinalize = makeGcAndFinalize(engineGC);
  const vomOptions = { cacheSize: 3, weak: true };
  const vom = makeFakeVirtualObjectManager(vomOptions);
  const { makeVirtualScalarWeakMap, makeKind } = vom;
  const weakStore = makeVirtualScalarWeakMap();
  const keyMaker = makeKind(makeKeyInstance);
  const holderMaker = makeKind(makeHolderInstance);

  // create a Remotable and assign it a vref, then drop it, to make sure the
  // fake VOM isn't holding onto a strong reference, which would cause a
  // false positive in the subsequent test
  const stash0 = prepareEphemeral(vom);
  await gcAndFinalize();
  t.falsy(stash0.wr.deref(), `caution: fake VOM didn't release Remotable`);

  // stash a Remotable in the value of a weakStore
  const key1 = keyMaker();
  const stash1 = stashRemotableOne(weakStore, key1);
  await gcAndFinalize();
  // The weakStore virtualizes the values held under keys which are
  // Representatives or Presences, so the value is not holding a strong
  // reference to the Remotable. The VOM is supposed to keep it alive, via
  // reachableRemotables.
  t.truthy(stash1.wr.deref());
  t.truthy(stash1.isHeld(weakStore.get(key1)));

  // do the same, but exercise weakStore.set instead of .init
  const key2 = keyMaker();
  const stash2 = stashRemotableTwo(weakStore, key2);
  await gcAndFinalize();
  t.truthy(stash2.wr.deref());
  t.truthy(stash2.isHeld(weakStore.get(key2)));

  // now stash a Remotable in the state of a virtual object during init()
  const stash3 = stashRemotableThree(holderMaker);
  await gcAndFinalize();
  // Each state property is virtualized upon write (via the generated
  // setters). So again we rely on the VOM to keep the Remotable alive in
  // case someone retreives it again.
  t.truthy(stash3.wr.deref());
  t.truthy(stash3.isHeld(stash3.holder.getHeld()));

  // same, but stash after init()
  const stash4 = stashRemotableFour(holderMaker);
  await gcAndFinalize();
  t.truthy(stash4.wr.deref());
  t.truthy(stash4.isHeld(stash4.holder.getHeld()));
});
