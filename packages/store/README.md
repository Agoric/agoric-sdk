# Store

A wrapper around JavaScript Map. 

Store adds some additional functionality on top of Map.

1. Store distinguishes between initializing (`init`) a (key,
   value) pair and resetting the key to a different value (`set`),
   whereas Map doesn't. This means you can use the Store
   abstraction without having to check whether the key already exists.
   This is because the method that you call (`init` or `set`) marks
   your intention and does it for you.

2. You can use the Store methods in a functional programming
   pattern, which you can't with Map. For instance, you can create
   a new function `const getPurse = Store.get` and you can do
   `myArray.map(Store.get)`. You can't do either of these with
   Map, because the Map methods are not tied to a particular
   Map instance.

See `makeWeakStore` for the wrapper around JavaScript's WeakMap abstraction.

# External Store

An External Store is defined by its maker function, and provides abstractions
that are compatible with large, synchronous secondary storage that can be paged
in and out of local memory.

```js
import { makeExternalStore } from '@agoric/store';

// Here is us defining an instance store for 'hello' objects.
const estore = makeExternalStore((msg = 'Hello') => ({
  hello(nickname) {
    return `${msg}, ${nickname}!`;
  },
}));

const h = estore.makeInstance('Hi');
h.hello('friend') === 'Hi, friend!';
const wm = estore.makeWeakMap('Hello object');
wm.init(h, 'data');
// ... time passes and h is paged out and reloaded.
wm.get(h) === 'data';
wm.set(h, 'new-data');
// ... time passes and h is paged out and reloaded.
map.delete(h);
```

Note that when you import and use the `makeExternalStore` function, the platform
you are running on may rewrite your code to use a more scalable implementation
of that function.  If it is not rewritten, then `makeExternalStore` will use
`makeMemoryExternalStore`, a full-featured, though in-memory-only
implementation.  If you don't desire rewriting, then use
`makeMemoryExternalStore` directly.
