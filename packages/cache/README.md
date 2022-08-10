# Agoric Cache

This cache mechanism allows a cache client function to synchronize with a cache
backend.  Any passable object can be a cache key or a cache value.

## Demo

```js
import { makeCache, makeScalarStoreCoordinator } from '@agoric/cache';
import { M } from '@agoric/store';
import { makeScalarBigMapStore } from '@agoric/vat-data';

const store = makeScalarBigMapStore('cache');
const coordinator = makeScalarStoreCoordinator(store);
const cache = makeCache(coordinator);

// Direct value manipulation.
await cache('baz'); // undefined
await cache('baz', 'barbosa'); // 'barbosa'

// Match-and-set.
await cache('baz', 'babaloo', undefined); // 'barbosa'
await cache('baz', 'babaloo', 'barbosa'); // 'babaloo'

// One-time initialization.
await cache('frotz', 'default'); // 'default'
await cache('frotz', 'ignored'); // 'default'

// Update the `'foo'` entry, using its old value (initially `undefined`).
await cache('foo'); // `undefined`
const updater = (oldValue = 'bar') => `${oldValue}1`;
await cache('foo', updater, M.any()); // 'bar1'
await cache('foo', updater, M.any()); // 'bar11'
await cache('foo'); // 'bar11'

// You can also specify a guard pattern for the value to update.  If it
// doesn't match the latest value, then the cache isn't updated.
await cache('foo', updater, 'nomatch'); // 'bar11'
await cache('foo', updater, 'bar11'); // 'bar111'
await cache('foo', updater, 'bar11'); // 'bar111'
await cache('foo'); // 'bar111'
```

## Cache client

The client-side API is normally exposed as a single function named `cache`.  You
can create a cache client function by running `makeCache(coordinator,
follower)`.  If not specified, the default coordinator is just a local in-memory
map without persistence.

- the ground state for a cache key value is `undefined`.  It is impossible to distinguish a set value of `undefined` from an unset key
- `cache(key, (oldValue) => ERef<newValue>, guardPattern?): Promise<newValue>` -
  transactionally updates the value of `key` from a value matched by `guardPattern`
  to the results of sanitizing the result of calling the updater function with
  that value. Retries all three steps (read current value, attempt match, call updater),
  if the transaction is stale. `guardPattern` defaults to matching only `undefined`.
  Returns the current value after any resulting update.
- `cache(key, passable, guardPattern?): Promise<newValue>` -
  same as above with an updater function that ignores arguments and returns
  `passable` (e.g., `() => passable`).

## Cache coordinator

The cache coordinator must implement the `Coordinator` interface, which supports
eventual consistency with optimistic updates:

```ts
interface Updater {
  /**
   * Calculate the newValue for a given oldValue
   */
  update: (oldValue: Passable) => unknown
}

interface Coordinator {
  /**
   * Read an eventually-consistent value for the specified key.
   */
  getRecentValue: (key: Passable) => Promise<Passable>,
  /**
   * Update a cache value to newValue, but only if guardPattern matches the current value.
   */
  setCacheValue: (key: Passable, newValue: Passable, guardPattern: Pattern) => Promise<Passable>,
  /**
   * Update a cache value via an updater calculation of newValue, but only if guardPattern
   * matches the current value.
   */
  updateCacheValue: (key: Passable, updater: ERef<Updater>, assertedMatch: Matcher) => Promise<Passable>,
}
```
