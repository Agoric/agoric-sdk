# TODO REWRITE

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

See `makeScalarWeakMapStore` for the wrapper around JavaScript's WeakMap abstraction.

---

Be aware that both `@agoric/base-zone` and this package `@agoric/store` will move from the agoric-sdk repository to the endo repository and likely renamed `@endo/zone` and `@endo/store`. At that time, we will first deprecate the versions here, then replace them with deprecated stubs that reexport from their new home. We hope to eventually remove even these stubs, depending on the compat cost at that time.
