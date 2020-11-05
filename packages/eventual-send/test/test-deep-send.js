/** global harden */

import '@agoric/install-ses';
import test from 'ava';
import { assert } from '@agoric/assert';
import { E } from './get-hp';

const { freeze } = Object;

const carol = freeze({
  bar: () => assert.fail('Wut?'),
});

const bob = freeze({
  foo: carolP => E(carolP).bar(),
});

const alice = freeze({
  test: () => E(bob).foo(carol),
});

test('deep-stacks E', t => {
  const q = alice.test();
  return q.catch(reason => {
    t.assert(reason instanceof Error);
    console.log('expected failure', reason);
  });
});
