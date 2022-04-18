/* eslint-disable max-classes-per-file */
// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { passStyleOf } from '@endo/marshal';

import { I, defendClass } from '../src/patterns/interface-tools.js';
import { M } from '../src/patterns/patternMatchers.js';

const UniRawClass = class UniRawClass {
  state;

  self;
};

// const MultiRawClass = class MultiRawClass {
//   state;
//
//   facets;
// };

test('how far-able is defineHeapKind', t => {
  const bobI = I.interface('bobI', {
    foo: I.call(M.number()).returns(M.undefined()),
  });

  const BobRawClass = class Bob extends UniRawClass {
    foo(carol) {
      const { state, self } = this;
      t.is(state.field, 8);
      t.is(typeof self.foo, 'function');
      t.is(self.foo.name, 'foo');
      t.is(self.foo.length, 1);
      t.is(carol, 77);
      state.field += carol;
      t.is(state.field, 85);
    }
  };

  const Bob = defendClass(bobI, field => ({ field }), BobRawClass);
  const bob = Bob(8);
  t.is(passStyleOf(bob), 'remotable');
  bob.foo(77);
  t.throws(() => bob.foo(true), {
    message: /^Bob.foo: args: \[0\]: boolean true - Must be a number$/,
  });
});
