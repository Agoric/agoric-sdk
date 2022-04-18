// @ts-check

import { test } from '@agoric/swingset-vat/tools/prepare-test-env-ava.js';
import { passStyleOf } from '@endo/marshal';

import { I } from '../src/patterns/interface-tools.js';
import { defineHeapKind } from '../src/patterns/defineHeapKind.js';
import { M } from '../src/patterns/patternMatchers.js';

test('how far-able is defineHeapKind', t => {
  const bobIFace = I.interface('bob', {
    foo: I.call(M.number()).returns(M.undefined()),
  });
  const makeBob = defineHeapKind(bobIFace, field => ({ field }), {
    foo: ({ state, self }, carol) => {
      t.is(state.field, 8);
      t.is(typeof self.foo, 'function');
      t.is(self.foo.name, 'foo');
      t.is(self.foo.length, 1);
      t.is(carol, 77);
      state.field += carol;
      t.is(state.field, 85);
    },
  });
  const bob = makeBob(8);
  t.is(passStyleOf(bob), 'remotable');
  bob.foo(77);
  t.throws(() => bob.foo(true), {
    message: /^bob.foo: args: \[0\]: boolean true - Must be a number$/,
  });
});
