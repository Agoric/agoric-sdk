import test from 'ava';

import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualSupport.js';

// Assert that the VOM does not allow confusion between objects and
// their prototypes to allow an attack.

function attack1(mut1, immut2) {
  mut1.set.apply(immut2, [5]);
}

function attack2(mut1, immut2) {
  const mutableProto = Object.getPrototypeOf(mut1);
  Reflect.apply(mutableProto.set, immut2, [6]);
}

test('forbid cross-facet prototype attack', t => {
  const vom = makeFakeVirtualObjectManager();
  const init = () => ({ value: 0 });
  const behavior = {
    mutable: {
      set: ({ state }, value) => (state.value = value),
      get: ({ state }) => state.value,
    },
    immutable: {
      get: ({ state }) => state.value,
    },
  };
  const makeThing = vom.defineKindMulti('thing', init, behavior);
  const thing1 = makeThing();
  thing1.mutable.set(1);
  const thing2 = makeThing();
  thing2.mutable.set(2);

  t.throws(() => attack1(thing1.mutable, thing2.immutable), {
    message:
      '"In \\"set\\" method of (thing mutable)" may only be applied to a valid instance: "[Alleged: thing immutable]"',
  });
  t.throws(() => attack2(thing1.mutable, thing2.immutable), {
    message:
      '"In \\"set\\" method of (thing mutable)" may only be applied to a valid instance: "[Alleged: thing immutable]"',
  });
  t.is(thing1.immutable.get(), 1);
  t.is(thing2.immutable.get(), 2);
});
