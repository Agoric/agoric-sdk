import test from 'ava';

import { setupTestLiveslots } from '../liveslots-helpers.js';
import { buildRootObject, mapRef } from '../gc-helpers.js';

// These tests follow the model described in test-virtualObjectGC.js

// NOTE: these tests must be run serially, since they share a heap and garbage
// collection during one test can interfere with the deterministic behavior of a
// different test.

// prettier-ignore
test.serial('assert known scalarMapStore ID', async t => {
  // The KindID for scalarMapStore is referenced by many of these
  // tests (it is baked into our `mapRef()` function), and it might
  // change if new IDs are allocated before the collection types are
  // registered. Check it explicity here. If this test fails, consider
  // updating `mapRef()` to use the new value.

  const { testHooks } = await setupTestLiveslots(t, buildRootObject, 'bob', { forceGC: true });
  const id = testHooks.obtainStoreKindID('scalarMapStore');
  t.is(id, 2);
  t.is(mapRef('INDEX'), 'o+v2/INDEX');
});
