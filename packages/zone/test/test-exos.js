import { test as rawTest, makeContext } from './prepare-test-env-ava.js';

import { M } from '@agoric/store';
import { makeDurableZone } from '../durable.js';

/** @typedef {import('../src/index.js').Zone} Zone */

/** @type {import('ava').TestFn<ReturnType<makeContext>>} */
const test = rawTest;

test.before(t => {
  t.context = makeContext();
});

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
      subZone.exo('a', greetGuard, { greet: greetFacet.greet.bind('Dualie') }),
    alreadyExceptionSpec,
  );

  // Check that the backing stores are reserved.
  t.throws(() => subZone.mapStore('a_kindHandle'), alreadyExceptionSpec);
  t.throws(() => subZone.mapStore('a_singleton'), alreadyExceptionSpec);
};

test('heapZone', t => {
  const { heapZone } = t.context;
  testExos(t, heapZone);
});

test('virtualZone', t => {
  const { virtualZone } = t.context;
  testExos(t, virtualZone);
});

test('durableZone', t => {
  const { rootBaggage, rootDurableZone } = t.context;
  testExos(t, rootDurableZone);
  const secondDurableZone = makeDurableZone(rootBaggage);
  testExos(t, secondDurableZone);
  const subDurableZone = makeDurableZone(rootBaggage).subZone('sub');
  testExos(t, subDurableZone);
});
