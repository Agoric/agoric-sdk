// eslint-disable-next-line import/no-extraneous-dependencies
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { makeRegistrar } from '../../src/registrar';

test('Registrar operations', async t => {
  const registrarService = makeRegistrar('testnet');
  const obj1 = {};
  const obj2 = {};
  const id1 = registrarService.register('myname', obj1);
  t.assert(id1.match(/^myname_\d{4,}$/), 'id1 is correct format');
  const id2 = registrarService.register('myname', obj2);
  t.assert(id2.match(/^myname_\d{4,}$/), 'id2 is correct format');
  t.not(id2, id1, 'ids for different objects are different');
  const id1a = registrarService.register('myname', obj1);
  t.assert(id1a.match(/^myname_\d{4,}$/), 'id1a is correct format');
  t.not(id1a, id1, 'ids for same object are different');
  const id1b = registrarService.register('othername', obj1);
  t.assert(id1b.match(/^othername_\d{4,}$/), 'id1b is correct format');
  const ret1 = registrarService.get(id1);
  t.is(ret1, obj1, 'returned obj1 is equal');
  const ret2 = registrarService.get(id2);
  t.is(ret2, obj2, 'returned obj2 is equal');
  const ret1a = registrarService.get(id1a);
  t.is(ret1a, obj1, 'returned obj1a is equal');
  const ret1b = registrarService.get(id1b);
  t.is(ret1b, obj1, 'returned obj1b is equal');

  t.is(registrarService.keys().length, 4, 'number of keys is expected');
});

test('Registrar collisions', async t => {
  const registrarService = makeRegistrar('collide');
  const iterations = 3000;
  const myobj = {};
  let maxlength = Number.NEGATIVE_INFINITY;
  for (let i = 0; i < iterations; i += 1) {
    const id = registrarService.register('a', myobj);
    maxlength = Math.max(maxlength, id.length);
  }
  t.is(maxlength, 7, 'expected maximum key length');

  const keys = registrarService.keys();
  t.is(keys.length, iterations, 'expected number of keys');
  t.is(
    keys.filter(key => registrarService.get(key) !== myobj).length,
    0,
    'expected no deviations',
  );
});
