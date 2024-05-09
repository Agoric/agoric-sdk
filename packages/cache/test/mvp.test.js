// Must be first to set up globals
import { test } from '@agoric/zoe/tools/prepare-test-env-ava.js';
import { M } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';

import { makeCache } from '../src/cache.js';
import { makeScalarStoreCoordinator } from '../src/store.js';

// Taken from the README.
test('mvp happy path', async t => {
  const store = makeScalarBigMapStore('cache');
  const coordinator = makeScalarStoreCoordinator(store);
  const cache = makeCache(coordinator);

  // Direct value manipulation.
  t.is(await cache('baz'), undefined);
  t.is(await cache('baz', 'barbosa'), 'barbosa');

  // Match-and-set.
  t.is(await cache('baz', 'babaloo', undefined), 'barbosa');
  t.is(await cache('baz', 'babaloo', 'barbosa'), 'babaloo');

  // One-time initialization.
  t.is(await cache('frotz', 'default'), 'default');
  t.is(await cache('frotz', 'ignored'), 'default');

  // Update function for the `'foo'` entry, using its old value (initially `undefined`).
  t.is(await cache('foo'), undefined);
  const updater = (oldValue = 'bar') => `${oldValue}1`;
  t.is(await cache('foo', updater, M.any()), 'bar1');
  t.is(await cache('foo', updater, M.any()), 'bar11');
  t.is(await cache('foo'), 'bar11');

  // You can also specify a guard pattern for the value to update.  If it
  // doesn't match the latest value, then the cache isn't updated.
  t.is(await cache('foo', updater, 'nomatch'), 'bar11');
  t.is(await cache('foo', updater, 'bar11'), 'bar111');
  t.is(await cache('foo', updater, 'bar11'), 'bar111');
  t.is(await cache('foo'), 'bar111');
});
