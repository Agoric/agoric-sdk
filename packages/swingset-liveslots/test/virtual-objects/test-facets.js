import test from 'ava';
import '@endo/init/debug.js';

import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualSupport.js';

test('facets', async t => {
  const vom = makeFakeVirtualObjectManager();
  const init = () => ({ value: 0 });
  const behavior = {
    mutable: {
      set: ({ state }, value) => (state.value = value),
      get: ({ state }) => state.value,
      getImmutable: ({ facets }) => facets.immutable,
    },
    immutable: {
      get: ({ state }) => state.value,
    },
  };
  const makeThing = vom.defineKindMulti('thing', init, behavior);
  const thing1 = makeThing();
  thing1.mutable.set(1);
  t.is(thing1.mutable.getImmutable(), thing1.immutable);
});

// issue 7446: non-enumerable properties in the behavior record
// ("hidden facets") yield facet/Representatives with no behavior:
// their __proto__ is Object.prototype, not the special method-bearing
// one from defendPrototype()

test.failing('non-enumerable facet name', async t => {
  const vom = makeFakeVirtualObjectManager();
  const init = () => ({ count: 0 });
  const behavior = {
    incrementer: {
      increment: ({ state }) => (state.count += 1),
    },
  };
  // non-enumerable facet names should be ignored
  Object.defineProperty(behavior, 'resetter', {
    enumerable: false,
    value: {
      reset: ({ state }) => (state.count = 0),
    },
  });
  harden(behavior);
  const makeCounter = vom.defineKindMulti('counter', init, behavior);
  const counter = makeCounter();
  // Reflect.ownKeys yields all properties, including non-enumerable ones
  t.deepEqual(Reflect.ownKeys(counter).sort(), ['incrementer']);

  // console.log(counter.resetter);
  // console.log(Object.getPrototypeOf(counter.resetter));
});
