import test from 'ava';

import { makeFakeVirtualObjectManager } from '../../tools/fakeVirtualSupport.js';

test('facets', t => {
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
