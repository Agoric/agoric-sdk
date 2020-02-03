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

See @agoric/weak-store for the wrapper around JavaScript's WeakMap abstraction.
