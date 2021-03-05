// @ts-check
/* eslint-disable no-use-before-define */
import '@agoric/install-ses';
import test from 'ava';
import { makeStore, makeWeakStore } from '../src/index';
import '../src/types';

function check(t, mode, objMaker) {
  // Check the full API, and make sure object identity isn't a problem by
  // creating two potentially-similar things for use as keys.
  let s;
  if (mode === 'strong') {
    s = makeStore('store1');
  } else if (mode === 'weak') {
    s = makeWeakStore('store1');
  } else {
    throw Error(`unknown mode ${mode}`);
  }
  const k1 = objMaker(1);
  const k2 = objMaker(2);

  function checkEntries(entries) {
    if (mode === 'strong') {
      t.deepEqual(new Set(s.keys()), new Set(entries.map(([k, _v]) => k)));
      t.deepEqual(new Set(s.values()), new Set(entries.map(([_k, v]) => v)));
      t.deepEqual(new Set(s.entries()), new Set(entries));
    }
  }

  checkEntries([]);

  s.init(k1, 'one');
  t.truthy(s.has(k1));
  t.is(s.get(k1), 'one');
  t.falsy(s.has(k2));
  checkEntries([[k1, 'one']]);

  t.throws(() => s.init(k1, 'other'), {
    message: /"store1" already registered:/,
  });
  t.throws(() => s.get(k2), { message: /"store1" not found:/ });
  t.throws(() => s.set(k2, 'other'), { message: /"store1" not found:/ });
  t.throws(() => s.delete(k2), { message: /"store1" not found:/ });

  s.init(k2, 'two');
  t.truthy(s.has(k1));
  t.truthy(s.has(k2));
  t.is(s.get(k1), 'one');
  t.is(s.get(k2), 'two');
  checkEntries([
    [k1, 'one'],
    [k2, 'two'],
  ]);

  s.set(k1, 'oneplus');
  t.truthy(s.has(k1));
  t.truthy(s.has(k2));
  t.is(s.get(k1), 'oneplus');
  t.is(s.get(k2), 'two');
  checkEntries([
    [k1, 'oneplus'],
    [k2, 'two'],
  ]);

  s.delete(k1);
  t.falsy(s.has(k1));
  t.truthy(s.has(k2));
  t.is(s.get(k2), 'two');
  checkEntries([[k2, 'two']]);

  s.delete(k2);
  t.falsy(s.has(k1));
  t.falsy(s.has(k2));
  checkEntries([]);
}

test('store', t => {
  // makeStore
  check(t, 'strong', count => count); // simple numeric keys
  check(t, 'strong', count => `${count}`); // simple strings
  check(t, 'strong', () => harden({}));

  // makeWeakStore
  check(t, 'weak', () => harden({}));
});
