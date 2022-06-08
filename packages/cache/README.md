# Agoric Cache

This cache mechanism allows a cache client function to synchronize with a cache
backend.  Any passable object can be a cache key or a cache value.

## Demo

```js
import { makeCache, makeStoreCoordinator } from '@agoric/cache';
import { makeScalarBigMapStore } from '@agoric/vat-data';

const store = makeScalarBigMapStore('cache');
const coordinator = makeStoreCoordinator(store);
const cache = makeCache(coordinator);

// Direct value manipulation.
await cache('baz'); // undefined
await cache('baz', 'barbosa'); // 'barbosa'

// Match-and-set.
await cache('baz', 'babaloo', undefined); // 'barbosa'
await cache('baz', 'babaloo', 'barbosa'); // 'babaloo'


// Update the `'foo'` entry, using its old value (initially `undefined`).
await cache('foo'); // `undefined`
const updater = (oldValue = 'bar') => `${oldValue}1`;
await cache('foo', updater); // 'bar1'
await cache('foo', updater); // 'bar11'
await cache('foo'); // 'bar11'

// You can also assert a pattern for the key.  If it doesn't match, then the cache returns a rejection.
await cache('foo', updater, 'nomatch'); // 'bar11'
await cache('foo', updater, 'bar11'); // 'bar111'
await cache('foo', updater, 'bar11'); // 'bar111'
await cache('foo'); // 'bar111'

// Specify a pattern of `undefined` for one-time initialisation.
await cache('frotz', 'default', undefined); // 'default'
await cache('frotz', 'ignored', undefined); // 'ignored'
```

## Cache client

The client-side API is normally exposed as a single function named `cache`.  You
can create a cache client function by running `makeCache(coordinator,
follower)`.  If not specified, the default coordinator is just a local in-memory
map without persistence.

- the ground state for a cache key value is `undefined`.  It is impossible to distinguish a set value of `undefined` from an unset key
- `cache(key): Promise<recentValue>` - get an eventually-consistent value for `key`
- `cache(key, (oldValue) => ERef<newValue>): Promise<newValue>` -  call the
  updater function transactionally with the current value of `key`, and update
  it to `newValue`.  Rerun the updater function with a new value if the
  transaction is stale.
- `cache(key, (oldValue) => ERef<newValue>, guardPattern): Promise<newValue>` -
  same as above, but only update the cache if guardPattern matches the current
  value.  Return the updated value, or the value that matches guardPattern.

## Cache coordinator

The cache coordinator must implement the `Coordinator` interface, which supports
eventual consistency with optimistic updates:

```ts
interface State {
  // State updates must include a generation counter exactly one
  // greater than the current state, or they are not applied.
  generation: bigint,
  // Any acceptable value supported by the cache.
  value: any,
};

// The default state for a key that has not yet been updated.
const GROUND_STATE = { generation: 0n, value: undefined };

interface Coordinator {
  /**
   * Read an eventually-consistent state for the specified key.
   */
  getRecentState: (key: unknown) => Promise<State>,
  /**
   * Attempt to update the key to the new state.  Returns the latest known
   * state after trying to apply the desiredState (may not match).
   */
  tryUpdateState: (key: unknown, desiredState: State, assertedMatch: Matcher) => Promise<State>,
}
```
