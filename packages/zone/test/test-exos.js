import { getBaggage, nextLife, test } from './prepare-test-env-ava.js';

import { M } from '@agoric/store';
import { makeDurableZone } from '../durable.js';
import { makeHeapZone } from '../heap.js';
import { makeVirtualZone } from '../virtual.js';

/** @typedef {import('../src/index.js').Zone} Zone */

const greetGuard = M.interface('Greeter', {
  greet: M.call().optional(M.string()).returns(M.string()),
});

const alreadyExceptionSpec = {
  message: /has already been used/,
};

/**
 * @param {import('ava').Assertions} t
 * @param {Zone} rootZone
 */
const testExos = (t, rootZone) => {
  const subZone = rootZone.subZone('sub');
  const greetFacet = {
    greet(greeting = 'Hello') {
      return `${greeting}, ${this.state.nick}`;
    },
  };
  const singly = subZone.exo('a', greetGuard, {
    greet: greetFacet.greet.bind({ state: { nick: 'Singly' } }),
  });
  t.is(singly.greet('Greetings'), 'Greetings, Singly');
  t.is(singly.greet(), 'Hello, Singly');
  t.throws(
    () =>
      subZone.exo('a', greetGuard, {
        greet: greetFacet.greet.bind({ state: { nick: 'Dualie' } }),
      }),
    alreadyExceptionSpec,
  );

  // Check that the backing stores are reserved.
  t.throws(() => subZone.mapStore('a_kindHandle'), alreadyExceptionSpec);
  t.throws(() => subZone.mapStore('a_singleton'), alreadyExceptionSpec);
};

test('heapZone', t => {
  testExos(t, makeHeapZone());
});

test.serial('virtualZone', t => {
  testExos(t, makeVirtualZone());
});

test.failing('durableZone', t => {
  nextLife();
  const baggage1 = getBaggage();
  testExos(t, makeDurableZone(baggage1));

  nextLife();
  const baggage2 = getBaggage();
  testExos(t, makeDurableZone(baggage2));
});
