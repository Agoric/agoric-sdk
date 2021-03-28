// @ts-check
/* eslint-disable no-use-before-define */
import { test } from '@agoric/zoe/tools/prepare-test-env-ava';

import { Far } from '@agoric/marshal';
import { makeStore, makeWeakStore } from '../src/index';
import { isEmptyNonRemotableObject } from '../src/helpers';
import '../src/types';

test('empty object check', t => {
  const f = isEmptyNonRemotableObject;
  t.truthy(f(harden({})));
  t.falsy(f(Far()));
});

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
    message:
      // Should be able to use more informative error once SES double
      // disclosure bug is fixed. See
      // https://github.com/endojs/endo/pull/640
      //
      // /"store1" already registered:/,
      /.* already registered:/,
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
  check(t, 'strong', () => Far('handle', {}));

  // makeWeakStore
  check(t, 'weak', () => Far('handle', {}));
});

test('reject unmarked empty objects', t => {
  // Older client code used harden({}) to create a "handle" that served as an
  // otherwise-empty key for a store/weakstore, but ticket #2018 changes
  // marshal to treat unmarked empty objects as pass-by-copy, so they won't
  // retain identity across messages, breaking old-style handles in
  // surprising ways (key collisions). New client code should use Far()
  // instead, which arrives here as an object with a non-empty
  // getInterfaceOf(). To catch older clients that need to be updated, we
  // reject the use of plain empty objects as keys.

  const k = harden({});
  const s = makeStore('store1');
  t.throws(() => s.init(k, 1), { message: /"store1" bad key:/ });
  t.throws(() => s.has(k), { message: /"store1" bad key:/ });
  t.throws(() => s.get(k), { message: /"store1" bad key:/ });
  t.throws(() => s.set(k, 1), { message: /"store1" bad key:/ });
  t.throws(() => s.delete(k), { message: /"store1" bad key:/ });

  const w = makeWeakStore('store1');
  t.throws(() => w.init(k, 1), { message: /"store1" bad key:/ });
  t.throws(() => w.has(k), { message: /"store1" bad key:/ });
  t.throws(() => w.get(k), { message: /"store1" bad key:/ });
  t.throws(() => w.set(k, 1), { message: /"store1" bad key:/ });
  t.throws(() => w.delete(k), { message: /"store1" bad key:/ });
});
